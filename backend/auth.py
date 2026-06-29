from fastapi import HTTPException, Depends, Header
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import jwt as pyjwt
from jwt import PyJWKClient
from typing import Optional

# Load .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
# Load env variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

print("SUPABASE_URL:", SUPABASE_URL)
print("SUPABASE_SERVICE_KEY:", bool(SUPABASE_SERVICE_KEY))

def get_supabase() -> Client:
    """
    Return Supabase client with service role key.
    (Bypasses RLS for backend routes)
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> dict:
    """
    Verify Supabase JWT from Authorization header.
    Supports ES256 tokens using JWKS.
    """

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header"
        )

    token = authorization.split(" ")[1]

    try:
        # Supabase public JWKS endpoint
        jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"

        # Get signing key from token
        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Decode token
        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )

        return payload

    except pyjwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token expired"
        )

    except pyjwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}"
        )

    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Auth error: {str(e)}"
        )


def get_user_id(user: dict = Depends(get_current_user)) -> str:
    """
    Extract user UUID from decoded JWT.
    """
    uid = user.get("sub")

    if not uid:
        raise HTTPException(
            status_code=401,
            detail="Invalid user payload"
        )

    return uid


async def get_restaurant_for_checklist(
    authorization: Optional[str] = Header(None),
    x_staff_token: Optional[str] = Header(None, alias="X-Staff-Token"),
) -> dict:
    """
    Resolve restaurant from owner JWT or staff link token.
    Used by endpoints shared between owner and staff flows.
    """
    db = get_supabase()

    if x_staff_token:
        result = db.table("restaurants") \
            .select("id,name,cuisine_type") \
            .eq("staff_token", x_staff_token) \
            .limit(1) \
            .execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Invalid or expired staff link")
        return result.data[0]

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    user = await get_current_user(authorization)
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user payload")

    result = db.table("restaurants") \
        .select("id,name,cuisine_type") \
        .eq("owner_id", user_id) \
        .limit(1) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return result.data[0]