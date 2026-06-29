"""
NYC Open Data service — helper functions for fetching
restaurant inspection data from the public DOH API.
"""
import httpx
from typing import Optional

NYC_DOH_URL = "https://data.cityofnewyork.us/resource/43nn-pn8j.json"


async def get_restaurant_by_camis(camis_id: str) -> Optional[dict]:
    """Fetch the latest inspection record for a restaurant by CAMIS ID."""
    params = {
        "camis": camis_id,
        "$order": "inspection_date DESC",
        "$limit": 1,
    }
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(NYC_DOH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
        return data[0] if data else None


async def get_top_violations_for_cuisine(cuisine_type: str, limit: int = 10) -> list:
    """
    Fetch the most common violation codes for a given cuisine type.
    Used to seed the AI violation report prompt.
    """
    params = {
        "$where": f"cuisine_description='{cuisine_type.title()}'",
        "$select": "violation_code, violation_description, count(*) as cnt",
        "$group": "violation_code, violation_description",
        "$order": "cnt DESC",
        "$limit": limit,
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(NYC_DOH_URL, params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return []


async def search_restaurants(name: str, borough: Optional[str] = None, limit: int = 5) -> list:
    """Search NYC DOH database by restaurant name."""
    where = f"upper(dba) like upper('%{name}%')"
    if borough:
        where += f" AND boro='{borough[:2].upper()}'"

    params = {
        "$where": where,
        "$order": "inspection_date DESC",
        "$limit": 50,
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(NYC_DOH_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        # Deduplicate by CAMIS
        seen = {}
        for r in data:
            camis = r.get("camis")
            if camis and camis not in seen:
                seen[camis] = {
                    "camis_id":            camis,
                    "name":                r.get("dba", ""),
                    "address":             f"{r.get('building','')} {r.get('street','')}".strip(),
                    "borough":             r.get("boro", ""),
                    "zipcode":             r.get("zipcode", ""),
                    "cuisine":             r.get("cuisine_description", ""),
                    "last_grade":          r.get("grade", ""),
                    "last_inspection_date": (r.get("grade_date") or r.get("inspection_date") or "")[:10],
                    "phone":               r.get("phone", ""),
                }

        return list(seen.values())[:limit]
    except Exception:
        return []
