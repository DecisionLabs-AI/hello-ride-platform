# Hello Ride Platform — Architecture

## Overview

Hello Ride is a proactive airport taxi dispatch platform for Suvarnabhumi Airport (BKK). It shifts the system from reactive dispatching (summon taxis after passengers arrive) to signal-driven pre-positioning (mobilise supply before passengers exit the terminal).

The platform has two active layers:

| Layer | Technology | Role |
|---|---|---|
| **React/Vite frontend** | React 18 + Vite + Tailwind CSS | Primary user-facing UI (OPS, Passenger, Driver) |
| **Python backend utilities** | Python 3.11 + Streamlit | ML inference, DB access, AI advisory, rule engine |

---

## Tech Stack

### React/Vite Frontend (`presentation-ui/`)

| Layer | Technology |
|---|---|
| UI framework | React 18 + Vite |
| Styling | Tailwind CSS v3 (utility-first) |
| State management | React Context + localStorage |
| i18n | Custom dictionary hook (`useLanguage`) — EN/TH |
| Charts | Recharts |
| Routing | React Router v6 |

### Python Backend (`utils/`, `pages/`, `components/`)

| Layer | Technology |
|---|---|
| Prototype UI | Streamlit ≥ 1.55 |
| Language | Python 3.11 |
| Data / tabular | pandas 2.1.4 |
| ML inference | scikit-learn + XGBoost + joblib |
| AI advisory | Google Gemini 2.0 Flash (`google-genai` SDK) |
| DB | psycopg2 → Supabase Postgres |

---

## Repository Structure

```
hello-ride-platform/
│
├── presentation-ui/                  # React/Vite — PRIMARY frontend
│   ├── src/
│   │   ├── App.jsx                   # Router + provider setup
│   │   ├── pages/
│   │   │   ├── OPSDashboard.jsx      # OPS Control Tower
│   │   │   ├── PassengerPortal.jsx   # Passenger booking + status screens
│   │   │   └── DriverApp.jsx         # Driver state machine
│   │   ├── components/
│   │   │   ├── shared/               # NavBar, LanguageToggle, SectionHeading
│   │   │   ├── passenger/            # PassengerSupportChat
│   │   │   └── ops/                  # (ops-specific widgets)
│   │   ├── context/
│   │   │   ├── DemoMatchingContext.jsx   # Trip state + cross-tab sync
│   │   │   ├── LanguageContext.jsx       # EN/TH language state
│   │   │   └── useLanguage.js           # Hook: { language, setLanguage, t }
│   │   ├── data/
│   │   │   ├── mockOps.js                # T1/T2/ALL terminal mock data
│   │   │   ├── helloride_dashboard_data.json  # Full dashboard dataset
│   │   │   └── edgeCaseProtocols.js      # Edge case protocol definitions
│   │   ├── i18n/
│   │   │   └── dictionary.js            # EN/TH translation keys
│   │   └── lib/
│   │       ├── businessLogic.js         # PWT thresholds, severity, matching mode
│   │       └── protocolMatcher.js       # Keyword → protocol matcher
│   └── package.json
│
├── app.py                            # Streamlit entry point
├── requirements.txt
├── pages/
│   ├── 1_ops_dashboard.py            # Streamlit OPS (DB-aware, mock fallback)
│   ├── 2_driver_flow.py              # Streamlit driver state machine
│   └── 3_passenger_flow.py           # Streamlit passenger flow
├── components/                       # Streamlit component library
│   ├── cards.py
│   ├── forms.py
│   ├── header.py
│   ├── navigation.py
│   └── status_blocks.py
├── data/
│   ├── mock_driver.py                # DRIVER_EXPERIENCE, DRIVER_FORECAST_BARS
│   ├── mock_ops.py                   # OPS_BY_TERMINAL
│   └── mock_passenger.py             # PASSENGER_EXPERIENCE, PAYMENT_OPTIONS
├── utils/
│   ├── ai_advisory.py               # Gemini advisory + fallback
│   ├── ml_predictor.py              # XGBoost PWT + breach risk
│   ├── rule_engine.py               # Rule evaluation → RuleAction list
│   ├── actions.py                   # Dispatch event writeback
│   ├── db.py                        # DB connection, effective_now, healthcheck
│   ├── state.py                     # Session state helpers (Streamlit)
│   └── styles.py                    # Global CSS injection (Streamlit)
├── models/
│   ├── xgb_wait_time_model.joblib
│   ├── xgb_breach_risk_model.joblib
│   └── feature_columns.json
└── docs/
    ├── architecture.md              # This file
    ├── driver-flow.md
    ├── passenger-flow.md
    ├── ui-patterns.md
    ├── supabase_schema_v1.sql
    └── migrations/
```

---

## Application Surfaces

### OPS Control Tower (`src/pages/OPSDashboard.jsx`)

Desktop-first operations dashboard. Three navigation sections:

**Live Monitoring**
- PWT gauge + severity band (NORMAL / WATCH / WARNING / CRITICAL)
- KPI tiles: Waiting Pax, Holding Taxis, Lane System Load, AI Forecast bar
- Demand vs supply forecast chart (next 3 hr, 15-min buckets)
- AI Situation Brief: situation summary, recommended action, expected impact
- Arrival Wave Analysis: flight table (next 60 min), demand signals, deficit breakdown
- Dispatch Controls: Send Incentive / Broadcast Drivers (OPS approval required)

**AI Advisory**
- Free-text chat grounded in live DB context
- Gemini 2.0 Flash; automatic rule-based fallback on quota/SSL failure
- Structured response: summary, root causes, recommended actions, 15-min plan

**Documentation & Policy**
- System reference and OPS protocol reference

**Dispatch Intelligence panel:**
- Passenger Queue + Driver Pool tables with priority scores
- Matching Mode badge (Normal / Priority / Critical) based on live PWT
- Dispatch Mode toggle (Auto vs OPS Priority)
- "Run Priority Dispatch" button → triggers `assignMatch()` + sets OPS action

---

### Passenger Portal (`src/pages/PassengerPortal.jsx`)

Mobile-style booking flow + real-time status screens.

**Booking flow (shown when `activeTrip.status === 'idle' | 'booked'`):**

```
Destination input → Passenger/luggage counts → Ride type + payment → Book
```

**Status screens (shown when trip is active):**

| Status | Screen |
|---|---|
| `assigned` | Spinner · "กำลังจัดรถให้คุณ" · driver + ETA info |
| `accepted` | "คนขับกำลังเดินทางมารับคุณ" · ETA countdown |
| `arrived` | Checkmark · "คนขับถึงจุดรับแล้ว · กรุณาไปที่ชั้น 1 ประตู 4" |
| `completed` | Trip summary · fare / distance / duration / destination |

**Support Chat** (`PassengerSupportChat.jsx`): keyword-based edge case detection via `protocolMatcher` — triggers protocol cards for safety, medical, lost & found, and other edge cases.

---

### Driver App (`src/pages/DriverApp.jsx`)

Mobile-style state machine covering the full driver partner lifecycle.

**Screen transitions:**

```
login → registration → verification → applicationStatus → guide
                                                              ↓
                                                         jobRequest (countdown)
                                                              ↓
                                                       tripNavigation
                                                              ↓
                                                       paymentComplete → guide
```

| Screen | Key action |
|---|---|
| `login` | Demo credentials pre-filled |
| `registration` | Name, phone, vehicle type |
| `verification` | Face scan animation |
| `guide` | Online toggle, demand forecast bars, incentive info |
| `jobRequest` | 12-second countdown; accept → `tripNavigation`; expire → back to `guide` |
| `tripNavigation` | Route timeline, passenger info, "Arrived at pickup" button |
| `paymentComplete` | Fare breakdown, "Confirm Payment Received" |

---

## AI & ML Layer

### XGBoost Models (`utils/ml_predictor.py`)

Two trained `.joblib` models loaded at inference time:

| Model | Output | Threshold |
|---|---|---|
| `xgb_wait_time_model` | `predicted_wait_min` (float) | — |
| `xgb_breach_risk_model` | `breach_probability` (0–1) | `≥ 0.5` = breach risk |

Input: feature row aligned to `feature_columns.json` → `pd.DataFrame.reindex()` fills missing features with 0.

### Gemini AI Advisory (`utils/ai_advisory.py`)

**Context assembly (`build_ops_context`)** — queries 6 rawdata/mart sources per render:
1. `mart.ops_kpi_snapshots` — latest PWT, pax, taxis
2. `rawdata.taxi_supply_snapshots` — holding/curb counts, lane config
3. `rawdata.flight_instances` — flights arriving in next 60 min
4. `rawdata.passenger_demand_signals` — rollup for last 20 min
5. `mart.demand_supply_forecasts` — 3-hour demand/supply timeseries
6. `rawdata.driver_dispatch_events` — dispatch events in last 30 min

**Generation path:**
1. Try `google-genai` SDK with certifi SSL context
2. Fall back to direct HTTPS if SDK fails
3. Fall back to rule-based `_fallback_answer()` if both fail

**Response schema:** `{ summary, root_causes, recommended_actions, next_15_min_plan, assumptions }`

**Modes** (set via `secrets.toml`): `auto` (SDK → HTTP → mock) | `gemini` | `mock`

### Rule Engine (`utils/rule_engine.py`)

Pure Python — no DB calls. Evaluates an `ops_view` dict against thresholds and returns a sorted `list[RuleAction]`:

| `kind` | Trigger | Priority |
|---|---|---|
| `activate_lane` | Lane load exceeds capacity | 1 (critical) |
| `broadcast_drivers` | Supply deficit detected | 2 |
| `flag_deficit` | Forecast gap > guardrail | 3 |

### Severity Classification + Action Recommendation (`businessLogic.js`)

Client-side threshold evaluation (mirrors rule engine logic):

```js
getPwtSeverity(pwt)   → NORMAL | WATCH | WARNING | CRITICAL
getMatchingMode(pwt)  → NORMAL_MATCHING | PRIORITY_MATCHING | CRITICAL_MATCHING
getSeverityTone(s)    → { dot, text, bg, border, bar } Tailwind classes
getActionRecommendation(s) → { label, copy, button }
```

### Edge Case Protocol Matcher (`lib/protocolMatcher.js`)

Keyword-based detector for passenger support chat. Scans message text against `EDGE_CASE_PROTOCOLS` trigger keywords (EN + TH). Returns the first matching protocol or `null`.

| Protocol ID | Group | Severity |
|---|---|---|
| `silent-sos` | In-transit Safety | HIGH |
| `medical-emergency` | In-transit Safety | HIGH |
| `data-pipeline-down` | Systemic & Policy Risk | HIGH |
| `lost-found` | User Behavior & Fraud | MEDIUM |
| `ghost-supply` | Demand/Supply Shock | MEDIUM |
| `accessibility-assist` | Accessibility | MEDIUM |

---

## Driver–Passenger Matching System

### Matching Modes

| PWT | Mode | Scoring Algorithm |
|---|---|---|
| ≤ 20 min | Normal Matching | FCFS + Capacity Fit |
| 20–30 min | Priority Matching | Queue Order + ETA + Capacity Fit |
| > 30 min | Critical Matching | Longest Wait + Low ETA + High Acceptance Rate + Capacity Fit |

Matching mode is derived at render time from `getMatchingMode(d.pwt)` — no separate state needed.

### Dispatch Modes

| Mode | Trigger | Behaviour |
|---|---|---|
| Auto Dispatch | `bookPassengerTrip()` | status → `assigned` immediately |
| OPS Priority Dispatch | `bookPassengerTrip()` then OPS action | status → `booked` → OPS runs `assignMatch()` |

When `matchingMode === CRITICAL_MATCHING`, `handleRunMatching()` also sets `OPS_ACTION.OVERFLOW_ACTIVATED` before assigning.

### Trip Status Machine

```
idle → booked → assigned → accepted → arrived → completed
```

All status transitions go through `DemoMatchingContext` functions. Direct mutation of `activeTrip.status` is not allowed.

---

## Cross-Tab State Synchronisation

`DemoMatchingContext` (`src/context/DemoMatchingContext.jsx`) uses localStorage as a shared bridge across browser tabs.

**Storage keys:**

| Key | Contents |
|---|---|
| `helloride_activeTrip` | Full trip object (status, passenger, driver, fare, destination) |
| `helloride_opsAction` | `incentive_sent` \| `overflow_activated` \| `max_incentive_sent` \| `null` |
| `helloride_activeEscalation` | Active edge case escalation object or `null` |
| `helloride_dispatchMode` | `auto` \| `priority` |

**Sync mechanism:** `window.addEventListener('storage', handler)` fires in sibling tabs when one tab writes. Each handler reads `e.key` and `e.newValue` to update only the relevant state slice.

**Reset:** `resetMatch()` calls `localStorage.removeItem` on both trip and ops keys before resetting React state — ensures sibling tabs receive a `null` event and reset to default immediately.

---

## i18n System

`src/i18n/dictionary.js` — flat key→string map for EN and TH.  
`src/context/LanguageContext.jsx` — stores active language in `helloRideLanguage` localStorage key.  
`src/context/useLanguage.js` — hook returning `{ language, setLanguage, t }` where `t(key)` looks up `dictionary[language][key]` with EN fallback.

Language is controlled by `<LanguageToggle />` in `NavBar.jsx` and shared across all pages via context.

---

## Data Layer

### React/Vite mock data

| File | Contents |
|---|---|
| `src/data/mockOps.js` | T1, T2, ALL terminal objects: PWT, flights, demand signals, forecast series, deficit breakdown, impact simulation |
| `src/data/helloride_dashboard_data.json` | Full dashboard dataset (38 modules, ~371 KB) |
| `src/data/edgeCaseProtocols.js` | 6 protocol definitions with trigger keywords (EN + TH) |

### Python mock data

| File | Contents |
|---|---|
| `data/mock_driver.py` | `DRIVER_EXPERIENCE` (profile, guideTrip, fareBreakdown), `DRIVER_FORECAST_BARS` |
| `data/mock_ops.py` | `OPS_BY_TERMINAL` keyed by `"T1"`, `"T2"` |
| `data/mock_passenger.py` | `PASSENGER_EXPERIENCE`, `PAYMENT_OPTIONS`, `TIP_OPTIONS` |

### Supabase DB (`rawdata.*` + `mart.*`)

> **Timezone contract:** All `*_local` columns are **stored as UTC**.  
> Every query must convert: `(field AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'`

**`rawdata` schema — source of truth:**

| Table | Key timestamp | Purpose |
|---|---|---|
| `flight_instances` | `est_arrival_local` | Arrival wave; primary `effective_now` source |
| `taxi_supply_snapshots` | `captured_at_local` | Supply telemetry; top-priority `effective_now` |
| `passenger_demand_signals` | `created_at_local` | Demand signals (last 20 min) |
| `driver_dispatch_events` | `created_at_local` | Dispatch history |
| `flights_raw` | `sched_arrival_local` | Raw feed before normalisation |
| `weather_raw` | `captured_at_local` | Weather context |

**`mart` schema — aggregated views:**

| Table | Purpose | If empty |
|---|---|---|
| `ops_kpi_snapshots` | KPI tiles (PWT, pax, taxis) | Tiles show 0; warning banner |
| `demand_supply_forecasts` | Forecast chart (15-min buckets, 3-hr horizon) | Chart blank; warning banner |
| `ops_ai_chat_messages` | Advisory chat history | Advisory still works |

---

## DB Layer (`utils/db.py`)

| Export | Purpose |
|---|---|
| `get_conn()` | Cached psycopg2 connection (`@st.cache_resource`) |
| `fetch_all(sql, params)` | SELECT → `list[dict]` |
| `fetch_one(sql, params)` | SELECT → `dict \| None` |
| `execute(sql, params)` | INSERT / UPDATE / DELETE with commit |
| `healthcheck()` | Returns `HealthcheckResult(ok, info)` — never exposes credentials |
| `get_effective_now()` | Returns `EffectiveNow(ts, source)` anchor in ICT |
| `refresh_mart(airport_code)` | Calls `mart.refresh_kpi_snapshot` + `mart.refresh_demand_supply_forecast` |

**`effective_now` source priority:**
1. `max(captured_at_local)` from `rawdata.taxi_supply_snapshots`
2. `max(created_at_local)` from `rawdata.passenger_demand_signals`
3. `max(est_arrival_local)` from `rawdata.flight_instances`
4. `(now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'` (fallback)

**SQL rules:**
- Always use `%(name)s` placeholders — never f-strings or `.format()` in SQL
- Time-window comparison pattern:
  ```sql
  (field_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
  BETWEEN coalesce(%(effective_now)s, ...) - interval 'X'
      AND coalesce(%(effective_now)s, ...)
  ```
- INSERT timestamp: `(now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'`

---

## Security Constraints

| Rule | Detail |
|---|---|
| Never display in UI | `DATABASE_URL`, `host`, `resolved_host`, `user`, `dbname`, `port`, IP addresses |
| DB status badge | "Connected / Not connected" + source type + sanitized error only |
| `healthcheck()` | Returns only `{"source": "..."}` or `{"source": "...", "error": "..."}` |
| Exception messages | `re.sub` to redact `password=`, `host=`, `user=`, `://...` before display |
| Secrets | `.streamlit/secrets.toml` (local) or Streamlit Cloud Secrets only; never committed |

---

## Design Tokens (React/Vite)

| Token | Value | Usage |
|---|---|---|
| `--color-primary` / `text-brand` | `#00b14f` | Brand green, CTAs, online state |
| `--color-danger` | `#d54b72` | Critical alerts, drop-off marker |
| `--color-ops` | `#154aa8` | OPS surface accent |
| `--color-driver` | `#0c7d35` | Driver surface accent |
| `--color-passenger` | `#2d6bff` | Passenger surface accent |

---

## Production Readiness Gaps

| Area | Gap |
|---|---|
| Backend API | React calls mock data; real ML/Gemini requires an API bridge to Python utilities |
| Authentication | No auth layer on any surface |
| State persistence | localStorage resets on clear; no server-side session |
| Real-time data | No WebSocket or polling for live PWT / flight data |
| Testing | No unit, integration, or E2E tests |
| Monitoring | No analytics, error tracking, or structured logging |
| Production split | All surfaces in one repo; Phase 3 separates per stakeholder |
