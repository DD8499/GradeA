from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from auth import get_supabase, get_user_id
from services.gemini_service import generate_violation_report

router = APIRouter()


@router.get("/report")
async def get_latest_report(user_id: str = Depends(get_user_id)):
    """Get the most recently generated AI violation risk report."""
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant_id = restaurant.data[0]["id"]

    result = db.table("violation_reports") \
        .select("*") \
        .eq("restaurant_id", restaurant_id) \
        .order("generated_at", desc=True) \
        .limit(1) \
        .execute()

    return result.data[0] if result.data else None


@router.post("/generate")
async def generate_report(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_user_id),
):
    """Trigger AI generation of a new violation risk report."""
    db = get_supabase()
    restaurant = db.table("restaurants") \
        .select("id,name,cuisine_type,borough,seating_capacity,equipment,last_grade") \
        .eq("owner_id", user_id) \
        .limit(1) \
        .execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found. Complete onboarding first.")

    r = restaurant.data[0]

    # Generate report via Gemini
    try:
        risks = await generate_violation_report(
            cuisine_type=r.get("cuisine_type", "american"),
            borough=r.get("borough", "Manhattan"),
            seating_capacity=r.get("seating_capacity", 0),
            equipment=r.get("equipment", []),
            last_grade=r.get("last_grade", "A"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI report generation failed: {str(e)}")

    # Save to database
    result = db.table("violation_reports").insert({
        "restaurant_id": r["id"],
        "risks": risks,
        "cuisine_type": r.get("cuisine_type"),
        "borough": r.get("borough"),
    }).execute()

    return result.data[0] if result.data else {"risks": risks}


@router.get("/history")
async def get_report_history(user_id: str = Depends(get_user_id)):
    """Get all generated reports for this restaurant."""
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant_id = restaurant.data[0]["id"]

    result = db.table("violation_reports") \
        .select("id,generated_at,cuisine_type,borough") \
        .eq("restaurant_id", restaurant_id) \
        .order("generated_at", desc=True) \
        .limit(10) \
        .execute()

    return result.data or []
