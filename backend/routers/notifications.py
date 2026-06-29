from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from auth import get_supabase, get_user_id

router = APIRouter()


class AlertSettingsUpdate(BaseModel):
    email_enabled:      Optional[bool] = None
    sms_enabled:        Optional[bool] = None
    push_enabled:       Optional[bool] = None
    sms_number:         Optional[str]  = None
    temp_alerts:        Optional[bool] = None
    checklist_alerts:   Optional[bool] = None
    cert_alerts:        Optional[bool] = None
    inspection_alerts:  Optional[bool] = None
    daily_digest:       Optional[bool] = None
    weekly_report:      Optional[bool] = None
    push_subscription:  Optional[dict] = None


def get_restaurant_id(user_id: str, db) -> str:
    r = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()
    if not r.data:
        raise HTTPException(404, "Restaurant not found")
    return r.data[0]["id"]


@router.get("/")
async def get_notifications(limit: int = 50, unread_only: bool = False, user_id: str = Depends(get_user_id)):
    """Get notifications for this restaurant, newest first."""
    db = get_supabase()
    rid = get_restaurant_id(user_id, db)

    q = db.table("notifications") \
        .select("*") \
        .eq("restaurant_id", rid) \
        .order("created_at", desc=True) \
        .limit(limit)

    if unread_only:
        q = q.is_("read_at", "null")

    result = q.execute()
    return result.data or []


@router.get("/unread-count")
async def get_unread_count(user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = get_restaurant_id(user_id, db)
    result = db.table("notifications") \
        .select("id", count="exact") \
        .eq("restaurant_id", rid) \
        .is_("read_at", "null") \
        .execute()
    return {"count": result.count or 0}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: str, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = get_restaurant_id(user_id, db)
    from datetime import datetime, timezone
    db.table("notifications") \
        .update({"read_at": datetime.now(timezone.utc).isoformat()}) \
        .eq("id", notification_id) \
        .eq("restaurant_id", rid) \
        .execute()
    return {"success": True}


@router.post("/read-all")
async def mark_all_read(user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = get_restaurant_id(user_id, db)
    from datetime import datetime, timezone
    db.table("notifications") \
        .update({"read_at": datetime.now(timezone.utc).isoformat()}) \
        .eq("restaurant_id", rid) \
        .is_("read_at", "null") \
        .execute()
    return {"success": True}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = get_restaurant_id(user_id, db)
    db.table("notifications").delete().eq("id", notification_id).eq("restaurant_id", rid).execute()
    return {"success": True}


# ── Alert Settings ──────────────────────────────────────────

@router.get("/settings")
async def get_alert_settings(user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = get_restaurant_id(user_id, db)
    result = db.table("alert_settings").select("*").eq("restaurant_id", rid).limit(1).execute()
    if result.data:
        return result.data[0]
    # Return defaults if not yet created
    return {
        "email_enabled": True, "sms_enabled": False, "push_enabled": False,
        "temp_alerts": True, "checklist_alerts": True, "cert_alerts": True,
        "inspection_alerts": True, "daily_digest": True, "weekly_report": True,
    }


@router.put("/settings")
async def update_alert_settings(data: AlertSettingsUpdate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = get_restaurant_id(user_id, db)
    update_data = {k: v for k, v in data.dict().items() if v is not None}

    existing = db.table("alert_settings").select("id").eq("restaurant_id", rid).limit(1).execute()
    if existing.data:
        result = db.table("alert_settings").update(update_data).eq("restaurant_id", rid).execute()
    else:
        result = db.table("alert_settings").insert({"restaurant_id": rid, **update_data}).execute()

    return result.data[0] if result.data else {}
