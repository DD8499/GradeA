"""
Multi-layer photo validation service for GradeA checklist photo submissions.

Layer 1: EXIF timestamp — photo must be recent (within 60 minutes)
Layer 2: Perceptual hash — duplicate detection against last 24 hours
Layer 3: Gemini Vision AI — content relevance + real photo detection
"""
import io
import os
import base64
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional

try:
    from PIL import Image
    import piexif
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))


# ── Layer 1: EXIF Timestamp ──────────────────────────────────

def extract_exif_timestamp(photo_bytes: bytes) -> Optional[datetime]:
    """Extract DateTimeOriginal from EXIF. Returns None if unavailable."""
    if not PIL_AVAILABLE:
        return None
    try:
        exif_data = piexif.load(photo_bytes)
        exif_dict = exif_data.get("Exif", {})
        dt_original = exif_dict.get(piexif.ExifIFD.DateTimeOriginal)
        if dt_original:
            dt_str = dt_original.decode("utf-8") if isinstance(dt_original, bytes) else dt_original
            return datetime.strptime(dt_str, "%Y:%m:%d %H:%M:%S").replace(tzinfo=timezone.utc)
        return None
    except Exception:
        return None


def check_timestamp(photo_bytes: bytes, max_age_minutes: int = 60) -> dict:
    """Check if photo was taken within the allowed time window."""
    taken_at = extract_exif_timestamp(photo_bytes)
    if taken_at is None:
        # No EXIF — allow but flag as warning (many camera apps strip EXIF)
        return {"passed": True, "taken_at": None, "warning": "No EXIF timestamp found — could not verify photo age"}

    now = datetime.now(timezone.utc)
    age_minutes = (now - taken_at).total_seconds() / 60

    if age_minutes > max_age_minutes:
        return {
            "passed": False,
            "taken_at": taken_at.isoformat(),
            "message": f"Photo was taken {int(age_minutes)} minutes ago. Please take a fresh photo right now.",
        }

    return {"passed": True, "taken_at": taken_at.isoformat(), "age_minutes": round(age_minutes, 1)}


# ── Layer 2: Perceptual Hash ─────────────────────────────────

def compute_phash(photo_bytes: bytes) -> Optional[str]:
    """
    Compute a perceptual hash (pHash) of the image.
    Similar images will have similar hashes — allows duplicate detection
    even after minor edits, resizes, or re-compression.
    """
    if not PIL_AVAILABLE:
        return hashlib.md5(photo_bytes).hexdigest()

    try:
        img = Image.open(io.BytesIO(photo_bytes)).convert("L").resize((16, 16), Image.LANCZOS)
        pixels = list(img.getdata())
        avg = sum(pixels) / len(pixels)
        bits = "".join("1" if p >= avg else "0" for p in pixels)
        return format(int(bits, 2), "064x")  # 256-bit hex string
    except Exception:
        return hashlib.md5(photo_bytes).hexdigest()


def hamming_distance(hash1: str, hash2: str) -> int:
    """Count differing bits between two perceptual hashes."""
    try:
        h1 = int(hash1, 16)
        h2 = int(hash2, 16)
        xor = h1 ^ h2
        return bin(xor).count("1")
    except Exception:
        return 999  # Treat error as dissimilar


def is_duplicate(new_hash: str, existing_hashes: list[str], threshold: int = 8) -> bool:
    """
    Returns True if new_hash is too similar to any existing hash.
    Threshold: 8 out of 256 bits = 97% similar (very strict).
    """
    for h in existing_hashes:
        if hamming_distance(new_hash, h) <= threshold:
            return True
    return False


# ── Layer 3: Gemini Vision AI ────────────────────────────────

async def validate_with_gemini(photo_bytes: bytes, item_title: str, ai_hint: str = "") -> dict:
    """
    Use Gemini Vision to validate:
    1. Does the photo show the correct subject?
    2. Is it a real photo (not a screenshot / photo of a screen)?
    3. Is it clear and usable as evidence?
    """
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        photo_b64 = base64.b64encode(photo_bytes).decode()
        hint_context = f'\nSpecifically look for: "{ai_hint}"' if ai_hint else ""

        prompt = f"""You are a food safety compliance photo validator.

The staff member was asked to photograph: "{item_title}"{hint_context}

Analyze this photo and answer ALL of these questions:
1. Does this photo actually show "{item_title}" or something clearly relevant to it?
2. Is this a REAL camera photo (not a screenshot, not a photo of a screen or monitor, not a stock photo)?
3. Is the image clear and sharp enough to serve as compliance evidence?
4. Are there any signs this might be a manipulated or reused image?

Be strict about requirement #2 — look for screen bezels, pixel patterns, moiré effects, or reflection glare that indicate the photo was taken OF a screen.

Return ONLY valid JSON (no markdown, no backticks):
{{
  "is_relevant": true,
  "is_real_photo": true,
  "is_clear": true,
  "is_suspicious": false,
  "reason": "Photo shows the walk-in refrigerator thermostat clearly reading 38°F",
  "confidence": 0.92
}}"""

        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": photo_b64}
        ])

        import json
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())

    except Exception as e:
        # If AI fails, don't block submission — log and allow
        return {
            "is_relevant": True,
            "is_real_photo": True,
            "is_clear": True,
            "is_suspicious": False,
            "reason": f"AI validation unavailable: {str(e)[:100]}",
            "confidence": 0.5,
        }


# ── Master Validator ─────────────────────────────────────────

async def validate_photo(
    photo_bytes: bytes,
    item_id: str,
    item_title: str,
    validation_type: str,
    ai_hint: str = "",
    existing_hashes: list[str] = None,
    max_age_minutes: int = 60,
) -> dict:
    """
    Run the appropriate validation layers based on validation_type.

    Returns:
    {
      "passed": bool,
      "message": str,          # shown to staff on failure
      "photo_hash": str,       # store this for future duplicate detection
      "exif_taken_at": str,
      "ai_result": dict,
      "layers_run": [str]
    }
    """
    result = {
        "passed": True,
        "message": "Photo validated successfully.",
        "photo_hash": None,
        "exif_taken_at": None,
        "ai_result": None,
        "layers_run": [],
        "warnings": [],
    }

    # Always compute hash
    result["photo_hash"] = compute_phash(photo_bytes)

    if validation_type == "none":
        return result

    # ── Layer 1: Timestamp ────────────────────────────────
    if validation_type in ("timestamp", "ai", "strict"):
        result["layers_run"].append("timestamp")
        ts = check_timestamp(photo_bytes, max_age_minutes)
        result["exif_taken_at"] = ts.get("taken_at")

        if not ts["passed"]:
            result["passed"] = False
            result["message"] = ts.get("message", "Photo is too old. Please take a fresh photo.")
            return result

        if ts.get("warning"):
            result["warnings"].append(ts["warning"])

    # ── Layer 2: Perceptual Hash (duplicate detection) ────
    if validation_type in ("hash", "strict"):
        result["layers_run"].append("hash")
        if existing_hashes and is_duplicate(result["photo_hash"], existing_hashes):
            result["passed"] = False
            result["message"] = (
                "This photo looks identical to a recent submission. "
                "Please take a new, fresh photo right now."
            )
            return result

    # ── Layer 3: AI Content Validation ───────────────────
    if validation_type in ("ai", "strict"):
        result["layers_run"].append("ai")
        ai = await validate_with_gemini(photo_bytes, item_title, ai_hint)
        result["ai_result"] = ai

        if not ai.get("is_real_photo", True):
            result["passed"] = False
            result["message"] = (
                "This photo appears to be a screenshot or a photo of a screen — not a real photo. "
                "Please take a live photo using your camera."
            )
            return result

        if not ai.get("is_relevant", True):
            result["passed"] = False
            result["message"] = (
                f"Photo doesn't appear to show '{item_title}'. "
                f"Please take a clear photo of the correct subject. {ai.get('reason', '')}"
            )
            return result

        if ai.get("is_suspicious", False):
            result["passed"] = False
            result["message"] = (
                "This photo appears to be manipulated or reused. "
                "Please take a fresh live photo."
            )
            return result

    return result
