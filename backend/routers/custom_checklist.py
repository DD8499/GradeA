"""
Custom Checklist Router — owner creates their own checklist items
Photo Upload Router — handles photo capture, validation, and storage
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from auth import get_supabase, get_user_id
from services.photo_validator import validate_photo, compute_phash
import secrets, os, base64
from datetime import datetime, timezone, timedelta

# ════════════════════════════════════════════════
# CUSTOM CHECKLIST ROUTER
# ════════════════════════════════════════════════
custom_router = APIRouter()

CATEGORIES = ["food_temperature","personal_hygiene","food_handling","facility","pest_control","plumbing","chemicals","administrative","custom"]

class CustomItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    daily_checks: List[str] = []
    category: str = "custom"
    severity: str = "general"
    photo_required: bool = False
    photo_validation: str = "none"
    ai_prompt_hint: Optional[str] = None
    sort_order: int = 0

class CustomItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    daily_checks: Optional[List[str]] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    photo_required: Optional[bool] = None
    photo_validation: Optional[str] = None
    ai_prompt_hint: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


def _get_rid(user_id: str, db) -> str:
    r = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()
    if not r.data:
        raise HTTPException(404, "Restaurant not found")
    return r.data[0]["id"]


@custom_router.get("/")
async def get_custom_items(include_inactive: bool = False, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = _get_rid(user_id, db)
    q = db.table("custom_checklist_items").select("*").eq("restaurant_id", rid)
    if not include_inactive:
        q = q.eq("is_active", True)
    result = q.order("sort_order").order("created_at").execute()
    return result.data or []


@custom_router.post("/")
async def create_custom_item(data: CustomItemCreate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = _get_rid(user_id, db)
    result = db.table("custom_checklist_items").insert({
        "restaurant_id": rid, **data.dict()
    }).execute()
    return result.data[0] if result.data else {}


@custom_router.put("/{item_id}")
async def update_custom_item(item_id: str, data: CustomItemUpdate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = _get_rid(user_id, db)
    update = {k: v for k, v in data.dict().items() if v is not None}
    result = db.table("custom_checklist_items").update(update).eq("id", item_id).eq("restaurant_id", rid).execute()
    return result.data[0] if result.data else {}


@custom_router.put("/{item_id}/toggle")
async def toggle_item(item_id: str, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = _get_rid(user_id, db)
    item = db.table("custom_checklist_items").select("is_active").eq("id", item_id).eq("restaurant_id", rid).limit(1).execute()
    if not item.data:
        raise HTTPException(404, "Item not found")
    current = item.data[0]["is_active"]
    result = db.table("custom_checklist_items").update({"is_active": not current}).eq("id", item_id).execute()
    return result.data[0] if result.data else {}


@custom_router.delete("/{item_id}")
async def delete_custom_item(item_id: str, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = _get_rid(user_id, db)
    db.table("custom_checklist_items").delete().eq("id", item_id).eq("restaurant_id", rid).execute()
    return {"success": True}


@custom_router.post("/reorder")
async def reorder_items(order: List[str], user_id: str = Depends(get_user_id)):
    """Update sort_order for multiple items. order = list of item UUIDs in desired order."""
    db = get_supabase()
    rid = _get_rid(user_id, db)
    for idx, item_id in enumerate(order):
        db.table("custom_checklist_items").update({"sort_order": idx}).eq("id", item_id).eq("restaurant_id", rid).execute()
    return {"success": True}


# ── Combined checklist (NYC DOH + custom) ────────────────────
@custom_router.get("/combined")
async def get_combined_checklist(user_id: str = Depends(get_user_id)):
    """Return NYC DOH violations + custom items, grouped by category."""
    from data.violations_db import get_checklist, CATEGORIES as DOH_CATS
    db = get_supabase()
    restaurant = db.table("restaurants").select("id,cuisine_type").eq("owner_id", user_id).limit(1).execute()
    if not restaurant.data:
        raise HTTPException(404, "Restaurant not found")

    r = restaurant.data[0]
    rid = r["id"]

    # NYC DOH items
    doh_items = get_checklist(r["cuisine_type"])
    for item in doh_items:
        item["item_type"] = "doh"
        item["photo_required"] = False
        item["photo_validation"] = "none"

    # Custom items
    custom_result = db.table("custom_checklist_items").select("*").eq("restaurant_id", rid).eq("is_active", True).order("sort_order").execute()
    custom_items = custom_result.data or []
    for item in custom_items:
        item["item_type"] = "custom"
        item["code"] = str(item["id"])[:8].upper()  # short display code
        item["severity"] = item.get("severity", "general")

    # Group by category
    all_items = doh_items + custom_items
    grouped = {}

    for item in all_items:
        cat = item.get("category", "custom")
        if cat not in grouped:
            cat_label = DOH_CATS.get(cat, {}).get("label", f"📌 {cat.title()}")
            grouped[cat] = {"category": cat, "label": cat_label, "items": []}
        grouped[cat]["items"].append(item)

    return {
        "categories": list(grouped.values()),
        "total_doh": len(doh_items),
        "total_custom": len(custom_items),
        "total": len(all_items),
    }


# ════════════════════════════════════════════════
# PHOTO UPLOAD ROUTER
# ════════════════════════════════════════════════
photo_router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


async def upload_to_supabase_storage(photo_bytes: bytes, restaurant_id: str, item_id: str, filename: str) -> str:
    """Upload photo to Supabase Storage and return public URL."""
    from supabase import create_client
    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    path = f"{restaurant_id}/{item_id}/{filename}"
    try:
        db.storage.from_("checklist-photos").upload(
            path=path,
            file=photo_bytes,
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )
        url = db.storage.from_("checklist-photos").get_public_url(path)
        return url
    except Exception as e:
        raise HTTPException(500, f"Photo storage failed: {str(e)}")


@photo_router.post("/upload")
async def upload_checklist_photo(
    file: UploadFile = File(...),
    item_id: str = Form(...),
    item_title: str = Form(""),
    restaurant_id: str = Form(...),
    submitted_by: str = Form("Staff"),
    validation_type: str = Form("none"),
    ai_hint: str = Form(""),
):
    """
    Upload and validate a checklist photo.
    This endpoint is called WITHOUT JWT auth (staff use it via token link).
    Restaurant identity is verified by restaurant_id matching the item.
    """
    db = get_supabase()

    # Verify restaurant exists
    rest = db.table("restaurants").select("id").eq("id", restaurant_id).limit(1).execute()
    if not rest.data:
        raise HTTPException(404, "Restaurant not found")

    photo_bytes = await file.read()

    if len(photo_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "Photo too large. Maximum size is 10MB.")

    # Get recent hashes for duplicate detection
    existing_hashes = []
    if validation_type in ("hash", "strict"):
        since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        recent = db.table("checklist_photo_submissions") \
            .select("photo_hash") \
            .eq("restaurant_id", restaurant_id) \
            .eq("item_id", item_id) \
            .gte("submitted_at", since) \
            .execute()
        existing_hashes = [r["photo_hash"] for r in (recent.data or []) if r.get("photo_hash")]

    # Run validation
    validation = await validate_photo(
        photo_bytes=photo_bytes,
        item_id=item_id,
        item_title=item_title,
        validation_type=validation_type,
        ai_hint=ai_hint,
        existing_hashes=existing_hashes,
        max_age_minutes=90,
    )

    if not validation["passed"]:
        return {
            "success": False,
            "validation_passed": False,
            "message": validation["message"],
            "photo_url": None,
        }

    # Upload to storage
    filename = f"{secrets.token_hex(8)}_{int(datetime.now().timestamp())}.jpg"
    photo_url = await upload_to_supabase_storage(photo_bytes, restaurant_id, item_id, filename)

    # Save submission record
    db.table("checklist_photo_submissions").insert({
        "restaurant_id": restaurant_id,
        "item_id": item_id,
        "item_title": item_title,
        "photo_url": photo_url,
        "photo_storage_path": f"{restaurant_id}/{item_id}/{filename}",
        "photo_hash": validation["photo_hash"],
        "photo_size_bytes": len(photo_bytes),
        "exif_taken_at": validation.get("exif_taken_at"),
        "validation_passed": True,
        "validation_type": validation_type,
        "ai_validation_result": validation.get("ai_result"),
        "submitted_by": submitted_by,
    }).execute()

    return {
        "success": True,
        "validation_passed": True,
        "message": "Photo validated and saved.",
        "photo_url": photo_url,
        "warnings": validation.get("warnings", []),
        "layers_run": validation.get("layers_run", []),
    }


@photo_router.get("/item/{item_id}")
async def get_photos_for_item(item_id: str, days: int = 7, user_id: str = Depends(get_user_id)):
    """Get recent photos for a specific checklist item (owner view)."""
    db = get_supabase()
    rid = _get_rid(user_id, db)
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    result = db.table("checklist_photo_submissions") \
        .select("*") \
        .eq("restaurant_id", rid) \
        .eq("item_id", item_id) \
        .gte("submitted_at", since) \
        .order("submitted_at", desc=True) \
        .limit(50) \
        .execute()
    return result.data or []


@photo_router.get("/recent")
async def get_recent_photos(limit: int = 20, user_id: str = Depends(get_user_id)):
    """Get all recent photos (owner photo gallery view)."""
    db = get_supabase()
    rid = _get_rid(user_id, db)
    result = db.table("checklist_photo_submissions") \
        .select("*") \
        .eq("restaurant_id", rid) \
        .order("submitted_at", desc=True) \
        .limit(limit) \
        .execute()
    return result.data or []
