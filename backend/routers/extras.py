"""
Combined router file for smaller feature routers:
- Staff Profiles
- Document Vault
- Corrective Actions
- Inspector Visits
- AI Chatbot
- Pest Control
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from auth import get_supabase, get_user_id


def _rid(user_id: str, db) -> str:
    r = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()
    if not r.data:
        raise HTTPException(404, "Restaurant not found")
    return r.data[0]["id"]


# ════════════════════════════════════════════════
# STAFF PROFILES
# ════════════════════════════════════════════════
staff_router = APIRouter()


class StaffCreate(BaseModel):
    name: str
    role: str = "staff"
    email: Optional[str] = None
    phone: Optional[str] = None
    food_cert_number: Optional[str] = None
    food_cert_issued: Optional[str] = None
    food_cert_expires: Optional[str] = None
    notes: Optional[str] = None


@staff_router.get("/")
async def get_staff(user_id: str = Depends(get_user_id)):
    db = get_supabase()
    result = db.table("staff_profiles").select("*").eq("restaurant_id", _rid(user_id, db)).order("name").execute()
    return result.data or []


@staff_router.post("/")
async def create_staff(data: StaffCreate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    result = db.table("staff_profiles").insert({"restaurant_id": _rid(user_id, db), **data.dict()}).execute()
    return result.data[0] if result.data else {}


@staff_router.put("/{staff_id}")
async def update_staff(staff_id: str, data: StaffCreate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = _rid(user_id, db)
    result = db.table("staff_profiles").update(data.dict()).eq("id", staff_id).eq("restaurant_id", rid).execute()
    return result.data[0] if result.data else {}


@staff_router.delete("/{staff_id}")
async def delete_staff(staff_id: str, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    db.table("staff_profiles").delete().eq("id", staff_id).eq("restaurant_id", _rid(user_id, db)).execute()
    return {"success": True}


@staff_router.get("/expiring-certs")
async def expiring_certs(days: int = 30, user_id: str = Depends(get_user_id)):
    """Staff with Food Protection Certs expiring within N days."""
    db = get_supabase()
    from datetime import date, timedelta
    threshold = (date.today() + timedelta(days=days)).isoformat()
    result = db.table("staff_profiles") \
        .select("name,food_cert_number,food_cert_expires,role") \
        .eq("restaurant_id", _rid(user_id, db)) \
        .eq("is_active", True) \
        .not_.is_("food_cert_expires", "null") \
        .lte("food_cert_expires", threshold) \
        .execute()
    return result.data or []


# ════════════════════════════════════════════════
# DOCUMENT VAULT
# ════════════════════════════════════════════════
docs_router = APIRouter()

DOC_TYPES = [
    "doh_permit", "food_cert", "pco_report", "liquor_license",
    "workers_comp", "insurance", "equipment_cert", "other"
]


class DocumentCreate(BaseModel):
    name: str
    doc_type: str = "other"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_kb: Optional[int] = None
    issued_date: Optional[str] = None
    expiry_date: Optional[str] = None
    notes: Optional[str] = None
    alert_days_before: int = 30


@docs_router.get("/")
async def get_documents(user_id: str = Depends(get_user_id)):
    db = get_supabase()
    result = db.table("documents").select("*").eq("restaurant_id", _rid(user_id, db)).order("expiry_date").execute()
    # Mark expired
    from datetime import date
    today = date.today().isoformat()
    for doc in (result.data or []):
        if doc.get("expiry_date") and doc["expiry_date"] < today:
            doc["is_expired"] = True
    return result.data or []


@docs_router.post("/")
async def create_document(data: DocumentCreate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    result = db.table("documents").insert({"restaurant_id": _rid(user_id, db), **data.dict()}).execute()
    return result.data[0] if result.data else {}


@docs_router.put("/{doc_id}")
async def update_document(doc_id: str, data: DocumentCreate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = _rid(user_id, db)
    result = db.table("documents").update(data.dict()).eq("id", doc_id).eq("restaurant_id", rid).execute()
    return result.data[0] if result.data else {}


@docs_router.delete("/{doc_id}")
async def delete_document(doc_id: str, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    db.table("documents").delete().eq("id", doc_id).eq("restaurant_id", _rid(user_id, db)).execute()
    return {"success": True}


@docs_router.get("/expiring")
async def expiring_documents(days: int = 30, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    from datetime import date, timedelta
    today = date.today().isoformat()
    threshold = (date.today() + timedelta(days=days)).isoformat()
    result = db.table("documents") \
        .select("*") \
        .eq("restaurant_id", _rid(user_id, db)) \
        .gte("expiry_date", today) \
        .lte("expiry_date", threshold) \
        .order("expiry_date") \
        .execute()
    return result.data or []


# ════════════════════════════════════════════════
# CORRECTIVE ACTIONS
# ════════════════════════════════════════════════
corrective_router = APIRouter()


class CorrectiveCreate(BaseModel):
    title: str
    description: Optional[str] = None
    violation_code: Optional[str] = None
    severity: str = "general"
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    source: str = "manual"


class CorrectiveUpdate(BaseModel):
    status: Optional[str] = None
    resolution_note: Optional[str] = None
    after_photo_url: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None


@corrective_router.get("/")
async def get_actions(status: Optional[str] = None, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    q = db.table("corrective_actions").select("*").eq("restaurant_id", _rid(user_id, db))
    if status:
        q = q.eq("status", status)
    result = q.order("created_at", desc=True).execute()
    return result.data or []


@corrective_router.post("/")
async def create_action(data: CorrectiveCreate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    result = db.table("corrective_actions").insert({"restaurant_id": _rid(user_id, db), **data.dict()}).execute()
    return result.data[0] if result.data else {}


@corrective_router.put("/{action_id}")
async def update_action(action_id: str, data: CorrectiveUpdate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = _rid(user_id, db)
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if update_data.get("status") == "resolved":
        from datetime import datetime, timezone
        update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    result = db.table("corrective_actions").update(update_data).eq("id", action_id).eq("restaurant_id", rid).execute()
    return result.data[0] if result.data else {}


@corrective_router.delete("/{action_id}")
async def delete_action(action_id: str, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    db.table("corrective_actions").delete().eq("id", action_id).eq("restaurant_id", _rid(user_id, db)).execute()
    return {"success": True}


# ════════════════════════════════════════════════
# INSPECTOR VISITS
# ════════════════════════════════════════════════
visits_router = APIRouter()


class VisitCreate(BaseModel):
    visit_date: str
    inspector_name: Optional[str] = None
    inspection_type: str = "routine"
    grade_received: Optional[str] = None
    score: Optional[int] = None
    violations_found: List[dict] = []
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None


@visits_router.get("/")
async def get_visits(user_id: str = Depends(get_user_id)):
    db = get_supabase()
    result = db.table("inspector_visits").select("*").eq("restaurant_id", _rid(user_id, db)).order("visit_date", desc=True).execute()
    return result.data or []


@visits_router.post("/")
async def log_visit(data: VisitCreate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = _rid(user_id, db)
    payload = {
        "restaurant_id": rid,
        **data.dict(),
        "total_violations": len(data.violations_found),
        "critical_violations": sum(1 for v in data.violations_found if v.get("critical")),
    }
    result = db.table("inspector_visits").insert(payload).execute()
    # Update restaurant with new grade
    if data.grade_received:
        db.table("restaurants").update({
            "last_grade": data.grade_received,
            "last_inspection_date": data.visit_date,
        }).eq("id", rid).execute()
    return result.data[0] if result.data else {}


@visits_router.delete("/{visit_id}")
async def delete_visit(visit_id: str, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    db.table("inspector_visits").delete().eq("id", visit_id).eq("restaurant_id", _rid(user_id, db)).execute()
    return {"success": True}


# ════════════════════════════════════════════════
# AI CHATBOT
# ════════════════════════════════════════════════
chatbot_router = APIRouter()


class ChatMessage(BaseModel):
    message: str


@chatbot_router.get("/history")
async def get_chat_history(limit: int = 50, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    result = db.table("chat_messages").select("*").eq("restaurant_id", _rid(user_id, db)).order("created_at").limit(limit).execute()
    return result.data or []


@chatbot_router.post("/message")
async def send_message(data: ChatMessage, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    rid = _rid(user_id, db)

    restaurant = db.table("restaurants").select("name,cuisine_type,borough,last_grade").eq("owner_id", user_id).limit(1).execute()
    r = restaurant.data[0] if restaurant.data else {}

    # Get conversation history (last 10 messages)
    history = db.table("chat_messages").select("role,content").eq("restaurant_id", rid).order("created_at", desc=True).limit(10).execute()
    past = list(reversed(history.data or []))

    # Save user message
    db.table("chat_messages").insert({"restaurant_id": rid, "role": "user", "content": data.message}).execute()

    # Build Gemini prompt
    import google.generativeai as genai
    import os
    genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
    model = genai.GenerativeModel("gemini-1.5-flash")

    system_ctx = f"""You are GradeA AI, an expert NYC Department of Health restaurant compliance assistant.
You help restaurant owners understand and comply with NYC DOH inspection requirements.

Restaurant context:
- Name: {r.get('name', 'Unknown')}
- Cuisine: {r.get('cuisine_type', 'Unknown')}
- Borough: {r.get('borough', 'NYC')}
- Last DOH grade: {r.get('last_grade', 'Unknown')}

You know:
- All NYC DOH violation codes and their point values
- NYC Fair Workweek Law and food worker rights
- HACCP principles and food safety science
- NYC-specific regulations (Boro-specific enforcement patterns)
- How to prepare for inspections, handle violations, and appeal fines
- Temperature requirements, cross-contamination rules, pest control

Be concise, practical, and specific to NYC. When relevant, mention violation codes."""

    # Build conversation
    chat_history = []
    for msg in past:
        chat_history.append({"role": msg["role"], "parts": [msg["content"]]})

    try:
        chat = model.start_chat(history=chat_history)
        response = chat.send_message(f"{system_ctx}\n\nUser: {data.message}")
        reply = response.text
    except Exception as e:
        reply = f"I'm having trouble connecting to the AI right now. Please try again. (Error: {str(e)[:100]})"

    # Save assistant reply
    db.table("chat_messages").insert({"restaurant_id": rid, "role": "assistant", "content": reply}).execute()

    return {"reply": reply}


@chatbot_router.delete("/history")
async def clear_history(user_id: str = Depends(get_user_id)):
    db = get_supabase()
    db.table("chat_messages").delete().eq("restaurant_id", _rid(user_id, db)).execute()
    return {"success": True}


# ════════════════════════════════════════════════
# PEST CONTROL
# ════════════════════════════════════════════════
pest_router = APIRouter()


class PestLogCreate(BaseModel):
    visit_date: str
    operator_name: str
    company_name: Optional[str] = None
    license_number: Optional[str] = None
    treatment_type: str = "spray"
    areas_treated: List[str] = []
    findings: Optional[str] = None
    products_used: List[dict] = []
    next_visit_date: Optional[str] = None
    report_url: Optional[str] = None


@pest_router.get("/")
async def get_pest_logs(user_id: str = Depends(get_user_id)):
    db = get_supabase()
    result = db.table("pest_control_logs").select("*").eq("restaurant_id", _rid(user_id, db)).order("visit_date", desc=True).execute()
    return result.data or []


@pest_router.post("/")
async def create_pest_log(data: PestLogCreate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    result = db.table("pest_control_logs").insert({"restaurant_id": _rid(user_id, db), **data.dict()}).execute()
    return result.data[0] if result.data else {}


@pest_router.delete("/{log_id}")
async def delete_pest_log(log_id: str, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    db.table("pest_control_logs").delete().eq("id", log_id).eq("restaurant_id", _rid(user_id, db)).execute()
    return {"success": True}


@pest_router.get("/next-visit")
async def get_next_visit(user_id: str = Depends(get_user_id)):
    db = get_supabase()
    from datetime import date
    result = db.table("pest_control_logs") \
        .select("next_visit_date,operator_name,company_name") \
        .eq("restaurant_id", _rid(user_id, db)) \
        .not_.is_("next_visit_date", "null") \
        .gte("next_visit_date", date.today().isoformat()) \
        .order("next_visit_date") \
        .limit(1) \
        .execute()
    return result.data[0] if result.data else None
