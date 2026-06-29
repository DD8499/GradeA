"""Ensure Supabase Storage buckets exist for GradeA."""

CHECKLIST_PHOTOS_BUCKET = "checklist-photos"


def _bucket_names(buckets) -> set[str]:
    names: set[str] = set()
    for bucket in buckets or []:
        if isinstance(bucket, dict):
            names.add(bucket.get("name") or bucket.get("id") or "")
        else:
            names.add(getattr(bucket, "name", None) or getattr(bucket, "id", None) or "")
    return {n for n in names if n}


def ensure_checklist_photos_bucket(db=None) -> None:
    """Create the checklist-photos bucket if it does not exist yet."""
    from auth import get_supabase

    if db is None:
        db = get_supabase()

    try:
        if CHECKLIST_PHOTOS_BUCKET in _bucket_names(db.storage.list_buckets()):
            return
    except Exception:
        pass

    try:
        db.storage.create_bucket(
            CHECKLIST_PHOTOS_BUCKET,
            options={
                "public": True,
                "file_size_limit": 10 * 1024 * 1024,
                "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"],
            },
        )
    except Exception as exc:
        msg = str(exc).lower()
        if "already exists" in msg or "duplicate" in msg:
            return
        raise
