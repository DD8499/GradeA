from fastapi import APIRouter, Depends, HTTPException
from auth import get_supabase, get_user_id
from datetime import date, timedelta
from collections import defaultdict

router = APIRouter()


def get_restaurant_id(user_id: str, db) -> str:
    r = db.table("restaurants").select("id,cuisine_type,last_grade").eq("owner_id", user_id).limit(1).execute()
    if not r.data:
        raise HTTPException(404, "Restaurant not found")
    return r.data[0]


@router.get("/overview")
async def get_overview(user_id: str = Depends(get_user_id)):
    """High-level analytics: avg score, streak, total submissions, violations."""
    db = get_supabase()
    restaurant = get_restaurant_id(user_id, db)
    rid = restaurant["id"]

    # Last 30 days submissions
    since = (date.today() - timedelta(days=30)).isoformat()
    subs = db.table("checklist_submissions") \
        .select("score,items_passed,items_failed,date,submitted_by") \
        .eq("restaurant_id", rid) \
        .gte("date", since) \
        .order("date", desc=False) \
        .execute()

    submissions = subs.data or []
    scores = [s["score"] for s in submissions]
    avg_score = round(sum(scores) / len(scores)) if scores else 0

    # Streak (consecutive days with submission)
    streak = 0
    check_day = date.today()
    dates_set = {s["date"] for s in submissions}
    while check_day.isoformat() in dates_set:
        streak += 1
        check_day -= timedelta(days=1)

    # Most failed items across all submissions
    fail_counts = defaultdict(int)
    for s in submissions:
        for code in (s.get("open_issues") or []):
            fail_counts[code] += 1
    top_failures = sorted(fail_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    # Temperature violations (last 30 days)
    temp_violations = db.table("temperature_logs") \
        .select("id", count="exact") \
        .eq("restaurant_id", rid) \
        .eq("is_violation", True) \
        .gte("logged_at", since + "T00:00:00") \
        .execute()

    # Open corrective actions
    open_actions = db.table("corrective_actions") \
        .select("id", count="exact") \
        .eq("restaurant_id", rid) \
        .eq("status", "open") \
        .execute()

    # Predicted grade based on avg score
    if avg_score >= 87:
        predicted_grade = "A"
    elif avg_score >= 70:
        predicted_grade = "B"
    else:
        predicted_grade = "C"

    return {
        "avg_score_30d": avg_score,
        "total_submissions_30d": len(submissions),
        "current_streak": streak,
        "top_failures": [{"code": c, "count": n} for c, n in top_failures],
        "temp_violations_30d": temp_violations.count or 0,
        "open_corrective_actions": open_actions.count or 0,
        "predicted_grade": predicted_grade,
        "last_actual_grade": restaurant.get("last_grade", "Unknown"),
    }


@router.get("/score-trend")
async def get_score_trend(days: int = 30, user_id: str = Depends(get_user_id)):
    """Daily readiness score trend for chart."""
    db = get_supabase()
    restaurant = get_restaurant_id(user_id, db)
    since = (date.today() - timedelta(days=days)).isoformat()

    result = db.table("checklist_submissions") \
        .select("date,score,items_passed,items_failed") \
        .eq("restaurant_id", restaurant["id"]) \
        .gte("date", since) \
        .order("date") \
        .execute()

    # Group by date (take highest score per day)
    by_date = {}
    for r in (result.data or []):
        d = r["date"]
        if d not in by_date or r["score"] > by_date[d]["score"]:
            by_date[d] = r

    return [{"date": d, **v} for d, v in sorted(by_date.items())]


@router.get("/temperature-trend")
async def get_temp_trend(days: int = 7, item_name: str = None, user_id: str = Depends(get_user_id)):
    """Temperature readings trend for a specific item."""
    db = get_supabase()
    restaurant = get_restaurant_id(user_id, db)
    since = (date.today() - timedelta(days=days)).isoformat() + "T00:00:00"

    q = db.table("temperature_logs") \
        .select("item_name,temp_value,is_violation,logged_at,logged_by") \
        .eq("restaurant_id", restaurant["id"]) \
        .gte("logged_at", since) \
        .order("logged_at")

    if item_name:
        q = q.ilike("item_name", f"%{item_name}%")

    result = q.limit(200).execute()
    return result.data or []


@router.get("/staff-performance")
async def get_staff_performance(days: int = 30, user_id: str = Depends(get_user_id)):
    """Checklist submission breakdown by staff member."""
    db = get_supabase()
    restaurant = get_restaurant_id(user_id, db)
    since = (date.today() - timedelta(days=days)).isoformat()

    result = db.table("checklist_submissions") \
        .select("submitted_by,score,items_passed,items_failed,date") \
        .eq("restaurant_id", restaurant["id"]) \
        .gte("date", since) \
        .execute()

    # Aggregate by staff member
    by_staff = defaultdict(lambda: {"submissions": 0, "total_score": 0, "total_passed": 0, "total_failed": 0})
    for r in (result.data or []):
        name = r.get("submitted_by", "Unknown")
        by_staff[name]["submissions"] += 1
        by_staff[name]["total_score"] += r.get("score", 0)
        by_staff[name]["total_passed"] += r.get("items_passed", 0)
        by_staff[name]["total_failed"] += r.get("items_failed", 0)

    output = []
    for name, stats in by_staff.items():
        n = stats["submissions"]
        output.append({
            "name": name,
            "submissions": n,
            "avg_score": round(stats["total_score"] / n) if n else 0,
            "total_passed": stats["total_passed"],
            "total_failed": stats["total_failed"],
            "pass_rate": round(stats["total_passed"] / (stats["total_passed"] + stats["total_failed"]) * 100) if (stats["total_passed"] + stats["total_failed"]) > 0 else 0,
        })

    return sorted(output, key=lambda x: x["avg_score"], reverse=True)


@router.get("/violation-frequency")
async def get_violation_frequency(days: int = 90, user_id: str = Depends(get_user_id)):
    """How often each violation code appears in checklist failures."""
    db = get_supabase()
    restaurant = get_restaurant_id(user_id, db)
    since = (date.today() - timedelta(days=days)).isoformat()

    result = db.table("checklist_submissions") \
        .select("open_issues,date") \
        .eq("restaurant_id", restaurant["id"]) \
        .gte("date", since) \
        .execute()

    freq = defaultdict(int)
    for r in (result.data or []):
        for code in (r.get("open_issues") or []):
            freq[code] += 1

    from data.violations_db import get_violation_by_code
    output = []
    for code, count in sorted(freq.items(), key=lambda x: x[1], reverse=True)[:10]:
        v = get_violation_by_code(code)
        output.append({
            "code": code,
            "title": v.get("title", code),
            "count": count,
            "severity": v.get("severity", "general"),
        })
    return output


@router.get("/sensor-summary")
async def get_sensor_summary(user_id: str = Depends(get_user_id)):
    """Latest reading + 24h trend for each sensor."""
    db = get_supabase()
    restaurant = get_restaurant_id(user_id, db)
    rid = restaurant["id"]

    sensors = db.table("sensors").select("*").eq("restaurant_id", rid).execute()
    since = (date.today() - timedelta(days=1)).isoformat() + "T00:00:00"

    output = []
    for sensor in (sensors.data or []):
        readings = db.table("sensor_readings") \
            .select("value,is_violation,read_at") \
            .eq("sensor_id", sensor["id"]) \
            .gte("read_at", since) \
            .order("read_at", desc=False) \
            .execute()

        all_readings = readings.data or []
        latest = all_readings[-1] if all_readings else None
        violations_24h = sum(1 for r in all_readings if r.get("is_violation"))

        output.append({
            **sensor,
            "latest_value": latest["value"] if latest else None,
            "latest_at": latest["read_at"] if latest else None,
            "readings_24h": len(all_readings),
            "violations_24h": violations_24h,
            "trend": [{"value": r["value"], "time": r["read_at"]} for r in all_readings[-20:]],
        })

    return output
