from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from auth import get_supabase, get_user_id
from data.violations_db import TEMP_SAFETY

router = APIRouter()

# Safe temperature ranges (Fahrenheit)
TEMP_RANGES = {
    "Walk-in Refrigerator":    {"max": 41.0,  "min": None,  "type": "cold"},
    "Reach-in Refrigerator":   {"max": 41.0,  "min": None,  "type": "cold"},
    "Freezer":                 {"max": 0.0,   "min": None,  "type": "cold"},
    "Hot Holding":             {"max": None,  "min": 140.0, "type": "hot"},
    "Raw Poultry":             {"max": 41.0,  "min": None,  "type": "cold"},
    "Raw Beef/Pork":           {"max": 41.0,  "min": None,  "type": "cold"},
    "Fish Storage":            {"max": 41.0,  "min": None,  "type": "cold"},
    "Cooked Chicken (cook)":   {"max": None,  "min": 165.0, "type": "cook"},
    "Ground Beef (cook)":      {"max": None,  "min": 155.0, "type": "cook"},
    "Fish/Pork (cook)":        {"max": None,  "min": 145.0, "type": "cook"},
}


class TempLogCreate(BaseModel):
    item_name: str
    location: str = "Kitchen"
    temp_value: float
    unit: str = "F"
    logged_by: str = "Staff"
    notes: Optional[str] = None


def check_violation(item_name: str, temp: float) -> tuple[bool, Optional[float], Optional[float]]:
    """Check if a temperature is out of safe range."""
    for name, ranges in TEMP_RANGES.items():
        if name.lower() in item_name.lower() or item_name.lower() in name.lower():
            min_safe = ranges.get("min")
            max_safe = ranges.get("max")
            is_violation = False
            if min_safe is not None and temp < min_safe:
                is_violation = True
            if max_safe is not None and temp > max_safe:
                is_violation = True
            return is_violation, min_safe, max_safe
    return False, None, None


@router.get("/")
async def get_temperature_logs(limit: int = 50, user_id: str = Depends(get_user_id)):
    """Get recent temperature logs for the owner's restaurant."""
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant_id = restaurant.data[0]["id"]

    result = db.table("temperature_logs") \
        .select("*") \
        .eq("restaurant_id", restaurant_id) \
        .order("logged_at", desc=True) \
        .limit(limit) \
        .execute()

    return result.data or []


@router.get("/latest")
async def get_latest_temps(user_id: str = Depends(get_user_id)):
    """Get the latest temp reading for each item (for dashboard)."""
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant_id = restaurant.data[0]["id"]

    # Get last 20 and deduplicate by item_name (most recent per item)
    result = db.table("temperature_logs") \
        .select("*") \
        .eq("restaurant_id", restaurant_id) \
        .order("logged_at", desc=True) \
        .limit(50) \
        .execute()

    seen = set()
    latest = []
    for log in (result.data or []):
        if log["item_name"] not in seen:
            seen.add(log["item_name"])
            latest.append(log)

    return latest


@router.post("/")
async def log_temperature(data: TempLogCreate, user_id: str = Depends(get_user_id)):
    """Log a new temperature reading."""
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant_id = restaurant.data[0]["id"]
    is_violation, min_safe, max_safe = check_violation(data.item_name, data.temp_value)

    result = db.table("temperature_logs").insert({
        "restaurant_id": restaurant_id,
        "item_name": data.item_name,
        "location": data.location,
        "temp_value": data.temp_value,
        "unit": data.unit,
        "min_safe": min_safe,
        "max_safe": max_safe,
        "is_violation": is_violation,
        "logged_by": data.logged_by,
        "notes": data.notes,
    }).execute()

    log = result.data[0] if result.data else {}

    if is_violation:
        try:
            from services.email_service import send_temp_alert
            await send_temp_alert(restaurant_id, data.item_name, data.temp_value, min_safe, max_safe)
        except Exception:
            pass  # Don't fail log if email fails

    return {**log, "is_violation": is_violation}


@router.delete("/{log_id}")
async def delete_temp_log(log_id: str, user_id: str = Depends(get_user_id)):
    """Delete a temperature log entry."""
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant_id = restaurant.data[0]["id"]

    db.table("temperature_logs") \
        .delete() \
        .eq("id", log_id) \
        .eq("restaurant_id", restaurant_id) \
        .execute()

    return {"success": True}


@router.get("/ranges")
async def get_safe_ranges():
    """Return safe temperature ranges for all common items."""
    return TEMP_RANGES
