"""
Twilio SMS/WhatsApp service for urgent alerts.
"""
import os
from twilio.rest import Client

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
AUTH_TOKEN   = os.getenv("TWILIO_AUTH_TOKEN", "")
FROM_NUMBER  = os.getenv("TWILIO_FROM_NUMBER", "")  # e.g. +12025551234
WHATSAPP_NUM = os.getenv("TWILIO_WHATSAPP_NUMBER", "")  # e.g. whatsapp:+14155238886


def _client():
    return Client(ACCOUNT_SID, AUTH_TOKEN)


def send_sms(to_number: str, message: str) -> bool:
    """Send an SMS alert. Returns True on success."""
    if not ACCOUNT_SID or not AUTH_TOKEN or not FROM_NUMBER:
        print("Twilio not configured — SMS skipped")
        return False
    try:
        _client().messages.create(body=message, from_=FROM_NUMBER, to=to_number)
        return True
    except Exception as e:
        print(f"Twilio SMS error: {e}")
        return False


def send_whatsapp(to_number: str, message: str) -> bool:
    """Send a WhatsApp message via Twilio."""
    if not ACCOUNT_SID or not WHATSAPP_NUM:
        return False
    try:
        _client().messages.create(
            body=message,
            from_=f"whatsapp:{WHATSAPP_NUM}",
            to=f"whatsapp:{to_number}",
        )
        return True
    except Exception as e:
        print(f"Twilio WhatsApp error: {e}")
        return False


def send_temp_violation_sms(to_number: str, sensor_name: str, value: float, unit: str, max_safe: float = None, min_safe: float = None):
    limit = f"max {max_safe}°{unit}" if max_safe else f"min {min_safe}°{unit}"
    message = (
        f"GradeA ALERT: {sensor_name} is at {value}°{unit} "
        f"(safe {limit}). Fix now to avoid DOH violation. "
        f"Login: gradea.app/dashboard"
    )
    return send_sms(to_number, message)


def send_inspection_reminder_sms(to_number: str, restaurant_name: str, days_until: int):
    message = (
        f"GradeA: NYC DOH inspection for {restaurant_name} "
        f"is due in ~{days_until} days. "
        f"Complete today's checklist: gradea.app/checklist"
    )
    return send_sms(to_number, message)
