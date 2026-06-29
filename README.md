# GradeA v2 — NYC Restaurant Health Inspection Prep

> The most complete restaurant compliance SaaS you can build solo.
> Daily checklists · Live IoT sensors · AI chatbot · Analytics · Document vault · Staff management

---

## 🗂️ Complete Feature List

### 🌡️ Temperature & IoT Sensors
- Live WebSocket dashboard — readings update in real time
- ESP32 + DS18B20 probe integration (~$9 hardware, firmware included)
- Commercial sensor support: Govee, SensorPush, Inkbird (via HTTP ingest)
- Auto-log every reading to temperature history
- Violation detection with instant email + SMS alert
- Battery level monitoring per device
- Sensor API key management

### 📋 Daily Checklists
- 200+ NYC DOH violation criteria (all 8 categories)
- Filtered per cuisine type
- Owner view + staff link (no login for staff)
- Pass / Fail / N/A with notes per item
- Photo documentation per item
- Offline support — background sync when back online (PWA)
- Score 0–100 with trend tracking

### 🔔 Notifications
- In-app notification center with unread badge
- Email alerts via Resend
- SMS alerts via Twilio
- WhatsApp alerts via Twilio
- Web push notifications (PWA)
- Per-type alert preferences
- Mark read / mark all read / delete

### 🤖 AI Features
- AI violation risk report (Gemini 1.5 Flash)
- AI chatbot — full conversation history, NYC DOH expert context
- Fallback report if Gemini unavailable

### 📊 Analytics
- Score trend chart (7 / 14 / 30 / 90 day)
- Most common failure codes
- Staff performance by name (avg score, submissions, pass rate)
- Temperature trend chart
- Predicted DOH grade (A / B / C)
- Current streak counter
- Open corrective actions count

### 👥 Staff Management
- Staff profiles with roles (owner / manager / supervisor / staff)
- Food Protection Certificate tracking
- Certificate expiry alerts
- Expiring certs dashboard

### 📁 Document Vault
- DOH operating permit, Food Protection Certs, PCO reports
- Liquor license, workers comp, insurance certificates
- Expiry date tracking with configurable early-alert window
- Expired documents flagged in red

### ✅ Corrective Actions
- Auto-created from checklist failures or manually
- Status: open → in progress → resolved
- Assign to staff member, set due date
- Before/after photo upload support
- Filter by status

### 🕵️ Inspector Visit Log
- Record every DOH inspection (date, type, grade, score, violations)
- Compare actual vs predicted grade
- Auto-updates restaurant last_grade and last_inspection_date

### 🐀 Pest Control
- PCO visit log with operator name, license number, products used
- Next visit date tracking
- Uploaded PCO report storage

### 📅 Compliance Calendar
- Calendar events for inspections, PCO visits, cert renewals

### 📱 PWA — Install to Phone
- Add to home screen (iOS + Android)
- Offline checklist completion with background sync
- Push notifications
- Native-like experience

---

## ⚡ Quick Start

### 1. Supabase setup
1. Create project at supabase.com
2. SQL Editor → run `supabase/schema.sql` then `supabase/schema_v2.sql`
3. Copy Project URL, anon key, service key, JWT secret

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in all keys
uvicorn main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env   # fill in Supabase URL + anon key
npm run dev
```
Open: http://localhost:5173

### 4. IoT Sensor (optional, ~$9 hardware)
1. Buy: ESP32 DevKit + DS18B20 probe + 4.7kΩ resistor
2. Wire per diagram in `firmware/esp32_gradea.ino`
3. Install Arduino IDE + required libraries (listed in firmware)
4. In GradeA: Settings → Live Sensors → Register Sensor → copy API key
5. Paste API key + WiFi credentials into `firmware/esp32_gradea.ino`
6. Flash to ESP32 → it starts posting readings every 5 minutes

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `restaurants` | Restaurant profiles |
| `checklist_submissions` | Daily checklist results |
| `temperature_logs` | Manual temp entries |
| `violation_reports` | AI-generated risk reports |
| `inspection_history` | NYC Open Data sync |
| `sensors` | IoT device registry |
| `sensor_readings` | Auto-logged IoT data |
| `notifications` | In-app notification feed |
| `alert_settings` | Per-restaurant alert prefs |
| `staff_profiles` | Staff + Food Cert tracking |
| `documents` | Compliance document vault |
| `corrective_actions` | Violation action tracker |
| `inspector_visits` | Real DOH visit log |
| `pest_control_logs` | PCO visit records |
| `chat_messages` | AI chatbot history |
| `calendar_events` | Compliance calendar |
| `checklist_photos` | Photo documentation |

---

## 🌐 All Routes

### Frontend
| Route | Page |
|---|---|
| `/` | Landing / marketing |
| `/login` `/register` | Auth |
| `/onboarding` | Setup wizard |
| `/dashboard` | Main dashboard |
| `/checklist` | Daily checklist (owner) |
| `/staff/:token` | Checklist (staff, no login) |
| `/temperatures` | Temperature log + chart |
| `/sensors` | Live IoT sensor dashboard |
| `/violations` | AI violation risk report |
| `/analytics` | Score trends + staff stats |
| `/notifications` | Notification center |
| `/documents` | Document vault |
| `/staff` | Staff profiles + certs |
| `/corrective` | Corrective action tracker |
| `/visits` | Inspector visit log |
| `/chat` | AI compliance assistant |
| `/settings` | Account + billing + alerts |

### Backend API (all prefixed `/api/`)
```
/restaurants/    /checklists/     /temperatures/
/violations/     /nyc/            /payments/
/sensors/        /notifications/  /analytics/
/staff/          /documents/      /corrective/
/visits/         /chat/           /pest/
```

---

## 💰 Cost Breakdown

| Service | Free Tier | Cost at 100 paying users |
|---|---|---|
| Supabase | 500MB, 50K MAU | $0 |
| Render (backend) | 750h/month | $0–$7/mo |
| Vercel (frontend) | Unlimited | $0 |
| Gemini API | 1M tokens/month | $0 |
| Resend | 3K emails/month | $0–$20/mo |
| Stripe | 2.9% + 30¢ | ~$120/mo fee on $4K MRR |
| Twilio SMS | Pay per use | ~$10/mo |
| Domain | — | $12/year |

**Revenue at 100 paying users ($55 avg): $5,500 MRR**
**Total costs: ~$150/mo**
**Net: ~$5,350 MRR (~97% margin)**

---

## 🔌 IoT Hardware Guide

### Option A: DIY ESP32 (~$9)
```
Parts:
  ESP32 DevKit v1            $5  (amazon.com)
  DS18B20 waterproof probe   $4  (amazon.com)
  4.7kΩ resistor             $0.10

Wiring:
  DS18B20 RED    → ESP32 3.3V
  DS18B20 BLACK  → ESP32 GND
  DS18B20 YELLOW → ESP32 GPIO4
  4.7kΩ resistor between DATA and 3.3V

Firmware: firmware/esp32_gradea.ino
Supports: up to 10 probes on single wire
```

### Option B: Govee H5074 WiFi (~$15)
- Built-in WiFi, free cloud API
- Forward readings to GradeA via Python script
- No soldering required

### Option C: SensorPush HT1 (~$49)
- BLE + cloud, REST API available
- Most accurate, NIST-traceable
- Professional grade for HACCP compliance

---

*Built with React + FastAPI + Supabase + Gemini + Stripe*
*GradeA — Your kitchen is always inspection ready.*
