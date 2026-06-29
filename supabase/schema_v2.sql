-- ============================================================
-- GradeA Schema V2 — Run AFTER schema.sql
-- All new tables for V2 features
-- ============================================================

-- ─────────────────────────────────────────
-- IoT SENSORS
-- ─────────────────────────────────────────
CREATE TABLE sensors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,          -- "Walk-in Fridge", "Prep Station"
  location        TEXT,                   -- Physical location description
  sensor_type     TEXT DEFAULT 'temperature', -- temperature | humidity | door
  api_key         TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  device_id       TEXT,                   -- ESP32 MAC address or device serial
  min_safe        DECIMAL(5,1),
  max_safe        DECIMAL(5,1),
  alert_enabled   BOOLEAN DEFAULT TRUE,
  battery_pct     INT,                    -- 0-100 (if device reports it)
  firmware_version TEXT,
  last_seen_at    TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sensor_readings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensor_id     UUID REFERENCES sensors(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  value         DECIMAL(6,2) NOT NULL,   -- temperature in °F or humidity %
  unit          TEXT DEFAULT 'F',
  is_violation  BOOLEAN DEFAULT FALSE,
  battery_pct   INT,
  rssi          INT,                     -- WiFi signal strength
  read_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,  -- temp_alert|checklist_fail|cert_expiry|inspection_due|pest_due|doc_expiry|corrective
  title           TEXT NOT NULL,
  body            TEXT,
  severity        TEXT DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  data            JSONB DEFAULT '{}',  -- extra data (violation code, sensor id, etc.)
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alert_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE UNIQUE,
  email_enabled   BOOLEAN DEFAULT TRUE,
  sms_enabled     BOOLEAN DEFAULT FALSE,
  push_enabled    BOOLEAN DEFAULT FALSE,
  sms_number      TEXT,
  temp_alerts     BOOLEAN DEFAULT TRUE,
  checklist_alerts BOOLEAN DEFAULT TRUE,
  cert_alerts     BOOLEAN DEFAULT TRUE,
  inspection_alerts BOOLEAN DEFAULT TRUE,
  daily_digest    BOOLEAN DEFAULT TRUE,
  weekly_report   BOOLEAN DEFAULT TRUE,
  push_subscription JSONB,              -- Web Push subscription object
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- STAFF PROFILES
-- ─────────────────────────────────────────
CREATE TABLE staff_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id     UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  role              TEXT DEFAULT 'staff',  -- owner|manager|supervisor|staff
  email             TEXT,
  phone             TEXT,
  food_cert_number  TEXT,                  -- NYC Food Protection Certificate #
  food_cert_issued  DATE,
  food_cert_expires DATE,
  notes             TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  photo_url         TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- DOCUMENT VAULT
-- ─────────────────────────────────────────
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  doc_type        TEXT NOT NULL, -- doh_permit|food_cert|pco_report|liquor_license|workers_comp|insurance|other
  file_url        TEXT,
  file_name       TEXT,
  file_size_kb    INT,
  issued_date     DATE,
  expiry_date     DATE,
  notes           TEXT,
  alert_days_before INT DEFAULT 30,  -- alert N days before expiry
  is_expired      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CORRECTIVE ACTIONS
-- ─────────────────────────────────────────
CREATE TABLE corrective_actions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id    UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  violation_code   TEXT,
  title            TEXT NOT NULL,
  description      TEXT,
  severity         TEXT DEFAULT 'general' CHECK (severity IN ('critical','general')),
  status           TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','wont_fix')),
  assigned_to      TEXT,
  due_date         DATE,
  before_photo_url TEXT,
  after_photo_url  TEXT,
  resolution_note  TEXT,
  resolved_at      TIMESTAMPTZ,
  source           TEXT DEFAULT 'checklist', -- checklist|sensor|manual|inspector
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- INSPECTOR VISITS
-- ─────────────────────────────────────────
CREATE TABLE inspector_visits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  visit_date      DATE NOT NULL,
  inspector_name  TEXT,
  inspection_type TEXT DEFAULT 'routine', -- routine|reinspection|complaint|monitoring
  grade_received  TEXT,
  score           INT,
  violations_found JSONB DEFAULT '[]', -- [{code, description, points, critical}]
  total_violations INT DEFAULT 0,
  critical_violations INT DEFAULT 0,
  notes           TEXT,
  follow_up_date  DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- PEST CONTROL LOG
-- ─────────────────────────────────────────
CREATE TABLE pest_control_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  visit_date      DATE NOT NULL,
  operator_name   TEXT NOT NULL,
  company_name    TEXT,
  license_number  TEXT,
  treatment_type  TEXT,                -- spray|bait|trap|fumigation|inspection
  areas_treated   JSONB DEFAULT '[]', -- ["kitchen","storage","bathroom"]
  findings        TEXT,               -- what was found
  products_used   JSONB DEFAULT '[]', -- [{name, epa_reg, amount}]
  next_visit_date DATE,
  report_url      TEXT,               -- uploaded PCO report
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- AI CHATBOT HISTORY
-- ─────────────────────────────────────────
CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- MULTIPLE LOCATIONS
-- ─────────────────────────────────────────
CREATE TABLE locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  borough         TEXT,
  cuisine_type    TEXT,
  camis_id        TEXT,
  last_grade      TEXT,
  last_inspection_date DATE,
  staff_token     TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_primary      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CHECKLIST PHOTO EVIDENCE
-- ─────────────────────────────────────────
CREATE TABLE checklist_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  submission_id   UUID REFERENCES checklist_submissions(id) ON DELETE CASCADE,
  violation_code  TEXT NOT NULL,
  photo_url       TEXT NOT NULL,
  caption         TEXT,
  uploaded_by     TEXT,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- COMPLIANCE CALENDAR EVENTS
-- ─────────────────────────────────────────
CREATE TABLE calendar_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  event_type      TEXT NOT NULL, -- inspection|pco|cert_renewal|doc_renewal|equipment|cleaning
  event_date      DATE NOT NULL,
  notes           TEXT,
  is_recurring    BOOLEAN DEFAULT FALSE,
  recur_days      INT,           -- repeat every N days
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- INDEXES V2
-- ─────────────────────────────────────────
CREATE INDEX idx_sensors_restaurant      ON sensors(restaurant_id);
CREATE INDEX idx_sensor_readings_sensor  ON sensor_readings(sensor_id);
CREATE INDEX idx_sensor_readings_time    ON sensor_readings(read_at DESC);
CREATE INDEX idx_notifications_restaurant ON notifications(restaurant_id);
CREATE INDEX idx_notifications_unread    ON notifications(restaurant_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_staff_restaurant        ON staff_profiles(restaurant_id);
CREATE INDEX idx_documents_restaurant    ON documents(restaurant_id);
CREATE INDEX idx_corrective_restaurant   ON corrective_actions(restaurant_id);
CREATE INDEX idx_corrective_status       ON corrective_actions(status);
CREATE INDEX idx_visits_restaurant       ON inspector_visits(restaurant_id);
CREATE INDEX idx_pco_restaurant          ON pest_control_logs(restaurant_id);
CREATE INDEX idx_chat_restaurant         ON chat_messages(restaurant_id);
CREATE INDEX idx_calendar_restaurant     ON calendar_events(restaurant_id);
CREATE INDEX idx_calendar_date           ON calendar_events(event_date);

-- ─────────────────────────────────────────
-- RLS POLICIES V2
-- ─────────────────────────────────────────
ALTER TABLE sensors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspector_visits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pest_control_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_photos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events      ENABLE ROW LEVEL SECURITY;

-- Helper: owner can access rows tied to their restaurant
CREATE OR REPLACE FUNCTION own_restaurant_ids(uid UUID)
RETURNS SETOF UUID AS $$
  SELECT id FROM restaurants WHERE owner_id = uid
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Sensors
CREATE POLICY "owner_sensors" ON sensors FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- Sensor readings
CREATE POLICY "owner_readings" ON sensor_readings FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- Notifications
CREATE POLICY "owner_notifications" ON notifications FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- Alert settings
CREATE POLICY "owner_alert_settings" ON alert_settings FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- Staff
CREATE POLICY "owner_staff" ON staff_profiles FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- Documents
CREATE POLICY "owner_documents" ON documents FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- Corrective actions
CREATE POLICY "owner_corrective" ON corrective_actions FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- Inspector visits
CREATE POLICY "owner_visits" ON inspector_visits FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- Pest control
CREATE POLICY "owner_pco" ON pest_control_logs FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- Chat
CREATE POLICY "owner_chat" ON chat_messages FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- Photos
CREATE POLICY "owner_photos" ON checklist_photos FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));

-- Calendar
CREATE POLICY "owner_calendar" ON calendar_events FOR ALL
  USING (restaurant_id IN (SELECT own_restaurant_ids(auth.uid())));
