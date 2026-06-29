import os
import resend
from typing import Optional

resend.api_key = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "alerts@gradea.app")


async def send_temp_alert(
    restaurant_id: str,
    item_name: str,
    temp_value: float,
    min_safe: Optional[float],
    max_safe: Optional[float],
):
    """Send an email alert when a temperature violation is detected."""
    db_url = os.getenv("SUPABASE_URL")

    # Get owner email from Supabase
    from supabase import create_client
    db = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

    restaurant = db.table("restaurants").select("name,owner_id").eq("id", restaurant_id).limit(1).execute()
    if not restaurant.data:
        return

    r = restaurant.data[0]
    owner = db.auth.admin.get_user_by_id(r["owner_id"])
    owner_email = owner.user.email if owner and owner.user else None

    if not owner_email:
        return

    safe_range = ""
    if max_safe:
        safe_range = f"Safe maximum: {max_safe}°F"
    elif min_safe:
        safe_range = f"Safe minimum: {min_safe}°F"

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": owner_email,
        "subject": f"⚠️ Temperature Alert — {r['name']}",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">⚠️ Temperature Violation Detected</h2>
            </div>
            <div style="background: #FEF2F2; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #FCA5A5;">
                <p style="font-size: 16px; color: #111827;">
                    A temperature outside the safe range was logged at <strong>{r['name']}</strong>.
                </p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr style="background: white;">
                        <td style="padding: 12px; border: 1px solid #E5E7EB; font-weight: bold;">Item</td>
                        <td style="padding: 12px; border: 1px solid #E5E7EB;">{item_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E5E7EB; font-weight: bold;">Temperature Logged</td>
                        <td style="padding: 12px; border: 1px solid #E5E7EB; color: #DC2626; font-weight: bold;">{temp_value}°F</td>
                    </tr>
                    <tr style="background: white;">
                        <td style="padding: 12px; border: 1px solid #E5E7EB; font-weight: bold;">Safe Range</td>
                        <td style="padding: 12px; border: 1px solid #E5E7EB;">{safe_range}</td>
                    </tr>
                </table>
                <p style="color: #6B7280; font-size: 14px;">
                    Correct this immediately to avoid a NYC DOH critical violation during inspection.
                    Log in to GradeA to review your temperature history.
                </p>
                <a href="https://gradea.app/temperatures" 
                   style="display: inline-block; background: #16A34A; color: white; padding: 12px 24px;
                          border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 8px;">
                    View Temperature Log →
                </a>
            </div>
            <p style="font-size: 12px; color: #9CA3AF; margin-top: 16px; text-align: center;">
                GradeA — NYC Restaurant Health Inspection Prep<br>
                <a href="https://gradea.app/settings" style="color: #9CA3AF;">Manage notification settings</a>
            </p>
        </div>
        """,
    })


async def send_checklist_alert(
    restaurant_id: str,
    failed_codes: list,
    submitted_by: str,
):
    """Send alert when staff submits checklist with failures."""
    from supabase import create_client
    db = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

    restaurant = db.table("restaurants").select("name,owner_id").eq("id", restaurant_id).limit(1).execute()
    if not restaurant.data:
        return

    r = restaurant.data[0]
    owner = db.auth.admin.get_user_by_id(r["owner_id"])
    owner_email = owner.user.email if owner and owner.user else None

    if not owner_email:
        return

    issues_html = "".join([f"<li style='margin: 4px 0; color: #DC2626;'><strong>{code}</strong></li>" for code in failed_codes])

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": owner_email,
        "subject": f"📋 Checklist Issues Found — {r['name']}",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #D97706; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">📋 Daily Checklist Alert</h2>
            </div>
            <div style="background: #FFFBEB; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #FCD34D;">
                <p style="font-size: 16px; color: #111827;">
                    {submitted_by} submitted today's checklist at <strong>{r['name']}</strong> 
                    with <strong>{len(failed_codes)} issues</strong> that need attention.
                </p>
                <h3 style="color: #374151;">Failed Items:</h3>
                <ul style="list-style: none; padding: 0;">{issues_html}</ul>
                <a href="https://gradea.app/checklist" 
                   style="display: inline-block; background: #16A34A; color: white; padding: 12px 24px;
                          border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px;">
                    Review Checklist →
                </a>
            </div>
        </div>
        """,
    })


async def send_inspection_reminder(
    restaurant_id: str,
    restaurant_name: str,
    owner_email: str,
    days_until: int,
):
    """Send re-inspection reminder email."""
    urgency = "🔴 URGENT" if days_until <= 7 else "⚠️ Reminder"

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": owner_email,
        "subject": f"{urgency}: NYC DOH inspection in ~{days_until} days — {restaurant_name}",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: {'#DC2626' if days_until <= 7 else '#D97706'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">{urgency}: Inspection Window Opening</h2>
            </div>
            <div style="background: #F9FAFB; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #E5E7EB;">
                <p style="font-size: 16px;">
                    Your NYC DOH re-inspection window for <strong>{restaurant_name}</strong> 
                    opens in approximately <strong>{days_until} days</strong>.
                </p>
                <p>This means an inspector could show up <strong>any day now</strong>.</p>
                <h3>What to do today:</h3>
                <ol style="color: #374151; line-height: 1.8;">
                    <li>Complete your daily checklist right now</li>
                    <li>Check all refrigerator temperatures</li>
                    <li>Review your AI violation risk report</li>
                    <li>Verify all staff have valid Food Protection Certificates</li>
                    <li>Check that your DOH permit is posted and current</li>
                </ol>
                <a href="https://gradea.app/dashboard" 
                   style="display: inline-block; background: #16A34A; color: white; padding: 14px 28px;
                          border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px; font-size: 16px;">
                    Open GradeA Dashboard →
                </a>
            </div>
        </div>
        """,
    })
