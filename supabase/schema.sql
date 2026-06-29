-- ============================================================
-- GradeA — Supabase PostgreSQL Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- RESTAURANTS
-- ─────────────────────────────────────────
CREATE TABLE restaurants (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  address               TEXT,
  borough               TEXT CHECK (borough IN ('Manhattan','Brooklyn','Queens','Bronx','Staten Island')),
  cuisine_type          TEXT NOT NULL DEFAULT 'american',
  seating_capacity      INT DEFAULT 0,
  staff_count           INT DEFAULT 0,
  equipment             JSONB DEFAULT '[]',        -- ["walk_in_fridge","fryer","hood_system"]
  camis_id              TEXT,                       -- NYC DOH unique restaurant ID
  last_grade            TEXT CHECK (last_grade IN ('A','B','C','N','Z','P')),
  last_inspection_date  DATE,
  next_inspection_est   DATE,
  staff_token           TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  plan                  TEXT DEFAULT 'trial' CHECK (plan IN ('trial','starter','pro')),
  trial_ends_at         TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CHECKLIST SUBMISSIONS
-- ─────────────────────────────────────────
CREATE TABLE checklist_submissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  submitted_by    TEXT NOT NULL DEFAULT 'Owner',
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  date            DATE DEFAULT CURRENT_DATE,
  checklist_data  JSONB NOT NULL DEFAULT '{}',
  -- { "04A": { "status": "pass"|"fail"|"na", "note": "", "photo_url": "" }, ... }
  score           INT DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  items_total     INT DEFAULT 0,
  items_passed    INT DEFAULT 0,
  items_failed    INT DEFAULT 0,
  open_issues     JSONB DEFAULT '[]'   -- list of failed violation codes
);

-- ─────────────────────────────────────────
-- TEMPERATURE LOGS
-- ─────────────────────────────────────────
CREATE TABLE temperature_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  item_name       TEXT NOT NULL,
  location        TEXT DEFAULT 'Kitchen',
  temp_value      DECIMAL(5,1) NOT NULL,
  unit            TEXT DEFAULT 'F' CHECK (unit IN ('F','C')),
  min_safe        DECIMAL(5,1),
  max_safe        DECIMAL(5,1),
  is_violation    BOOLEAN DEFAULT FALSE,
  logged_by       TEXT DEFAULT 'Staff',
  notes           TEXT,
  logged_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- VIOLATION RISK REPORTS (AI Generated)
-- ─────────────────────────────────────────
CREATE TABLE violation_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  risks           JSONB NOT NULL DEFAULT '[]',
  -- [{rank, violation_code, title, description, severity, estimated_fine, fix_steps, check_frequency}]
  cuisine_type    TEXT,
  borough         TEXT,
  model_used      TEXT DEFAULT 'gemini-1.5-flash'
);

-- ─────────────────────────────────────────
-- INSPECTION HISTORY (from NYC Open Data)
-- ─────────────────────────────────────────
CREATE TABLE inspection_history (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id     UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  inspection_date   DATE,
  action            TEXT,
  violation_code    TEXT,
  violation_description TEXT,
  score             INT,
  grade             TEXT,
  grade_date        DATE,
  inspection_type   TEXT,
  synced_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- ALERT LOGS
-- ─────────────────────────────────────────
CREATE TABLE alert_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  alert_type      TEXT NOT NULL,  -- 'temp_violation','inspection_reminder','checklist_incomplete'
  message         TEXT,
  sent_to         TEXT,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  read_at         TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────
ALTER TABLE restaurants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE temperature_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE violation_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_logs           ENABLE ROW LEVEL SECURITY;

-- Restaurants: owners can only see their own
CREATE POLICY "owner_select_restaurant"  ON restaurants FOR SELECT  USING (auth.uid() = owner_id);
CREATE POLICY "owner_insert_restaurant"  ON restaurants FOR INSERT  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner_update_restaurant"  ON restaurants FOR UPDATE  USING (auth.uid() = owner_id);
CREATE POLICY "owner_delete_restaurant"  ON restaurants FOR DELETE  USING (auth.uid() = owner_id);

-- Checklist submissions: owner can see; staff_token bypassed via backend service role
CREATE POLICY "owner_select_submissions" ON checklist_submissions FOR SELECT
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "owner_insert_submissions" ON checklist_submissions FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Temperature logs
CREATE POLICY "owner_select_temps" ON temperature_logs FOR SELECT
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "owner_insert_temps" ON temperature_logs FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "owner_delete_temps" ON temperature_logs FOR DELETE
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Violation reports
CREATE POLICY "owner_select_reports" ON violation_reports FOR SELECT
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Inspection history
CREATE POLICY "owner_select_inspections" ON inspection_history FOR SELECT
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Alert logs
CREATE POLICY "owner_select_alerts" ON alert_logs FOR SELECT
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX idx_restaurants_owner      ON restaurants(owner_id);
CREATE INDEX idx_restaurants_token      ON restaurants(staff_token);
CREATE INDEX idx_submissions_restaurant ON checklist_submissions(restaurant_id);
CREATE INDEX idx_submissions_date       ON checklist_submissions(date);
CREATE INDEX idx_temp_logs_restaurant   ON temperature_logs(restaurant_id);
CREATE INDEX idx_temp_logs_logged_at    ON temperature_logs(logged_at DESC);
CREATE INDEX idx_reports_restaurant     ON violation_reports(restaurant_id);
CREATE INDEX idx_reports_generated      ON violation_reports(generated_at DESC);
