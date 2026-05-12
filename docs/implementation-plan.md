# Implementation Plan — Hello Ride / AOT Smart Taxi Ecosystem
## Stack: Streamlit + Python + Supabase Postgres

---

## Context

This document rewrites the original Next.js/Node.js plan into one that fits the live repo: a Streamlit multi-page Python app with psycopg2 + Supabase Postgres. No full-stack rewrite is needed or proposed.

**Three observed OPS page problems:**
1. `mart` tables can be empty → charts show 0 even when `rawdata` has data
2. Time-window anchor defaults to `DB now()` → excludes historical CSV uploads
3. Secrets / host / user / dbname / port must never appear in UI (already partially enforced)

**Two structural bugs underneath everything:**
- **Timezone contract** — `*_local` columns are stored as UTC but named `_local`; every query that filters or displays them must apply `(field AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'`
- **`effective_now` anchor** — `get_effective_now()` in `utils/db.py` derives its value from raw UTC max-timestamps without conversion, so the anchor is 7 hours behind ICT; this must be fixed in Phase 0 before any stream can be verified

---

## ⚠️ Phase 0 — Prerequisites (Blocks All Streams)

### P-0: Fix `get_effective_now()` — `utils/db.py`

All three sub-queries that compute the anchor timestamp must convert stored UTC to ICT:

```sql
-- Before (wrong — returns UTC max as if it were ICT)
SELECT max(captured_at_local) FROM rawdata.taxi_supply_snapshots WHERE airport_code = 'BKK'

-- After (correct — converts stored UTC → ICT before returning)
SELECT max((captured_at_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')
FROM rawdata.taxi_supply_snapshots WHERE airport_code = 'BKK'
```

Apply same fix to the `passenger_demand_signals` and `flight_instances` sub-queries inside `get_effective_now()`.

### P-1: Fix all comparison queries — `pages/1_ops_dashboard.py` + `utils/ai_advisory.py`

Every `WHERE field_local <= %(effective_now)s` must wrap the column before comparing:

```sql
-- Before (wrong — compares UTC-stored value to ICT anchor)
WHERE captured_at_local <= %(effective_now)s

-- After (correct)
WHERE (captured_at_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok' <= %(effective_now)s
```

**Files / functions affected:**

| File | Functions |
|---|---|
| `pages/1_ops_dashboard.py` | `latest_kpi_snapshot`, `load_flights`, `load_demand_signals`, `latest_supply_snapshot`, `latest_weather_snapshot`, `load_supply_items`, `load_forecast_series` |
| `utils/ai_advisory.py` | `build_ops_context` (all 6 queries) |

**Branch:** `fix/timezone-utc-ict-contract` — must merge before Streams A, B, C start.

---

## Stream A — Mart Population + pg_cron + Effective-Now Anchor

**Goal:** `mart.ops_kpi_snapshots` and `mart.demand_supply_forecasts` always contain fresh rows; charts never show "0 because mart is empty."

**Owner:** Solo or lead dev — pure SQL + one Python helper, no UI changes.

### A-1: SQL Refresh Functions

**File to create:** `docs/migrations/001_mart_refresh_functions.sql`

#### `mart.refresh_kpi_snapshot(p_airport TEXT)`

```sql
CREATE OR REPLACE FUNCTION mart.refresh_kpi_snapshot(p_airport TEXT DEFAULT 'BKK')
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_snap  rawdata.taxi_supply_snapshots%ROWTYPE;
    v_pax   INT;
    v_lanes INT;
    v_pwt   NUMERIC;
    v_now   TIMESTAMP;
BEGIN
    v_now := (now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok';

    -- Latest supply snapshot (stored UTC → ICT)
    SELECT * INTO v_snap
    FROM rawdata.taxi_supply_snapshots
    WHERE airport_code = p_airport
    ORDER BY (captured_at_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok' DESC
    LIMIT 1;

    IF NOT FOUND THEN RETURN; END IF;

    -- Pending demand in last 20 min (ICT window)
    SELECT COALESCE(SUM(pax_count), 0) INTO v_pax
    FROM rawdata.passenger_demand_signals
    WHERE airport_code = p_airport
      AND LOWER(status) NOT IN ('dispatched', 'completed', 'cancelled')
      AND (created_at_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
          BETWEEN v_now - INTERVAL '20 minutes' AND v_now;

    -- Active lane count from JSON array
    v_lanes := COALESCE(jsonb_array_length(v_snap.active_lanes_json), 1);

    -- v1 PWT formula: pending_pax / (available_taxis * 0.267 pax/min)
    -- 0.267 = 4 pax per taxi per 15 min
    IF (v_snap.taxis_at_curb + v_snap.taxis_in_holding) > 0 THEN
        v_pwt := ROUND(v_pax::NUMERIC /
                       ((v_snap.taxis_at_curb + v_snap.taxis_in_holding) * 0.267));
    ELSE
        v_pwt := 999;
    END IF;

    INSERT INTO mart.ops_kpi_snapshots
        (airport_code, captured_at_local, pwt_min, waiting_pax,
         available_taxis, active_lanes, notes)
    VALUES (
        p_airport, v_now, v_pwt, v_pax,
        v_snap.taxis_at_curb + v_snap.taxis_in_holding,
        v_lanes, NULL
    );
END;
$$;
```

#### `mart.refresh_demand_supply_forecast(p_airport TEXT)`

```sql
CREATE OR REPLACE FUNCTION mart.refresh_demand_supply_forecast(p_airport TEXT DEFAULT 'BKK')
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_now         TIMESTAMP;
    v_snap        rawdata.taxi_supply_snapshots%ROWTYPE;
    v_cap_per_15m INT;
    v_horizon     INT := 0;
BEGIN
    v_now := (now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok';
    -- Floor to 15-min bucket (bucket_start_ict)
    v_now := date_trunc('hour', v_now)
             + INTERVAL '15 minutes' * FLOOR(EXTRACT(MINUTE FROM v_now) / 15);

    SELECT * INTO v_snap
    FROM rawdata.taxi_supply_snapshots
    WHERE airport_code = p_airport
    ORDER BY (captured_at_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok' DESC
    LIMIT 1;

    v_cap_per_15m := COALESCE(v_snap.lane_capacity_per_15m, 4)
                     * COALESCE(jsonb_array_length(v_snap.active_lanes_json), 1);

    -- Remove stale forecast rows (keep only latest run)
    DELETE FROM mart.demand_supply_forecasts
    WHERE airport_code = p_airport
      AND generated_at_local < v_now - INTERVAL '30 minutes';

    -- Generate 12 x 15-min slots = 3-hour horizon
    FOR v_horizon IN 0..11 LOOP
        INSERT INTO mart.demand_supply_forecasts
            (airport_code, generated_at_local, horizon_min, ts_local,
             demand_pax, supply_taxis)
        SELECT
            p_airport,
            v_now,
            v_horizon * 15,
            v_now + (v_horizon * INTERVAL '15 minutes'),
            -- v1 demand: current signal sum with 5% linear growth per slot
            COALESCE((
                SELECT SUM(pds.pax_count) * (1 + v_horizon * 0.05)
                FROM rawdata.passenger_demand_signals pds
                LEFT JOIN rawdata.flight_instances fi
                    ON fi.flight_instance_id = pds.flight_instance_id
                WHERE pds.airport_code = p_airport
                  AND (pds.created_at_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
                      BETWEEN v_now - INTERVAL '20 minutes' AND v_now
                  AND LOWER(pds.status) NOT IN ('completed', 'cancelled')
            ), 0)::INT,
            -- v1 supply: static lane capacity (taxis per 15-min slot)
            v_cap_per_15m
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;
```

#### pg_cron Schedules

```sql
-- Requires pg_cron extension (Supabase Dashboard → Extensions → pg_cron)
SELECT cron.schedule('refresh-kpi',      '*/5 * * * *',
    $$SELECT mart.refresh_kpi_snapshot('BKK')$$);
SELECT cron.schedule('refresh-forecast', '*/15 * * * *',
    $$SELECT mart.refresh_demand_supply_forecast('BKK')$$);
```

### A-2: Python Fallback Refresh — `utils/db.py`

Add after existing helper functions:

```python
def refresh_mart(airport_code: str = "BKK") -> None:
    """Trigger mart refresh synchronously; used if pg_cron is inactive."""
    try:
        execute("SELECT mart.refresh_kpi_snapshot(%(a)s)", {"a": airport_code})
        execute("SELECT mart.refresh_demand_supply_forecast(%(a)s)", {"a": airport_code})
    except Exception:
        pass  # silent — page still falls back to mock
```

### A-3: Wire fallback into OPS page — `pages/1_ops_dashboard.py`

Inside `build_ops_view_from_db()`, after `latest_kpi_snapshot()` returns `None`:

```python
if kpi is None:
    refresh_mart()
    kpi = latest_kpi_snapshot(eff_ts)
```

---

## Stream B — Rule Engine + Action Writeback

**Goal:** Python-native threshold rules generate recommended actions; actions write to `rawdata.driver_dispatch_events` (existing table, no new table for v1).

**Owner:** Can run in parallel with Stream A after Phase 0 merges.

### B-1: New file `utils/rule_engine.py`

```python
"""
Threshold-based rule engine. Pure Python — no DB calls.
Input:  ops_view dict (same shape as build_ops_view_from_db return value).
Output: list of RuleAction dataclasses, sorted by priority.
"""
from dataclasses import dataclass, field
from typing import Literal

ActionKind = Literal["activate_lane", "broadcast_drivers", "flag_deficit"]

@dataclass
class RuleAction:
    kind: ActionKind
    priority: int          # 1 = critical, 2 = warning, 3 = info
    title: str
    body: str
    meta: dict = field(default_factory=dict)

def evaluate(ops_view: dict, guardrail_min: int = 10) -> list[RuleAction]:
    actions: list[RuleAction] = []
    pwt   = ops_view.get("pwt_min", 0)
    pax   = ops_view.get("waiting_pax", 0)
    taxis = ops_view.get("available_taxis", 0)
    deficit = pax - (taxis * 4)  # v1: 4 pax per taxi

    # Rule 1: Critical PWT breach
    if pwt >= guardrail_min:
        actions.append(RuleAction(
            kind="activate_lane", priority=1,
            title=f"PWT {pwt} min — activate extra lane",
            body=f"Waiting passengers: {pax}. Available taxis: {taxis}.",
            meta={"pwt_min": pwt},
        ))

    # Rule 2: Supply deficit below PWT threshold
    if deficit > 20 and pwt < guardrail_min:
        actions.append(RuleAction(
            kind="broadcast_drivers", priority=2,
            title=f"Demand gap {deficit} pax — broadcast to holding queue",
            body="Demand exceeds curb supply. Pull from holding.",
            meta={"deficit": deficit},
        ))

    # Rule 3: Upcoming deficit window in forecast
    for pt in ops_view.get("forecast", [])[:4]:  # next 1 hour
        if pt.get("demand_pax", 0) - pt.get("supply_taxis", 0) * 4 > 30:
            actions.append(RuleAction(
                kind="flag_deficit", priority=3,
                title=f"Projected deficit at {pt['ts_local']}",
                body="Pre-position taxis before wave arrival.",
                meta={"ts": pt["ts_local"]},
            ))
            break  # one forecast flag is enough

    return sorted(actions, key=lambda r: r.priority)
```

### B-2: New file `utils/actions.py`

```python
"""
Action persistence layer. Writes to rawdata.driver_dispatch_events only (v1).
Never logs or surfaces DB credentials.
"""
from utils.db import execute

def log_ops_action(
    airport_code: str,
    lane: str,
    status: str,
    driver_id: str | None = None,
    signal_id: int | None = None,
    flight_instance_id: str | None = None,
) -> bool:
    """
    Write an ops action event. Returns True on success, False on error.
    status examples: 'lane_activated', 'broadcast_sent', 'deficit_flagged'
    """
    sql = """
        INSERT INTO rawdata.driver_dispatch_events
            (airport_code, created_at_local, updated_at_local,
             driver_id, signal_id, flight_instance_id, lane, status)
        VALUES (
            %(airport_code)s,
            (now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok',
            (now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok',
            %(driver_id)s, %(signal_id)s, %(flight_instance_id)s,
            %(lane)s, %(status)s
        )
    """
    try:
        execute(sql, {
            "airport_code": airport_code,
            "driver_id": driver_id,
            "signal_id": signal_id,
            "flight_instance_id": flight_instance_id,
            "lane": lane,
            "status": status,
        })
        return True
    except Exception:
        return False
```

### B-3: Wire into OPS page — `pages/1_ops_dashboard.py`

```python
from utils.rule_engine import evaluate
from utils.actions import log_ops_action

# After build_ops_view_from_db():
rule_actions = evaluate(ops_view, guardrail_min=st.session_state.ops_guardrail_min)
# Render rule_actions as render_alert_card(...) above the KPI section

# Replace log_dispatch_action() calls in action buttons with log_ops_action(...)
```

---

## Stream C — AI Advisory Chat

**Goal:** AI advisory uses real DB context with correct timezone; Gemini fallback is data-aware; no regression on mock mode.

**Owner:** Can run in parallel with Stream B after Phase 0 merges.

### C-1: Fix timezone in `build_ops_context()` — `utils/ai_advisory.py`

The `effective_now` parameter arrives as an ICT timestamp (after P-0 fix). Apply the same conversion pattern to all 6 queries:

```sql
-- Pattern for every *_local column in WHERE clauses:
(field_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok' <= %(effective_now)s
```

Queries to fix:
1. `mart.ops_kpi_snapshots` — `captured_at_local`
2. `rawdata.taxi_supply_snapshots` — `captured_at_local`
3. `rawdata.flight_instances` — `est_arrival_local` (BETWEEN clause)
4. `rawdata.passenger_demand_signals` — `created_at_local`
5. `mart.demand_supply_forecasts` — `ts_local` (BETWEEN clause)
6. `rawdata.driver_dispatch_events` — `created_at_local`

### C-2: Fallback answer

`_fallback_answer()` in `ai_advisory.py` already reads from the context dict — no structural change needed. Verify it still works after C-1 SQL changes.

### C-3: Context cache version bump — `pages/1_ops_dashboard.py`

Bump `CONTEXT_CACHE_VERSION` constant (line ~27) after Stream A SQL functions are deployed, to force context refresh in active browser sessions.

---

## File List

| File | Action | Stream |
|---|---|---|
| `utils/db.py` | Modify `get_effective_now()` (UTC→ICT); add `refresh_mart()` | P-0, A-2 |
| `pages/1_ops_dashboard.py` | Fix timezone in 7 functions; add `refresh_mart()` fallback call; wire rule engine; bump cache version | P-1, A-3, B-3, C-3 |
| `utils/ai_advisory.py` | Fix timezone in `build_ops_context()` — 6 queries | P-1, C-1 |
| `utils/rule_engine.py` | **CREATE** — pure Python rule evaluator | B-1 |
| `utils/actions.py` | **CREATE** — writeback wrapper for `driver_dispatch_events` | B-2 |
| `docs/migrations/001_mart_refresh_functions.sql` | **CREATE** — SQL functions + pg_cron schedules | A-1 |

**Files NOT touched:** `app.py`, `requirements.txt`, `.gitignore`, `components/*`, `data/*`, `utils/state.py`, `utils/styles.py`, `pages/2_driver_flow.py`, `pages/3_passenger_flow.py`

---

## Step-by-Step Tasks

### Phase 0 — Timezone fix (blocks all streams)
```
T0.1  Fix get_effective_now() — 3 sub-queries in utils/db.py
T0.2  Fix 7 query functions in pages/1_ops_dashboard.py
T0.3  Fix 6 queries in utils/ai_advisory.py
T0.4  python3 -m py_compile utils/db.py pages/1_ops_dashboard.py utils/ai_advisory.py
T0.5  Smoke test: streamlit run app.py — OPS dashboard loads with real data
T0.6  Open PR "fix/timezone-utc-ict-contract" + session note
```

### Phase A — Mart population
```
T_A1  Write docs/migrations/001_mart_refresh_functions.sql
T_A2  Run migration in Supabase SQL editor; confirm functions exist (\df mart.*)
T_A3  SELECT mart.refresh_kpi_snapshot('BKK') — confirm row inserted
T_A4  SELECT mart.refresh_demand_supply_forecast('BKK') — confirm 12 rows
T_A5  Enable pg_cron in Supabase Extensions; run cron.schedule() statements
T_A6  Add refresh_mart() to utils/db.py
T_A7  Add fallback refresh call in build_ops_view_from_db() if mart returns empty
T_A8  Open PR "feat/mart-refresh-functions" + session note
```

### Phase B — Rule engine + writeback
```
T_B1  Create utils/rule_engine.py
T_B2  Create utils/actions.py
T_B3  Integrate evaluate() in 1_ops_dashboard.py
T_B4  Replace log_dispatch_action() button calls with log_ops_action()
T_B5  python3 -m py_compile; smoke test action buttons in browser
T_B6  Open PR "feat/rule-engine-writeback" + session note
```

### Phase C — AI Advisory
```
T_C1  Verify Phase 0 timezone fixes are merged
T_C2  Bump CONTEXT_CACHE_VERSION after mart functions deployed
T_C3  Test AI Advisory tab: ask a question — response cites real numbers
T_C4  Disconnect DB: verify fallback renders (no crash, no credential leak)
T_C5  Open PR "fix/ai-advisory-context-timezone" + session note
```

---

## Verification Checklist per Stream

### Stream A
```bash
# Migration applied
psql $DATABASE_URL -c "\df mart.*"
# expect: refresh_kpi_snapshot, refresh_demand_supply_forecast listed

# Manual refresh
psql $DATABASE_URL -c "SELECT mart.refresh_kpi_snapshot('BKK')"
psql $DATABASE_URL -c "SELECT count(*) FROM mart.ops_kpi_snapshots WHERE airport_code='BKK'"
# expect: >= 1

psql $DATABASE_URL -c "SELECT mart.refresh_demand_supply_forecast('BKK')"
psql $DATABASE_URL -c "SELECT count(*) FROM mart.demand_supply_forecasts WHERE airport_code='BKK'"
# expect: 12 rows (or multiples if called multiple times)

# pg_cron active
psql $DATABASE_URL -c "SELECT jobname, schedule FROM cron.job"
# expect: refresh-kpi (*/5), refresh-forecast (*/15)

# Streamlit — OPS Forecast chart shows non-zero bars
streamlit run app.py
```

### Stream B
```bash
python3 -m py_compile utils/rule_engine.py utils/actions.py

python3 -c "
from utils.rule_engine import evaluate
view = {'pwt_min': 18, 'waiting_pax': 40, 'available_taxis': 5, 'active_lanes': 2, 'forecast': []}
actions = evaluate(view, guardrail_min=10)
print([a.kind for a in actions])
# expect: ['activate_lane']
"

# Manual: click 'Activate Lane' in OPS dashboard; confirm row in:
# SELECT status, created_at_local FROM rawdata.driver_dispatch_events
# ORDER BY created_at_local DESC LIMIT 3
```

### Stream C
```bash
python3 -m py_compile utils/ai_advisory.py

# With DB connected:
# Open AI Advisory tab → ask "What is the current PWT?"
# Verify response cites actual numbers (not "data unavailable")
# st.session_state.ops_ai_status should be "gemini" or "fallback"

# Without DB (invalid DATABASE_URL):
# Verify fallback response renders — no crash, no credential leak in UI
```

---

## Risks & Decisions (v1 Assumptions)

| # | Risk / Decision | v1 Assumption | Action Required |
|---|---|---|---|
| R-1 | **Timezone contract** — `*_local` stored as UTC | All rawdata columns treated as UTC; converted with `(field AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'` everywhere | **Block on Phase 0 before any stream work** |
| R-2 | **PWT formula** — no historical ground truth | `pending_pax / (available_taxis × 0.267 pax/min)` where 0.267 = 4 pax/taxi/15 min | Label as v1 estimate; add `notes` comment in migration |
| R-3 | **Forecast demand projection** — no ML model | Linear 5% per-slot growth on current signal sum | Clearly labeled "v1 estimate" in UI; revisit when flight wave data is stable |
| R-4 | **mart vs rawdata gate** | Gate all fallback logic on `rawdata.*`; never use mart table emptiness as a gate | Implemented in A-2/A-3 |
| R-5 | **pg_cron availability** | Available on Supabase Pro; free tier may not have it | Python `refresh_mart()` fallback acts as safety net (A-2) |
| R-6 | **feature_cutoff_ict for ML** | v1 has no ML training; anti-leakage rule not yet applicable | Add `feature_cutoff_ict` column to `demand_supply_forecasts` when ML is introduced |
| R-7 | **bucket_start_ict join key** | 15-min floor: `date_trunc('hour', ts) + 15 min * floor(minute/15)` | Ensure both sides of any future mart–mart join use identical expression |
| R-8 | **Gemini API quota** | `get_advisory_response()` already falls back to rule-based response | No change; verify fallback path in C-4 test |
| R-9 | **`active_lanes_json` null** | `jsonb_array_length(NULL)` returns NULL not 0 | Wrap all usages: `COALESCE(jsonb_array_length(active_lanes_json), 1)` |

---

## PR Workflow + .agents Session Notes

### Branch naming convention
```
fix/timezone-utc-ict-contract      ← Phase 0 — must merge first
feat/mart-refresh-functions        ← Stream A
feat/rule-engine-writeback         ← Stream B
fix/ai-advisory-context-timezone   ← Stream C (may stack on Phase 0 branch)
```

### Dependency graph
```
Phase 0 (timezone fix)
    ├── Stream A (mart functions)  — start after Phase 0 merges
    ├── Stream B (rule engine)     — start in parallel with A; writeback needs P-1
    └── Stream C (AI advisory)     — start after Phase 0; C-3 needs Stream A deployed
```

### PR checklist (paste into every PR description)
```markdown
## AI Session Checklist
- [ ] Scope small — only files named in this stream are changed
- [ ] No secrets, credentials, or hostnames committed
- [ ] Timezone fix applied: `(field AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'`
- [ ] `python3 -m py_compile <changed files>` passes
- [ ] `streamlit run app.py` — OPS dashboard loads; no zero-only charts
- [ ] Session note added to `.agents/sessions/YYYYMMDD-HHMM_<author>_<topic>.md`
- [ ] `active.md` NOT modified in this PR
```

### 5-Step Example Workflow

**Step 1 — Dev A takes Stream A**
```bash
git checkout -b feat/mart-refresh-functions
```
Reads `AGENTS.md` → `active.md` → latest session. Writes `docs/migrations/001_mart_refresh_functions.sql`, adds `refresh_mart()` to `utils/db.py`, adds fallback call to `pages/1_ops_dashboard.py`.

**Step 2 — Dev A writes session note + opens PR**
Creates `.agents/sessions/20260419-1000_devA_mart-refresh.md`.  
Pastes PR checklist. Does NOT touch `active.md`.

**Step 3 — Mormay reviews + merges**
Confirms SQL migration is safe, session note present, `active.md` untouched. Merges. Updates `active.md` on `main` in a separate commit: marks mart-refresh ✅, sets next steps.

**Step 4 — Dev B takes Stream B in parallel**
While Dev A worked on Stream A, Dev B started `feat/rule-engine-writeback` after Phase 0 merged. Creates `utils/rule_engine.py` and `utils/actions.py`. No file collisions with Dev A.

**Step 5 — New AI tool joins, reads context**
Pulls `main`. Reads `AGENTS.md` → `active.md` → latest session file. Knows timezone fix is done, mart refresh is live, rule engine is in progress. Picks up Stream C without re-discovering the UTC bug.
