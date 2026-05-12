# Hello Ride — AOT Smart Taxi Ecosystem

> Academic prototype · MADT7104 · Suvarnabhumi Airport (BKK) · React/Vite frontend + Python ML/data layer

---

## Project Overview

Hello Ride delivers an **internal Airport Taxi Dispatch Operations Console** that reduces Passenger Wait Time (PWT) by detecting upcoming demand waves and triggering actionable dispatch controls.

## Current Architecture Decision

**Active UI = React/Vite (`presentation-ui/`)**. OPS Dashboard, Passenger Portal, and Driver App UI changes must be made in the React/Vite frontend first.

Python is used for backend-side logic, ML utilities, data access, and optional API bridges. Streamlit pages remain useful as a legacy/prototype surface, but they are not the primary frontend.

To show real ML predictions in the OPS Dashboard:
- React must render the card/component.
- React must call a backend/API bridge.
- The backend/API bridge calls the Python ML utility, e.g. `utils/ml_predictor.py`.

| Surface | Role |
|---|---|
| **OPS Control Tower** | **Graded deliverable** — the core dispatch workflow |
| Passenger Portal | UI prototype; shows how booking decisions propagate to OPS |
| Driver App | UI prototype; shows how dispatch offers reach drivers |

**Primary KPI:** Average PWT reduced from the current **30–60 minutes** → below **15 minutes** through proactive, signal-driven taxi allocation.

| Attribute | Detail |
|---|---|
| Database | Supabase (`rawdata` schema) + BigQuery (`ml_features` / `data_source`) |
| Time granularity | 15-minute buckets |
| Dataset size | 17,472 rows / 182 days |
| ML models (Phase 2) | XGBoost Regressor — `avg_wait_min`; XGBoost Classifier — `is_pwt_breach_15m` |

> **ทุก Stream ต้อง read จาก `rawdata.*` เป็น source of truth** — mart tables are derived aggregations only.

---

## Problem Statement

Peak-hour queues at BKK regularly push **Passenger Wait Time (PWT) above 15 minutes**. The root cause is reactive dispatching: taxis are summoned only after passengers arrive at the curb, leaving no time to pre-position supply. Hello Ride shifts the system to **proactive dispatch** — capturing demand signals (flight arrivals, QR scans, weather) and mobilising supply before passengers exit the terminal.

**Goal:** reduce average PWT below the 10-minute guardrail through signal-driven, pre-emptive taxi allocation.

---

## MVP vs Prototype

| Capability | MVP (this repo) | Prototype only |
|---|---|---|
| OPS monitoring dashboard + KPI tiles | ✅ | |
| AI Advisory chat (Gemini + fallback) | ✅ | |
| Passenger booking flow (end-to-end) | ✅ | |
| Driver onboarding + dispatch accept | ✅ | |
| Supabase DB integration (rawdata/mart) | ✅ | |
| Real-time flight API ingestion | | ✅ Phase 2 |
| ML-based PWT prediction (XGBoost/LSTM) | | ✅ Phase 2 |
| Separate secured production apps | | ✅ Phase 3 |

---

## 2-Minute Demo Script (for graders)

Run the active React/Vite UI:

```bash
cd presentation-ui
npm install
npm run dev
```

Open `http://localhost:5173`, then follow this order:

1. **OPS Control Tower** (nav → OPS Dashboard)
   - Review the PWT gauge, flight wave table, demand signals, and supply telemetry for Terminal T1.
   - Review AI advisory, deficit risk, forecast chart, and action controls.
   - If real ML inference is enabled, the React UI should call the Python/API bridge and render ML prediction output.
2. **Passenger Portal** (nav → Passenger)
   - Enter a destination → select passengers/luggage → choose ride type → pay → submit review.
3. **Driver App** (nav → Driver)
   - Log in: `driver_demo` / `1234` → complete face-scan onboarding → go online → accept the job offer → navigate trip → confirm payment.

---

## Architecture

```
                ┌─────────────────────────────┐
  INGESTION     │  flight_instances  flights_raw│
  (rawdata.*)   │  demand_signals  taxi_supply  │
                │  driver_dispatch  weather_raw │
                └────────────┬────────────────-┘
                             │
                ┌────────────▼────────────────-┐
  SENSING       │  OPS Live Monitoring          │
                │  · PWT gauge  · demand table  │
                │  · flight wave · supply telem │
                └────────────┬────────────────-┘
                             │
                ┌────────────▼────────────────-┐
  PREDICTION    │  mart.ops_kpi_snapshots       │
                │  mart.demand_supply_forecasts │
                │  (aggregated from rawdata)    │
                └────────────┬────────────────-┘
                             │
                ┌────────────▼────────────────-┐
  ACTION        │  AI Advisory (Gemini/fallback)│
                │  · Broadcast to drivers       │
                │  · Extra lane activation      │
                │  · Dispatch job offers        │
                └─────────────────────────────-┘
```

**Anchor time (`effective_now`):** All OPS time-window queries are anchored to the latest available rawdata timestamp, not the DB clock. This ensures historical CSV uploads are always treated as current data — the system picks `max(captured_at_local)` from rawdata tables as the reference point.

---

## Stakeholder Modules

### OPS Control Tower (`presentation-ui/src/pages/OPSDashboard.jsx`)
- Live Monitoring: PWT gauge, flight wave (next 60 min), demand signals (last 20 min), supply telemetry
- KPI tiles: PWT, waiting passengers, active taxis — sourced from `mart.ops_kpi_snapshots`
- Forecast chart: demand vs supply — sourced from `mart.demand_supply_forecasts`
- AI Advisory: rendered in React; real Gemini/fallback behavior requires a backend/API bridge to Python
- ML Prediction: render in React; real XGBoost inference requires a backend/API bridge to `utils/ml_predictor.py`
- Controls: guardrail threshold, broadcast to drivers, extra lane toggle, terminal selector (T1/T2/All)

### Passenger Portal (`presentation-ui/src/pages/PassengerPortal.jsx`)
Destination input → ride type + payment selection → booking confirmation → star rating + tip + review

### Driver App (`presentation-ui/src/pages/DriverApp.jsx`)
Login → registration → face-scan verification → approval status → online toggle → job offer (countdown) → trip navigation → payment confirmation

---

## Data Model

### `rawdata` schema — ingestion layer (source of truth)

> All `*_local` timestamp columns are **stored as UTC** despite the `_local` suffix.  
> Every query that needs Bangkok time must convert: `(field AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'`

| Table | Key timestamp field | Purpose |
|---|---|---|
| `flight_instances` | `est_arrival_local` | Flight wave table; primary `effective_now` source |
| `flights_raw` | `scheduled_arrival_local` | Raw flight feed before normalisation |
| `passenger_demand_signals` | `created_at_local` | Demand signal table; `effective_now` fallback |
| `taxi_supply_snapshots` | `captured_at_local` | Supply telemetry; top-priority `effective_now` source |
| `driver_dispatch_events` | `created_at_local` | Dispatch event counts |
| `weather_raw` | `captured_at_local` | Weather widget |

### `mart` schema — aggregation layer

| Table | Purpose | If empty |
|---|---|---|
| `ops_kpi_snapshots` | KPI tiles (PWT, pax, taxis) | Tiles show 0; yellow warning banner |
| `demand_supply_forecasts` | Forecast chart (next 3 hr) | Chart blank; yellow warning banner |
| `ops_ai_chat_messages` | AI Advisory chat history | Advisory still works; no history shown |

> After uploading rawdata CSVs, run your aggregation SQL to populate `mart.*` tables. The OPS page warns explicitly when mart tables are empty.

---

## Local Setup

**Requires Python 3.11.**

```bash
# Clone
git clone <repo-url> && cd hello-ride-platform

# Virtual environment
python3.11 -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

# Dependencies
pip install -r requirements.txt

# Secrets (see next section)
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
# Edit .streamlit/secrets.toml

# Run
streamlit run app.py
```

Opens at `http://localhost:8501`. The app runs fully on mock data if no DB secrets are set.

---

## Secrets Configuration

Edit `.streamlit/secrets.toml` — **never commit this file**.

```toml
# Required for DB features
# Copy the full Transaction Pooler string from Supabase → Database → Connect (port 6543)
DATABASE_URL = "postgresql://postgres.XXXX:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres"

# Optional — Supabase client (future realtime use)
SUPABASE_URL      = "https://your-project.supabase.co"
SUPABASE_ANON_KEY = "your-anon-key"

# Optional — AI Advisory
GEMINI_API_KEY = "your-gemini-api-key"
GEMINI_MODEL   = "gemini-2.0-flash"
AI_MODE        = "auto"   # auto | gemini | mock
```

The app **never** displays `DATABASE_URL`, host, username, or DB name in the UI. Only "Connected / Not connected" and the connection source type (`DATABASE_URL` or `DB_*`) are shown.

---

## Loading Data

1. Export your Excel sheet as **CSV (UTF-8)**.
2. Ensure timestamp columns use **local Bangkok time** (no UTC offset) and match schema field names (e.g. `est_arrival_local`, `captured_at_local`).
3. Upload via Supabase **Table Editor → Import CSV**, or via SQL:
   ```sql
   COPY rawdata.flight_instances FROM '/path/to/file.csv' CSV HEADER;
   ```
4. Run mart aggregation SQL to populate `mart.ops_kpi_snapshots` and `mart.demand_supply_forecasts`.
5. In the OPS dashboard click **↻ Refresh** to reload.

---

## Troubleshooting

### DB connected but charts don't change
- `mart.ops_kpi_snapshots` or `mart.demand_supply_forecasts` may be empty — the UI shows an explicit yellow warning for each.
- Toggle **Debug DB** in the OPS control panel to see:
  - `effective_now` — the anchor timestamp (max of rawdata) used by all time-window queries
  - Per-table max timestamps — confirms whether uploaded rows fall inside query windows
  - Per-query row counts — shows exactly how many rows each query returned
- If `effective_now` looks wrong, check that your CSV timestamps are in local time, not UTC.
- Click **↻ Refresh** to clear the 20-second query cache.

### Password authentication failed
- Reset your DB password in Supabase → **Database → Settings → Reset database password**.
- Re-copy the full `DATABASE_URL` connection string (password is embedded in the URL).
- Restart the Python backend/prototype process that is using the database connection.

> **Thai note:** ถ้าขึ้น "password authentication failed" ให้ reset password ใน Supabase แล้ว copy DATABASE_URL ใหม่ทั้ง string แล้วค่อย restart

### Gemini quota exhausted or SSL error
- The app automatically falls back to rule-based advisory responses — no manual action needed.
- To force mock mode permanently, set `AI_MODE = "mock"` in `secrets.toml`.

### Syntax check
```bash
python3 -m compileall app.py pages components data utils
```

---

## Deployment

Primary deployment should serve the React/Vite frontend from `presentation-ui/`.

1. Build or deploy the React/Vite app from `presentation-ui/`.
2. Keep secrets on the backend/API side only; do not expose database URLs or model internals to React.
3. If real ML/Gemini/Supabase behavior is needed, deploy a backend/API bridge that calls the Python utilities.
4. Streamlit Cloud deployment is optional for the legacy/prototype surface only.

---

## Team Contribution Split

| Workstream | Owner area | Key files |
|---|---|---|
| OPS / UI | Monitoring dashboard, controls | `presentation-ui/src/pages/OPSDashboard.jsx`, `presentation-ui/src/components/ops/` |
| Passenger | Booking and review flow | `presentation-ui/src/pages/PassengerPortal.jsx`, `presentation-ui/src/components/passenger/` |
| Driver | Onboarding and dispatch flow | `presentation-ui/src/pages/DriverApp.jsx`, `presentation-ui/src/components/driver/` |
| DB / Data | Schema, CSV ingestion, mart SQL | `utils/db.py`, `docs/`, SQL schema files |
| AI / ML backend | Gemini prompts, fallback logic, ML inference utility | `utils/ai_advisory.py`, `utils/ml_predictor.py` |

---

## Roadmap

| Phase | Scope |
|---|---|
| **Phase 1** (this repo) | React/Vite active frontend, Python data/ML utilities, Supabase backend, mock-data fallback |
| **Phase 2** | Real-time ingestion (flight API webhooks, QR scan stream); API bridge from React to Python ML inference; ML PWT prediction: **XGBoost Regressor** (`avg_wait_min`) + **XGBoost Classifier** (`is_pwt_breach_15m`); BigQuery `ml_features` pipeline |
| **Phase 3** | Production split — separate secured apps per stakeholder, OPS on internal network only |

---

## Demo Credentials

| Surface | Username | Password |
|---|---|---|
| Driver login | `driver_demo` | `1234` |

Credentials are pre-filled on the login screen automatically.

---

## Active Frontend (React + Vite)

The user-facing frontend is built with React + Vite + Tailwind CSS in `presentation-ui/`. OPS Dashboard, Passenger Portal, and Driver App UI work should start here.

Current React screens can run with mock data. Real ML, Gemini, and Supabase-backed behavior should be exposed through a backend/API bridge that calls Python utilities and data logic.

```bash
cd presentation-ui
npm install
npm run dev    # opens at http://localhost:5173
```

Three pages:
- **OPS Dashboard** — KPI cards, demand vs supply chart, deficit alert, action buttons, AI advisory
- **Passenger Portal** — 3-step booking flow: destination → vehicle → e-ticket
- **Driver App** — Queue status, demand wave alert, incentive, job acceptance

| Layer | Command | Purpose |
|---|---|---|
| React/Vite frontend | `cd presentation-ui && npm run dev` | Active user-facing UI |
| Python layer | `python3 -m compileall app.py pages components data utils` | Backend/data/ML utility validation |
| Streamlit app | `streamlit run app.py` | Legacy/prototype surface, not the primary UI |

---

## Disclaimer

Academic prototype (MADT7104). All default data is static mock data — it does not represent real airport operations, real passengers, or real drivers. Not for production use.
