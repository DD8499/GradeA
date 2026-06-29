from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional
import os
import stripe
from auth import get_supabase, get_user_id

router = APIRouter()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

PLANS = {
    "starter": {
        "price_id": os.getenv("STRIPE_STARTER_PRICE_ID", ""),
        "name": "Starter",
        "amount": 3900,
    },
    "pro": {
        "price_id": os.getenv("STRIPE_PRO_PRICE_ID", ""),
        "name": "Pro",
        "amount": 7900,
    },
}


class CheckoutRequest(BaseModel):
    plan: str  # "starter" or "pro"


@router.post("/checkout")
async def create_checkout_session(data: CheckoutRequest, user_id: str = Depends(get_user_id)):
    """Create a Stripe checkout session for plan upgrade."""
    if data.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan = PLANS[data.plan]

    if not plan["price_id"]:
        raise HTTPException(status_code=500, detail="Stripe price ID not configured")

    db = get_supabase()
    restaurant = db.table("restaurants").select("id,stripe_customer_id,name").eq("owner_id", user_id).limit(1).execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    r = restaurant.data[0]
    customer_id = r.get("stripe_customer_id")

    try:
        session_params = {
            "payment_method_types": ["card"],
            "line_items": [{"price": plan["price_id"], "quantity": 1}],
            "mode": "subscription",
            "success_url": f"{FRONTEND_URL}/settings?payment=success",
            "cancel_url": f"{FRONTEND_URL}/settings?payment=cancelled",
            "metadata": {
                "restaurant_id": r["id"],
                "user_id": user_id,
                "plan": data.plan,
            },
        }
        if customer_id:
            session_params["customer"] = customer_id

        session = stripe.checkout.Session.create(**session_params)
        return {"checkout_url": session.url, "session_id": session.id}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: Optional[str] = Header(None)):
    """Handle Stripe webhook events."""
    body = await request.body()

    try:
        event = stripe.Webhook.construct_event(body, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    db = get_supabase()

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        restaurant_id = session["metadata"].get("restaurant_id")
        plan = session["metadata"].get("plan")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")

        if restaurant_id:
            db.table("restaurants").update({
                "plan": plan,
                "stripe_customer_id": customer_id,
                "stripe_subscription_id": subscription_id,
            }).eq("id", restaurant_id).execute()

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")

        if customer_id:
            db.table("restaurants").update({
                "plan": "trial",
                "stripe_subscription_id": None,
            }).eq("stripe_customer_id", customer_id).execute()

    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        status = subscription.get("status")

        if customer_id and status == "active":
            # Subscription renewed — keep plan active
            pass

    return {"received": True}


@router.get("/status")
async def get_billing_status(user_id: str = Depends(get_user_id)):
    """Get current billing plan and trial status."""
    db = get_supabase()
    restaurant = db.table("restaurants") \
        .select("plan,trial_ends_at,stripe_subscription_id") \
        .eq("owner_id", user_id) \
        .limit(1) \
        .execute()

    if not restaurant.data:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    r = restaurant.data[0]
    from datetime import datetime, timezone

    trial_ends = r.get("trial_ends_at")
    is_trial_active = False
    days_left = 0

    if trial_ends and r.get("plan") == "trial":
        ends_dt = datetime.fromisoformat(trial_ends.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        delta = ends_dt - now
        is_trial_active = delta.days >= 0
        days_left = max(0, delta.days)

    return {
        "plan": r.get("plan", "trial"),
        "is_trial": r.get("plan") == "trial",
        "trial_active": is_trial_active,
        "trial_days_left": days_left,
        "has_subscription": bool(r.get("stripe_subscription_id")),
    }


@router.post("/cancel")
async def cancel_subscription(user_id: str = Depends(get_user_id)):
    """Cancel the current subscription at period end."""
    db = get_supabase()
    restaurant = db.table("restaurants") \
        .select("stripe_subscription_id") \
        .eq("owner_id", user_id) \
        .limit(1) \
        .execute()

    if not restaurant.data or not restaurant.data[0].get("stripe_subscription_id"):
        raise HTTPException(status_code=404, detail="No active subscription found")

    sub_id = restaurant.data[0]["stripe_subscription_id"]

    try:
        stripe.Subscription.modify(sub_id, cancel_at_period_end=True)
        return {"success": True, "message": "Subscription will cancel at end of billing period"}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=str(e))
