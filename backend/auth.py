from fastapi import HTTPException, Depends, Header
from supabase import create_client, Client
import os
import jwt as pyjwt
from typing import Optional

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")


def get_supabase() -> Client:
    """Return Supabase client with service role key (bypasses RLS — for staff routes)."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Verify Supabase JWT from Authorization header.
    Returns the decoded user payload.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ")[1]

    try:
        payload = pyjwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def get_user_id(user: dict = Depends(get_current_user)) -> str:
    """Extract user UUID from decoded JWT."""
    uid = user.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid user payload")
    return uid
