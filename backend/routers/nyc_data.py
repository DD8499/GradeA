from fastapi import APIRouter, HTTPException
import httpx
from typing import Optional

router = APIRouter()

NYC_DOH_BASE = "https://data.cityofnewyork.us/resource/43nn-pn8j.json"
APP_TOKEN = ""  # Optional: get a free token at data.cityofnewyork.us for higher rate limits


async def fetch_nyc_data(params: dict) -> list:
    headers = {"X-App-Token": APP_TOKEN} if APP_TOKEN else {}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(NYC_DOH_BASE, params=params, headers=headers)
        resp.raise_for_status()
        return resp.json()


@router.get("/lookup")
async def lookup_restaurant(name: str, borough: Optional[str] = None):
    """
    Search for a restaurant in the NYC DOH database by name.
    Returns inspection history including last grade.
    """
    params = {
        "$where": f"upper(dba) like upper('%{name}%')",
        "$order": "inspection_date DESC",
        "$limit": 20,
    }
    if borough:
        params["boro"] = borough.upper()[:2] if len(borough) > 2 else borough.upper()

    try:
        data = await fetch_nyc_data(params)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NYC Open Data unavailable: {str(e)}")

    # Group by restaurant (CAMIS ID) and return unique restaurants
    restaurants = {}
    for record in data:
        camis = record.get("camis")
        if camis and camis not in restaurants:
            restaurants[camis] = {
                "camis_id": camis,
                "name": record.get("dba", ""),
                "address": f"{record.get('building','')} {record.get('street','')}".strip(),
                "borough": record.get("boro", ""),
                "zipcode": record.get("zipcode", ""),
                "cuisine": record.get("cuisine_description", ""),
                "last_grade": record.get("grade", ""),
                "last_inspection_date": record.get("grade_date", record.get("inspection_date", "")),
                "phone": record.get("phone", ""),
            }

    return list(restaurants.values())[:5]  # Return top 5 matches


@router.get("/inspection-history/{camis_id}")
async def get_inspection_history(camis_id: str):
    """
    Get full inspection history for a restaurant by CAMIS ID.
    """
    params = {
        "camis": camis_id,
        "$order": "inspection_date DESC",
        "$limit": 50,
    }

    try:
        data = await fetch_nyc_data(params)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NYC Open Data unavailable: {str(e)}")

    # Parse and clean results
    history = []
    for record in data:
        history.append({
            "inspection_date": record.get("inspection_date", "")[:10] if record.get("inspection_date") else None,
            "action": record.get("action", ""),
            "violation_code": record.get("violation_code", ""),
            "violation_description": record.get("violation_description", ""),
            "score": record.get("score"),
            "grade": record.get("grade", ""),
            "grade_date": record.get("grade_date", "")[:10] if record.get("grade_date") else None,
            "inspection_type": record.get("inspection_type", ""),
        })

    return history


@router.get("/common-violations")
async def get_common_violations(cuisine_type: str, borough: Optional[str] = None):
    """
    Get the most common violations for a given cuisine type in NYC.
    Uses aggregated NYC Open Data.
    """
    where_clause = f"cuisine_description='{cuisine_type}'"
    if borough:
        where_clause += f" AND boro='{borough}'"

    params = {
        "$where": where_clause,
        "$select": "violation_code, violation_description, count(*) as frequency",
        "$group": "violation_code, violation_description",
        "$order": "frequency DESC",
        "$limit": 10,
    }

    try:
        data = await fetch_nyc_data(params)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NYC Open Data unavailable: {str(e)}")

    return [
        {
            "code": r.get("violation_code", ""),
            "description": r.get("violation_description", ""),
            "frequency": int(r.get("frequency", 0)),
        }
        for r in data if r.get("violation_code")
    ]
