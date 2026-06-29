from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from auth import get_supabase, get_user_id
import secrets

router = APIRouter()


class RestaurantCreate(BaseModel):
    name: str
    address: Optional[str] = None
    borough: Optional[str] = None
    cuisine_type: str = "american"
    seating_capacity: int = 0
    staff_count: int = 0
    equipment: List[str] = []
    camis_id: Optional[str] = None
    last_grade: Optional[str] = None
    last_inspection_date: Optional[str] = None


class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    borough: Optional[str] = None
    cuisine_type: Optional[str] = None
    seating_capacity: Optional[int] = None
    staff_count: Optional[int] = None
    equipment: Optional[List[str]] = None
    camis_id: Optional[str] = None
    last_grade: Optional[str] = None
    last_inspection_date: Optional[str] = None


@router.get("/me")
async def get_my_restaurant(user_id: str = Depends(get_user_id)):
    """Get the authenticated owner's restaurant profile."""
    db = get_supabase()
    result = db.table("restaurants").select("*").eq("owner_id", user_id).limit(1).execute()

    if not result.data:
        return None

    restaurant = result.data[0]

    # Calculate days until next inspection estimate
    if restaurant.get("last_inspection_date"):
        from datetime import date, timedelta
        last_date = date.fromisoformat(restaurant["last_inspection_date"])
        grade = restaurant.get("last_grade", "A")

        # NYC DOH re-inspection windows:
        # A grade: re-inspect in 11-13 months
        # B/C grade: re-inspect within 1 month
        if grade == "A":
            next_est = last_date + timedelta(days=365)
        elif grade in ["B", "C"]:
            next_est = last_date + timedelta(days=30)
        else:
            next_est = last_date + timedelta(days=180)

        today = date.today()
        days_until = (next_est - today).days
        restaurant["days_until_inspection"] = days_until
        restaurant["next_inspection_est"] = next_est.isoformat()

    return restaurant


@router.post("/")
async def create_restaurant(data: RestaurantCreate, user_id: str = Depends(get_user_id)):
    """Create a restaurant profile for the authenticated owner."""
    db = get_supabase()

    # Check if owner already has a restaurant
    existing = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Restaurant already exists for this owner")

    staff_token = secrets.token_hex(16)

    result = db.table("restaurants").insert({
        "owner_id": user_id,
        "name": data.name,
        "address": data.address,
        "borough": data.borough,
        "cuisine_type": data.cuisine_type,
        "seating_capacity": data.seating_capacity,
        "staff_count": data.staff_count,
        "equipment": data.equipment,
        "camis_id": data.camis_id,
        "last_grade": data.last_grade,
        "last_inspection_date": data.last_inspection_date,
        "staff_token": staff_token,
        "plan": "trial",
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create restaurant")

    return result.data[0]


@router.put("/me")
async def update_restaurant(data: RestaurantUpdate, user_id: str = Depends(get_user_id)):
    """Update the authenticated owner's restaurant profile."""
    db = get_supabase()

    # Get restaurant ID first
    existing = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant_id = existing.data[0]["id"]
    update_data = {k: v for k, v in data.dict().items() if v is not None}

    result = db.table("restaurants").update(update_data).eq("id", restaurant_id).execute()
    return result.data[0] if result.data else {}


@router.get("/staff-link")
async def get_staff_link(user_id: str = Depends(get_user_id)):
    """Get the unique staff checklist link for this restaurant."""
    db = get_supabase()
    result = db.table("restaurants").select("staff_token,name").eq("owner_id", user_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    token = result.data[0]["staff_token"]
    return {
        "token": token,
        "url": f"/staff/{token}",
        "restaurant_name": result.data[0]["name"]
    }


@router.post("/regenerate-token")
async def regenerate_staff_token(user_id: str = Depends(get_user_id)):
    """Regenerate the staff access token (invalidates old link)."""
    db = get_supabase()
    new_token = secrets.token_hex(16)
    result = db.table("restaurants").update({"staff_token": new_token}).eq("owner_id", user_id).execute()
    return {"token": new_token}
