# Hello Ride — AOT Smart Taxi Ecosystem

> Academic prototype · MADT7104 · Suvarnabhumi Airport (BKK)  
> React/Vite frontend (primary) + Python ML/data layer (backend utilities)

---

## Project Overview

Hello Ride is a **proactive airport taxi dispatch platform** that reduces Passenger Wait Time (PWT) at Suvarnabhumi Airport by detecting upcoming demand waves and triggering dispatch controls before passengers reach the curb.

The system has three operating surfaces that work together:

| Surface | Role |
|---|---|
| **OPS Control Tower** | **Graded deliverable** — live monitoring, AI advisory, dispatch controls |
| Passenger Portal | Booking flow; status updates propagate to OPS and Driver in real-time |
| Driver App | Onboarding, queue management, job offer acceptance, trip navigation |

**Primary KPI:** Average PWT reduced from **30–60 min** → below **15 min** through proactive, signal-driven taxi allocation.

---

## Current Architecture

**Active UI = React/Vite (`presentation-ui/`).** All UI changes to OPS Dashboard, Passenger Portal, and Driver App must be made in the React/Vite frontend.

Python is used for ML inference, DB access, AI advisory, and rule engine logic. Streamlit pages remain as a legacy/prototype surface.

```
                ┌──────────────────────────────────┐
  DATA          │  rawdata.*  (Supabase Postgres)   │
  LAYER         │  flight_instances · demand_signals │
                │  taxi_supply · driver_dispatch     │
                └────────────┬─────────────────────-┘
                             │
                ┌────────────▼─────────────────────-┐
  ML / AI       │  XGBoost — PWT prediction          │
                │  XGBoost — SLA breach risk         │
                │  Gemini 2.0 Flash — OPS advisory   │
                │  Rule engine — severity + actions  │
                └────────────┬─────────────────────-┘
                             │
                ┌────────────▼─────────────────────-┐
  REACT UI      │  OPS Dashboard (bilingual EN/TH)   │
                │  Passenger Portal (status screens) │
                │  Driver App (state machine)        │
                │  localStorage cross-tab sync       │
                └──────────────────────────────────-┘
```

**Anchor time (`effective_now`):** All time-window queries anchor to `max(captured_at_local)` from rawdata, not the DB clock — so historical CSV uploads are always treated as current data.

---

## AI & ML Features

| Feature | Technology | File |
|---|---|---|
| PWT prediction (minutes) | XGBoost Regressor | `utils/ml_predictor.py` |
| SLA breach risk (0–1 probability) | XGBoost Classifier | `utils/ml_predictor.py` |
| OPS advisory chat | Gemini 2.0 Flash + rule-based fallback | `utils/ai_advisory.py` |
| Severity classification | Threshold rule engine | `presentation-ui/src/lib/businessLogic.js` |
| Demand-supply forecast (3 hr) | mart aggregation | `mart.demand_supply_forecasts` |
| Arrival wave analysis | Flight + demand signal join | `utils/ai_advisory.py` |
| Edge case detection (chat) | Keyword protocol matcher | `presentation-ui/src/lib/protocolMatcher.js` |

**PWT Severity Bands:**

| PWT | Band | Action |
|---|---|---|
| ≤ 15 min | NORMAL | No action needed |
| ≤ 20 min | WATCH | Monitor only |
| ≤ 30 min | WARNING | Recommend Send Incentive + Broadcast (OPS approval required) |
| > 30 min | CRITICAL | Recommend Broadcast + Max Incentive (OPS manual approval) |

---

## Driver–Passenger Matching System

Matching mode escalates automatically with PWT severity:

| PWT | Matching Mode | Algorithm |
|---|---|---|
| ≤ 20 min | Normal Matching | FCFS + Capacity Fit |
| 20–30 min | Priority Matching | Queue Order + ETA + Capacity Fit |
| > 30 min | Critical Matching | Longest Wait + Low ETA + High Acceptance Rate + Capacity Fit |

**Dispatch Mode** (OPS selectable):
- **Auto Dispatch** — passenger books → immediately assigned
- **OPS Priority Dispatch** — passenger books → waits for OPS to run matching manually

**Cross-tab sync:** OPS Dashboard, Driver App, and Passenger Portal share state via localStorage (`helloride_activeTrip`, `helloride_opsAction`). A `storage` event listener propagates updates across browser tabs in real-time without refresh.

**Trip status machine:** `idle → booked → assigned → accepted → arrived → completed`

---

## MVP vs Prototype

| Capability | Status |
|---|---|
| OPS monitoring dashboard + KPI tiles | ✅ |
| AI Advisory chat (Gemini + fallback) | ✅ |
| PWT prediction + breach risk (XGBoost) | ✅ (inference via `utils/ml_predictor.py`) |
| Demand-supply forecast (3-hour horizon) | ✅ |
| Bilingual OPS Dashboard (EN/TH) | ✅ |
| Passenger booking flow (end-to-end) | ✅ |
| Passenger real-time status screens | ✅ (assigned/accepted/arrived/completed) |
| Driver onboarding + dispatch accept | ✅ |
| Supabase DB integration (rawdata/mart) | ✅ |
| Cross-tab state sync (localStorage) | ✅ |
| Edge case protocol detection (chat) | ✅ |
| Real-time flight API ingestion | Phase 2 |
| Production split per stakeholder | Phase 3 |

---

## 2-Minute Demo Script

```bash
cd presentation-ui
npm install
npm run dev
# opens at http://localhost:5173
```

**Recommended demo order (3 browser tabs):**

1. **Tab 1 — OPS Dashboard** (`/ops`)
   - Switch terminal T1 / T2 / All; observe PWT gauge and severity band change.
   - Review AI Situation Brief, forecast chart, arrival wave, deficit breakdown.
   - Set Dispatch Mode → **OPS Priority Dispatch**.
   - Proceed after booking in Tab 2.

2. **Tab 2 — Passenger Portal** (`/passenger`)
   - Enter destination → select passengers/luggage → choose ride → book.
   - Status changes from booking form → spinner → driver info (no refresh needed).

3. **Tab 3 — Driver App** (`/driver`)
   - Login: `driver_demo` / `1234` → face scan → go online.
   - Accept the job offer → navigate → confirm payment.
   - Tab 2 updates in real-time as driver status changes.

4. **Back to Tab 1 — OPS**
   - Click **Run Priority Dispatch** → observe Passenger Queue and Driver Pool.
   - Approve dispatch action in CRITICAL mode to test full escalation path.

---

## Local Setup

**Requires Python 3.11.**

```bash
# Clone
git clone <repo-url> && cd hello-ride-platform

# Python layer
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Secrets
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
# Edit .streamlit/secrets.toml

# React/Vite frontend (primary UI)
cd presentation-ui
npm install
npm run dev   # http://localhost:5173

# Streamlit (legacy prototype surface)
cd ..
streamlit run app.py   # http://localhost:8501
```

---

## Secrets Configuration

Edit `.streamlit/secrets.toml` — **never commit this file**.

```toml
# Required for DB features
DATABASE_URL = "postgresql://postgres.XXXX:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres"

# Optional — Supabase client
SUPABASE_URL      = "https://your-project.supabase.co"
SUPABASE_ANON_KEY = "your-anon-key"

# Optional — AI Advisory
GEMINI_API_KEY = "your-gemini-api-key"
GEMINI_MODEL   = "gemini-2.0-flash"
AI_MODE        = "auto"   # auto | gemini | mock
```

The app **never** displays `DATABASE_URL`, host, username, or DB name in the UI.

---

## Data Model

### `rawdata` schema — source of truth

> All `*_local` columns are **stored as UTC**. Every query must convert:  
> `(field AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'`

| Table | Key field | Purpose |
|---|---|---|
| `flight_instances` | `est_arrival_local` | Arrival wave; primary `effective_now` source |
| `passenger_demand_signals` | `created_at_local` | Demand rollup (last 20 min) |
| `taxi_supply_snapshots` | `captured_at_local` | Supply telemetry; top-priority `effective_now` |
| `driver_dispatch_events` | `created_at_local` | Dispatch history; AI advisory context |
| `flights_raw` | `sched_arrival_local` | Raw flight feed |
| `weather_raw` | `captured_at_local` | Weather widget |

### `mart` schema — aggregation layer

| Table | Purpose |
|---|---|
| `ops_kpi_snapshots` | KPI tiles (PWT, pax, taxis) |
| `demand_supply_forecasts` | Forecast chart (next 3 hr, 15-min buckets) |
| `ops_ai_chat_messages` | AI Advisory chat history |

---

## Loading Data

1. Export CSV (UTF-8); timestamps in **local Bangkok time**, matching schema field names.
2. Upload via Supabase Table Editor or:
   ```sql
   COPY rawdata.flight_instances FROM '/path/to/file.csv' CSV HEADER;
   ```
3. Run mart aggregation SQL to populate `mart.*` tables.
4. In the OPS dashboard click **↻ Refresh**.

---

## Troubleshooting

### Charts don't change after DB connect
- `mart.ops_kpi_snapshots` or `mart.demand_supply_forecasts` may be empty — the UI shows an explicit warning for each.
- Toggle **Debug DB** in the OPS panel to inspect `effective_now`, per-table timestamps, and per-query row counts.
- Click **↻ Refresh** to clear the 20-second query cache.

### Password authentication failed
- Reset DB password in Supabase → Database → Settings → Reset database password.
- Re-copy the full `DATABASE_URL` string and restart the Streamlit process.

> ถ้าขึ้น "password authentication failed" ให้ reset password ใน Supabase แล้ว copy DATABASE_URL ใหม่ทั้ง string แล้วค่อย restart

### Gemini quota exhausted or SSL error
- App automatically falls back to rule-based advisory — no action needed.
- To force mock mode: set `AI_MODE = "mock"` in `secrets.toml`.

### Syntax check
```bash
python3 -m compileall app.py pages components data utils
```

---

## Repository Layout

```
hello-ride-platform/
├── presentation-ui/          # React/Vite — PRIMARY frontend
│   ├── src/
│   │   ├── pages/            # OPSDashboard, PassengerPortal, DriverApp
│   │   ├── components/       # shared/, passenger/, ops/, driver/
│   │   ├── context/          # DemoMatchingContext, LanguageContext
│   │   ├── data/             # mockOps.js, helloride_dashboard_data.json
│   │   ├── i18n/             # dictionary.js (EN/TH)
│   │   └── lib/              # businessLogic.js, protocolMatcher.js
│   └── package.json
├── pages/                    # Streamlit pages (legacy prototype)
├── components/               # Streamlit component library
├── data/                     # Python mock data
├── utils/                    # Python utilities
│   ├── ai_advisory.py        # Gemini + fallback advisory
│   ├── ml_predictor.py       # XGBoost PWT + breach risk
│   ├── rule_engine.py        # Rule evaluation → RuleAction list
│   ├── actions.py            # Dispatch event writeback
│   └── db.py                 # DB connection + effective_now
├── docs/                     # Architecture, flow docs, SQL schemas
├── models/                   # XGBoost .joblib model artifacts
└── app.py                    # Streamlit entry point
```

---

## Team Contribution Split

| Workstream | Owner area | Key files |
|---|---|---|
| OPS / UI | Monitoring dashboard, dispatch controls | `presentation-ui/src/pages/OPSDashboard.jsx` |
| Passenger | Booking, status screens, support chat | `presentation-ui/src/pages/PassengerPortal.jsx` |
| Driver | Onboarding, job offer, trip flow | `presentation-ui/src/pages/DriverApp.jsx` |
| DB / Data | Schema, CSV ingestion, mart SQL | `utils/db.py`, `docs/*.sql` |
| AI / ML | Gemini advisory, XGBoost inference, rule engine | `utils/ai_advisory.py`, `utils/ml_predictor.py`, `utils/rule_engine.py` |

---

## Roadmap

| Phase | Scope |
|---|---|
| **Phase 1** (this repo) | React/Vite UI, Python ML utilities, Supabase backend, bilingual support, cross-tab sync |
| **Phase 2** | Real-time flight API webhooks; API bridge React → Python ML inference; BigQuery `ml_features` pipeline |
| **Phase 3** | Production split — separate secured apps per stakeholder, OPS on internal network only |

---

## Demo Credentials

| Surface | Username | Password |
|---|---|---|
| Driver login | `driver_demo` | `1234` |

Credentials are pre-filled on the login screen automatically.

---

## Disclaimer

Academic prototype (MADT7104). All default data is static mock data — it does not represent real airport operations, real passengers, or real drivers. Not for production use.
