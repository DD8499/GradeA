-- ============================================================
-- GradeA Schema V3 — Run AFTER schema.sql AND schema_v2.sql
-- Custom checklists, photo validation, practice mode, streaks
-- ============================================================

-- ─────────────────────────────────────────
-- CUSTOM CHECKLIST ITEMS (owner-created)
-- ─────────────────────────────────────────
CREATE TABLE custom_checklist_items (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id     UUID    REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  title             TEXT    NOT NULL,
  description       TEXT,
  daily_checks      JSONB   DEFAULT '[]',   -- list of sub-steps
  category          TEXT    DEFAULT 'custom',
  severity          TEXT    DEFAULT 'general' CHECK (severity IN ('critical','general')),

  -- Photo settings
  photo_required    BOOLEAN DEFAULT FALSE,
  photo_validation  TEXT    DEFAULT 'none'
                    CHECK (photo_validation IN ('none','timestamp','hash','ai','strict')),
  -- 'none'      = any photo accepted
  -- 'timestamp' = EXIF must be within 60 min
  -- 'hash'      = perceptual hash duplicate check (no reuse within 24h)
  -- 'ai'        = Gemini Vision validates content
  -- 'strict'    = timestamp + hash + AI (most robust)

  ai_prompt_hint    TEXT,   -- "show the fridge thermometer clearly" — guides Gemini Vision

  sort_order        INT     DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CHECKLIST PHOTO SUBMISSIONS
-- ─────────────────────────────────────────
CREATE TABLE checklist_photo_submissions (
  id                    UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id         UUID    REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  item_id               TEXT    NOT NULL,  -- violation code (e.g. "04C") OR custom UUID
  item_title            TEXT,
  photo_url             TEXT    NOT NULL,
  photo_storage_path    TEXT,
  photo_hash            TEXT,              -- perceptual hash for duplicate detection
  photo_size_bytes      INT,
  exif_taken_at         TIMESTAMPTZ,       -- extracted from EXIF DateTimeOriginal
  exif_gps_lat          DECIMAL(9,6),
  exif_gps_lng          DECIMAL(9,6),
  validation_passed     BOOLEAN DEFAULT TRUE,
  validation_type       TEXT,
  validation_message    TEXT,
  ai_validation_result  JSONB,
  -- { is_relevant: bool, is_real_photo: bool, is_clear: bool, reason: str }
  submitted_by          TEXT,
  submitted_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- PRACTICE INSPECTION SESSIONS (AI simulates DOH inspector)
-- ─────────────────────────────────────────
CREATE TABLE practice_sessions (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id     UUID    REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  questions         JSONB   DEFAULT '[]',
  -- [{code, question, user_answer, correct, explanation}]
  score             INT,
  total_questions   INT,
  time_taken_secs   INT,
  mode              TEXT    DEFAULT 'standard' -- 'standard'|'hard'|'rapid'
);

-- ─────────────────────────────────────────
-- COMPLIANCE STREAKS
-- ─────────────────────────────────────────
CREATE TABLE compliance_streaks (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id     UUID    REFERENCES restaurants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  current_streak    INT     DEFAULT 0,    -- consecutive days with full checklist
  longest_streak    INT     DEFAULT 0,
  last_check_date   DATE,
  streak_broken_at  DATE,
  total_days        INT     DEFAULT 0,    -- all-time days with checklist submitted
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- QR CODES PER CHECKLIST ITEM
-- ─────────────────────────────────────────
CREATE TABLE item_qr_codes (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id     UUID    REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  item_id           TEXT    NOT NULL,     -- violation code or custom UUID
  item_title        TEXT,
  qr_token          TEXT    UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  -- Staff scans QR → taken to specific item in checklist
  location_note     TEXT,                 -- "Mounted on walk-in fridge door"
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- WHATSAPP CHECKLIST SESSIONS
-- ─────────────────────────────────────────
CREATE TABLE whatsapp_sessions (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id     UUID    REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  phone_number      TEXT    NOT NULL,
  staff_name        TEXT,
  session_token     TEXT    UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  state             TEXT    DEFAULT 'idle',  -- idle|active|complete
  current_item_idx  INT     DEFAULT 0,
  answers           JSONB   DEFAULT '{}',
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- VOICE NOTES ON CHECKLIST ITEMS
-- ─────────────────────────────────────────
CREATE TABLE voice_notes (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id     UUID    REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  item_id           TEXT    NOT NULL,
  audio_url         TEXT    NOT NULL,
  duration_secs     INT,
  transcript        TEXT,   -- auto-transcribed by Gemini
  submitted_by      TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- INDEXES V3
-- ─────────────────────────────────────────
CREATE INDEX idx_custom_items_restaurant ON custom_checklist_items(restaurant_id);
CREATE INDEX idx_custom_items_active     ON custom_checklist_items(restaurant_id, is_active);
CREATE INDEX idx_photo_subs_restaurant   ON checklist_photo_submissions(restaurant_id);
CREATE INDEX idx_photo_subs_item         ON checklist_photo_submissions(item_id);
CREATE INDEX idx_photo_subs_hash         ON checklist_photo_submissions(photo_hash);
CREATE INDEX idx_photo_subs_date         ON checklist_photo_submissions(submitted_at DESC);
CREATE INDEX idx_practice_restaurant     ON practice_sessions(restaurant_id);
CREATE INDEX idx_streaks_restaurant      ON compliance_streaks(restaurant_id);
CREATE INDEX idx_qr_token               ON item_qr_codes(qr_token);

-- ─────────────────────────────────────────
-- RLS V3
-- ─────────────────────────────────────────
ALTER TABLE custom_checklist_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_photo_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_streaks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_qr_codes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes                 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_custom_items"  ON custom_checklist_items      FOR ALL USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));
CREATE POLICY "owner_photos"        ON checklist_photo_submissions  FOR ALL USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));
CREATE POLICY "owner_practice"      ON practice_sessions            FOR ALL USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));
CREATE POLICY "owner_streaks"       ON compliance_streaks           FOR ALL USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));
CREATE POLICY "owner_qr_codes"      ON item_qr_codes                FOR ALL USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));
CREATE POLICY "owner_voice_notes"   ON voice_notes                  FOR ALL USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- ─────────────────────────────────────────
-- SUPABASE STORAGE BUCKET (checklist photo evidence)
-- Run in Supabase SQL editor if the API auto-create step fails
-- ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('checklist-photos', 'checklist-photos', true, 10485760, '{"image/jpeg","image/png","image/webp"}')
ON CONFLICT (id) DO NOTHING;
