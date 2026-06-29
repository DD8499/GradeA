from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import date, datetime
from auth import get_supabase, get_user_id
from data.violations_db import get_checklist, CATEGORIES

router = APIRouter()


class ChecklistSubmission(BaseModel):
    submitted_by: str = "Owner"
    checklist_data: Dict[str, Any]  # { "04A": { "status": "pass"|"fail"|"na", "note": "", "photo_url": "" } }


class StaffSubmission(BaseModel):
    submitted_by: str = "Staff"
    checklist_data: Dict[str, Any]


def calculate_score(checklist_data: dict, total_items: int) -> dict:
    """Calculate readiness score from submitted checklist data."""
    passed = 0
    failed = 0
    na_count = 0
    open_issues = []

    for code, item in checklist_data.items():
        status = item.get("status", "na")
        if status == "pass":
            passed += 1
        elif status == "fail":
            failed += 1
            open_issues.append(code)
        else:
            na_count += 1

    answered = passed + failed
    score = int((passed / answered * 100)) if answered > 0 else 0

    return {
        "score": score,
        "items_total": total_items,
        "items_passed": passed,
        "items_failed": failed,
        "open_issues": open_issues,
    }


@router.get("/items")
async def get_checklist_items(user_id: str = Depends(get_user_id)):
    """Return checklist items for the owner's restaurant, grouped by category."""
    db = get_supabase()
    restaurant = db.table("restaurants").select("cuisine_type,id").eq("owner_id", user_id).limit(1).execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found. Complete onboarding first.")

    cuisine = restaurant.data[0]["cuisine_type"]
    items = get_checklist(cuisine)

    # Group by category
    grouped = {}
    for item in items:
        cat = item["category"]
        if cat not in grouped:
            grouped[cat] = {
                "category": cat,
                "label": CATEGORIES.get(cat, {}).get("label", cat),
                "color": CATEGORIES.get(cat, {}).get("color", "#6B7280"),
                "items": []
            }
        grouped[cat]["items"].append(item)

    return {
        "cuisine_type": cuisine,
        "categories": list(grouped.values()),
        "total_items": len(items),
    }


@router.get("/today")
async def get_today_submission(user_id: str = Depends(get_user_id)):
    """Get today's checklist submission status for the owner's restaurant."""
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant_id = restaurant.data[0]["id"]
    today = date.today().isoformat()

    result = db.table("checklist_submissions") \
        .select("*") \
        .eq("restaurant_id", restaurant_id) \
        .eq("date", today) \
        .order("submitted_at", desc=True) \
        .limit(1) \
        .execute()

    return result.data[0] if result.data else None


@router.post("/submit")
async def submit_checklist(data: ChecklistSubmission, user_id: str = Depends(get_user_id)):
    """Submit the daily checklist (owner flow)."""
    db = get_supabase()
    restaurant = db.table("restaurants").select("id,cuisine_type").eq("owner_id", user_id).limit(1).execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant_id = restaurant.data[0]["id"]
    all_items = get_checklist(restaurant.data[0]["cuisine_type"])
    stats = calculate_score(data.checklist_data, len(all_items))

    result = db.table("checklist_submissions").insert({
        "restaurant_id": restaurant_id,
        "submitted_by": data.submitted_by,
        "date": date.today().isoformat(),
        "checklist_data": data.checklist_data,
        **stats,
    }).execute()

    return result.data[0] if result.data else {}


@router.get("/history")
async def get_submission_history(days: int = 7, user_id: str = Depends(get_user_id)):
    """Get submission history for the past N days."""
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant_id = restaurant.data[0]["id"]

    from datetime import timedelta
    since = (date.today() - timedelta(days=days)).isoformat()

    result = db.table("checklist_submissions") \
        .select("date,score,items_passed,items_failed,submitted_by,submitted_at") \
        .eq("restaurant_id", restaurant_id) \
        .gte("date", since) \
        .order("date", desc=True) \
        .execute()

    return result.data or []


# ── STAFF (no auth, token-based) ────────────────────────────

@router.get("/staff/{token}")
async def get_staff_checklist(token: str):
    """Get checklist items for staff (no authentication required)."""
    db = get_supabase()

    # Lookup restaurant by token
    restaurant = db.table("restaurants") \
        .select("id,name,cuisine_type") \
        .eq("staff_token", token) \
        .limit(1) \
        .execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Invalid or expired staff link")

    r = restaurant.data[0]
    items = get_checklist(r["cuisine_type"])

    grouped = {}
    for item in items:
        cat = item["category"]
        if cat not in grouped:
            grouped[cat] = {
                "category": cat,
                "label": CATEGORIES.get(cat, {}).get("label", cat),
                "color": CATEGORIES.get(cat, {}).get("color", "#6B7280"),
                "items": []
            }
        grouped[cat]["items"].append({
            "code": item["code"],
            "title": item["title"],
            "daily_checks": item["daily_checks"],
            "severity": item["severity"],
        })

    return {
        "restaurant_name": r["name"],
        "restaurant_id": r["id"],
        "categories": list(grouped.values()),
        "total_items": len(items),
        "today": date.today().isoformat(),
    }


@router.post("/staff/{token}/submit")
async def submit_staff_checklist(token: str, data: StaffSubmission):
    """Submit staff checklist (no authentication required)."""
    db = get_supabase()

    restaurant = db.table("restaurants") \
        .select("id,cuisine_type") \
        .eq("staff_token", token) \
        .limit(1) \
        .execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Invalid or expired staff link")

    restaurant_id = restaurant.data[0]["id"]
    all_items = get_checklist(restaurant.data[0]["cuisine_type"])
    stats = calculate_score(data.checklist_data, len(all_items))

    result = db.table("checklist_submissions").insert({
        "restaurant_id": restaurant_id,
        "submitted_by": data.submitted_by,
        "date": date.today().isoformat(),
        "checklist_data": data.checklist_data,
        **stats,
    }).execute()

    # Send alert to owner if there are failures
    if stats["items_failed"] > 0:
        from services.email_service import send_checklist_alert
        owner = db.table("restaurants").select("owner_id").eq("id", restaurant_id).limit(1).execute()
        # Fire and forget – non-blocking
        try:
            await send_checklist_alert(restaurant_id, stats["open_issues"], data.submitted_by)
        except Exception:
            pass  # Don't fail submission if email fails

    return {
        "success": True,
        "score": stats["score"],
        "items_passed": stats["items_passed"],
        "items_failed": stats["items_failed"],
        "open_issues": stats["open_issues"],
    }
