"""
Stripe service helper.
Thin wrappers around the Stripe SDK for use across routers.
"""
import os
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")


def create_customer(email: str, restaurant_name: str) -> str:
    """Create a Stripe customer and return the customer ID."""
    customer = stripe.Customer.create(
        email=email,
        name=restaurant_name,
        metadata={"source": "gradea"},
    )
    return customer.id


def get_subscription(subscription_id: str) -> dict:
    """Retrieve a Stripe subscription by ID."""
    try:
        sub = stripe.Subscription.retrieve(subscription_id)
        return {
            "id":       sub.id,
            "status":   sub.status,
            "plan":     sub["items"]["data"][0]["price"]["id"] if sub.get("items") else None,
            "ends_at":  sub.current_period_end,
        }
    except stripe.error.StripeError:
        return {}


def cancel_subscription_now(subscription_id: str) -> bool:
    """Immediately cancel a Stripe subscription."""
    try:
        stripe.Subscription.cancel(subscription_id)
        return True
    except stripe.error.StripeError:
        return False


def get_portal_url(customer_id: str, return_url: str) -> str:
    """Create a Stripe Customer Portal session."""
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url
