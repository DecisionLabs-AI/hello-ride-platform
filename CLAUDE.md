# Hello Ride Platform — Claude Code Rules

## Project Context

Hello Ride is a **Streamlit prototype** for a proactive taxi dispatch system at Suvarnabhumi Airport (BKK). It is a Python + Streamlit multi-page app with no React frontend. The **OPS Control Tower is the graded deliverable**; passenger and driver pages are UI prototypes.

Data sources:
- **Mock data** (default, no DB needed): `data/mock_driver.py`, `data/mock_passenger.py`, `data/mock_ops.py`
- **Supabase Postgres** (optional live backend): `rawdata.*` and `mart.*` schemas, accessed via `utils/db.py`

When DB is connected, `pages/1_ops_dashboard.py` queries live data and falls back to mock only when all queries return empty. The other two pages (`2_driver_flow.py`, `3_passenger_flow.py`) always use mock data.

**Critical timezone contract:** All `*_local` columns in `rawdata.*` are **stored as UTC** despite the name. Every query filtering or displaying them must convert: `(field AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'`. See the Timezone Contract section below.

---

## Scope Rules

### What is in scope
- Editing Python page logic inside `pages/`
- Editing Python component functions inside `components/`
- Editing mock data inside `data/`
- Editing state management helpers inside `utils/state.py`
- Editing global styling inside `utils/styles.py`
- Editing DB helpers inside `utils/db.py`
- Editing AI advisory logic inside `utils/ai_advisory.py`
- Editing rule engine logic in `utils/rule_engine.py`
- Editing action writeback helpers in `utils/actions.py`
- Editing documentation in `docs/` and `README.md`
- Adding session notes in `.agents/sessions/` (one per PR)

### What is out of scope — never touch without explicit instruction
- `app.py` page config block (`st.set_page_config`) and top-level layout
- `requirements.txt` — frozen unless the user explicitly asks
- `.gitignore` — frozen unless the user explicitly asks
- Other page files when the task names a specific page
- `components/` shared components — changes there affect all three surfaces
- `.agents/active.md` — updated by main owner only, never in a PR

---

## Page / Screen Inventory

| Surface name | File | Entry step |
|---|---|---|
| Ops dashboard | `pages/1_ops_dashboard.py` | `ops_workspace` (Live Monitoring / AI Advisory) |
| Driver flow | `pages/2_driver_flow.py` | `driver_step` = `"login"` |
| Passenger flow | `pages/3_passenger_flow.py` | `passenger_step` = `"home"` |

### Driver step values (`st.session_state.driver_step`)

| Step value | Screen |
|---|---|
| `"login"` | Driver login / home |
| `"registration"` | New driver registration form |
| `"verification"` | Face scan |
| `"applicationStatus"` | Academy + approval status |
| `"guide"` | Driver home — online toggle, incentives, demand forecast |
| `"jobRequest"` | Incoming job offer with countdown timer |
| `"tripNavigation"` | Active trip — route + passenger info |
| `"paymentComplete"` | Fare breakdown + payment confirmation |

### Passenger step values (`st.session_state.passenger_step`)

| Step value | Screen |
|---|---|
| `"home"` | Destination input, passenger/luggage counts, trip details |
| `"carType"` | Ride type selection + payment method |
| `"ride"` | Post-booking summary (read-only) |
| `"review"` | Star rating, tip, comment |

**Rule:** If a task says "modify ONLY screen X", touch no code outside the conditional block for that step. Do not modify shared components in `components/` unless the task explicitly names a component file.

---

## Navigation / State Rules

- All driver screen transitions call `set_driver_step("stepName")` from `utils/state.py` — never assign `st.session_state.driver_step` directly inside page logic
- All passenger screen resets go through `reset_passenger_flow()` from `utils/state.py`
- `set_driver_step("jobRequest")` also sets `driver_job_started_at = time.time()` — do not duplicate this
- Session state is initialised once by `initialize_state()` in `app.py` — do not call it inside page files
- Do not reset `driver_online` during step transitions unless explicitly asked

---

## Session State Key Reference

### Passenger keys

| Key | Type | Initial | Purpose |
|---|---|---|---|
| `passenger_step` | `str` | `"home"` | Active passenger screen |
| `passenger_destination` | `str` | `""` | Confirmed destination |
| `passenger_destination_input` | `str` | `""` | Live input field value |
| `passenger_count` | `int` | `1` | Number of passengers |
| `passenger_luggage` | `int` | from mock | Number of luggage items |
| `passenger_special_assistance` | `bool` | `False` | Accessibility request |
| `passenger_notes` | `str` | `""` | Free-text trip notes |
| `passenger_selected_ride` | `str` | `""` | ID of selected ride type |
| `passenger_payment` | `str` | `""` | Selected payment method |
| `passenger_rating` | `int` | `5` | Star rating (1–5) |
| `passenger_tip` | `str` | `"฿50"` | Selected tip value |
| `passenger_comment` | `str` | `""` | Review text |
| `passenger_review_submitted` | `bool` | `False` | Review submitted flag |

### Driver keys

| Key | Type | Initial | Purpose |
|---|---|---|---|
| `driver_step` | `str` | `"login"` | Active driver screen |
| `driver_registered` | `bool` | `False` | Registration form submitted |
| `driver_verified` | `bool` | `False` | Face scan passed |
| `driver_approved` | `bool` | `False` | Academy + background check passed |
| `driver_online` | `bool` | `False` | Driver is available for jobs |
| `driver_in_queue` | `bool` | `False` | Driver is in holding queue |
| `driver_queue_position` | `int` | `8` | Position in queue |
| `driver_queue_wait_min` | `int` | `12` | Estimated queue wait (minutes) |
| `driver_face_scan_started` | `bool` | `False` | Face scan animation started |
| `driver_job_started_at` | `float \| None` | `None` | Timestamp when job offer started (for countdown) |
| `driver_offer_expired` | `bool` | `False` | Job offer countdown expired |
| `driver_registration` | `dict` | `{firstName, lastName, phone}` | Registration form fields |
| `accepted_job` | `dict \| None` | `None` | Job dict snapshot at moment of acceptance; never replaced mid-trip |

### Ops keys

| Key | Type | Initial | Purpose |
|---|---|---|---|
| `ops_terminal` | `str` | `"T1"` | Selected terminal (T1 / T2 / All) |
| `ops_workspace` | `str` | `"Live Monitoring"` | Active workspace tab |
| `ops_guardrail_min` | `int` | `10` | PWT guardrail threshold (minutes) |
| `ops_extra_lane_active` | `bool` | `False` | Extra lane activated flag |
| `ops_last_broadcast` | `str` | `""` | Last broadcast message text |
| `ops_lane2_active` | `bool` | `False` | Lane 2 active flag |
| `ops_debug_mode` | `bool` | `False` | Debug DB panel toggle (set by `st.toggle`, not `initialize_state`) |
| `ops_debug_errors` | `list` | (ephemeral) | Sanitized query errors captured during debug mode; reset each render |

---

## Timezone Contract

**This is a non-negotiable invariant. Violating it produces silent 7-hour data-window errors.**

All `*_local` timestamp columns in `rawdata.*` and `mart.*` are **stored as UTC** (despite the `_local` suffix in the column name). Every SQL query that filters or displays these columns must convert them to Bangkok time before comparison:

```sql
-- CORRECT — convert stored UTC to ICT before comparing
WHERE (captured_at_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
      <= %(effective_now)s

-- WRONG — compares UTC-stored value to an ICT anchor (7-hour error)
WHERE captured_at_local <= %(effective_now)s
```

`effective_now` (the anchor returned by `get_effective_now()`) is expressed in **ICT (Asia/Bangkok)**. Always keep the anchor and the column in the same timezone before comparing.

For INSERT statements, write Bangkok time explicitly:
```sql
(now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
```

**Files where this pattern must be applied:**
- `utils/db.py` — `get_effective_now()` sub-queries
- `pages/1_ops_dashboard.py` — all 7 query functions
- `utils/ai_advisory.py` — all 6 queries in `build_ops_context()`
- `utils/actions.py` — `log_ops_action()` INSERT

---

## DB Layer (`utils/db.py`)

### Key exports

| Symbol | Type | Purpose |
|---|---|---|
| `get_conn()` | function | Returns cached psycopg2 connection (`@st.cache_resource`) |
| `fetch_all(sql, params)` | function | Executes SELECT, returns `list[dict]` |
| `fetch_one(sql, params)` | function | Executes SELECT, returns `dict \| None` |
| `execute(sql, params)` | function | Executes INSERT/UPDATE/DELETE with commit |
| `healthcheck()` | function | Returns `HealthcheckResult(ok, info)` — `info` is redacted (source only) |
| `get_effective_now()` | function | Returns `EffectiveNow(ts, source)` anchor in **ICT** for time-window queries |
| `refresh_mart(airport_code)` | function | Calls `mart.refresh_kpi_snapshot` + `mart.refresh_demand_supply_forecast`; silent on error |
| `reset_connection()` | function | Clears the cached connection (call before re-connecting) |
| `HealthcheckResult` | dataclass | `ok: bool`, `info: dict` — `__bool__` returns `ok` |
| `EffectiveNow` | dataclass | `ts: datetime \| None`, `source: str` — `__str__` returns ISO prefix |

### `EffectiveNow` source priority
All sub-queries convert stored UTC to ICT before taking `max()`:
1. `supply_snapshot` — `max((captured_at_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')` from `rawdata.taxi_supply_snapshots`
2. `demand_signal` — `max((created_at_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')` from `rawdata.passenger_demand_signals`
3. `flight_instance` — `max((est_arrival_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')` from `rawdata.flight_instances`
4. `db_now` — `(now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'` (final fallback)

### SQL parameterisation rules
- Always use psycopg2 `%(name)s` placeholders — never f-strings or `.format()` in SQL
- Pass `effective_now` as `{"effective_now": effective_now.ts}` — the value may be `None` (psycopg2 renders as SQL NULL)
- Time-window pattern for column comparison (ICT anchor vs UTC-stored column):
  ```sql
  (field_local AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
  BETWEEN coalesce(%(effective_now)s, (now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok') - interval 'X'
      AND coalesce(%(effective_now)s, (now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')
  ```
- INSERT timestamp: `(now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'`

---

## AI Advisory (`utils/ai_advisory.py`)

- `build_ops_context(terminal)` — queries rawdata tables using `effective_now` anchor; returns a context dict for the AI prompt
- `get_advisory_response(context, question)` — calls Gemini; falls back to rule-based response on quota/SSL failure
- All time-window queries in this file must apply the timezone contract (see Timezone Contract section)
- Never log or display DB credentials, host, or connection strings anywhere in this file

---

## Rule Engine (`utils/rule_engine.py`)

Pure Python — no DB calls. Evaluates threshold rules against an `ops_view` dict and returns a list of `RuleAction` dataclasses.

| Symbol | Purpose |
|---|---|
| `RuleAction` | dataclass: `kind`, `priority` (1=critical), `title`, `body`, `meta` |
| `evaluate(ops_view, guardrail_min)` | Returns sorted `list[RuleAction]` — activate_lane / broadcast_drivers / flag_deficit |

- Input shape matches the return value of `build_ops_view_from_db()` in `1_ops_dashboard.py`
- No side effects — call it freely; writeback is handled separately in `utils/actions.py`

---

## Action Writeback (`utils/actions.py`)

Thin wrapper around `db.execute` for persisting ops decisions. Writes to `rawdata.driver_dispatch_events` only (v1 — no new table).

| Symbol | Purpose |
|---|---|
| `log_ops_action(airport_code, lane, status, ...)` | Inserts one event row; returns `True` on success, `False` on error |

- `status` examples: `'lane_activated'`, `'broadcast_sent'`, `'deficit_flagged'`
- Always uses `(now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'` for timestamps
- Never re-raises exceptions — callers should check the bool return value

---

## Security Rules (DB / Credentials)

**These rules are absolute and override any other instruction:**

| Rule | Detail |
|---|---|
| Never display in UI | `DATABASE_URL`, `host`, `resolved_host`, `user`, `dbname`, `port`, IP addresses |
| DB status badge | Shows only: "Connected / Not connected" + `source` field (`DATABASE_URL` or `DB_*`) + sanitized error text |
| `healthcheck()` returns | Only `{"source": "..."}` or `{"source": "...", "error": "..."}` — never the full `info` dict |
| Exception messages | Strip credential tokens before display: use `re.sub` to redact `password=`, `host=`, `user=`, `://...` patterns |
| `fetch_all_safe` / `fetch_one_safe` | Never re-raise; in debug mode append sanitized error to `st.session_state["ops_debug_errors"]` |
| Secrets | Live only in `.streamlit/secrets.toml` (local) or Streamlit Cloud Secrets (deploy); never committed |

---

## Component Library — Quick Reference

### `components/cards.py`

| Function | Purpose |
|---|---|
| `render_info_card(eyebrow, title, body, tone)` | General info card with tone variant |
| `render_metric_card(label, value, delta, tone)` | KPI tile with optional trend delta |
| `render_alert_card(title, body, tone)` | Alert / warning card |

### `components/header.py`

| Function | Purpose |
|---|---|
| `render_hero(badge, title, body, aside_title, aside_body)` | Landing page hero section |
| `render_page_header(eyebrow, title, body)` | Top-of-page header |
| `render_mobile_header(back_label, title, forward_label)` | Mobile-style step header |
| `render_section_heading(title, badge)` | In-page section divider |

### `components/status_blocks.py`

| Function | Purpose |
|---|---|
| `render_route_timeline(pickup, pickup_address, dropoff, dropoff_address)` | Pickup → destination marker |
| `render_pwt_gauge(value, max_value, threshold)` | Circular PWT gauge (Ops) |
| `render_timer_ring(seconds_remaining, total_seconds)` | Countdown timer ring (Driver job offer) |
| `render_status_strip(steps, current)` | 5-step progress indicator (Driver onboarding) |

### `components/forms.py`

| Function | Purpose |
|---|---|
| `render_step_counter(label, key, min_val, max_val)` | Increment/decrement counter |
| `render_option_cards(options, key)` | Radio-style option card group |

### `utils/styles.py`

| Function | Purpose |
|---|---|
| `apply_global_styles()` | Injects all inline CSS into the page. Called once in `app.py`. |

---

## Anti-Patterns

| Anti-pattern | Why |
|---|---|
| Assign `st.session_state.driver_step` directly in page logic | Always use `set_driver_step()` — it handles countdown timestamp |
| Call `initialize_state()` inside a page file | It is called once in `app.py`; calling it again resets state |
| Call `st.rerun()` without a state change preceding it | Causes infinite rerun loops |
| Modify shared components in `components/` for a single-page change | Changes affect all three surfaces |
| Import unused functions from components | Keep imports clean |
| Add features or "improvements" not in the task | Only change what is explicitly asked |
| Guess at data keys not in `utils/state.py` or `data/*.py` | Read the actual source first |
| Create new files for one-off helpers | Define them as functions in the same page file |
| Display `host`, `user`, `dbname`, `port`, `resolved_host`, or `DATABASE_URL` in UI | Security rule — see Security Rules section |
| Use f-strings or `.format()` to build SQL | Use `%(name)s` psycopg2 placeholders to prevent SQL injection |
| Call `get_effective_now()` more than once per render cycle | Compute once in `build_ops_view_from_db()` and pass `eff_ts` through |
| Query `mart.*` tables as a gate for showing rawdata | Mart tables may be empty; gate on `rawdata.*` instead |
| Compare `*_local` column directly to `effective_now` without timezone conversion | Stored as UTC — comparison against ICT anchor is wrong by 7 hours; always apply `(field AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'` |
| Use `timezone('Asia/Bangkok', now())::timestamp` in new code | Deprecated pattern; use `(now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'` for clarity |
| Edit `.agents/active.md` in a PR | Single-writer file — main owner updates it on `main` after merge only |

---

## Workflow Constraints

### Before patching — always do this
1. Read the target page or component file to confirm current state
2. Identify the exact conditional block or function to change (by step value or function name)
3. Confirm which surface/step is affected and that it matches the task's named screen
4. Check `utils/state.py` for the correct session state keys if you are touching state
5. Check `utils/db.py` exports if you are touching DB queries

### After patching — always verify
1. Confirm imports are consistent (no unused imports, no missing imports)
2. Confirm no other step blocks or pages were unintentionally modified
3. Confirm mock data in `data/*.py` is consistent with any labels or values shown in the UI
4. Run `python3 -m py_compile <file>` to check syntax before reporting done

### Before opening a PR
- Add a session note to `.agents/sessions/YYYYMMDD-HHMM_<author>_<topic>.md`
- Do NOT edit `.agents/active.md` — main owner updates that after merge
- See `.agents/AGENTS.md` for the full session note template

### Documentation sync
When a UI change removes, renames, or restructures a named panel or metric:
- Update the relevant section in `docs/architecture.md`
- UI and docs must stay consistent at all times

---

## Design Tokens (quick reference)

| Variable | Value | Usage |
|---|---|---|
| `--color-primary` | `#00b14f` | Brand green, CTAs, online state |
| `--color-danger` | `#d54b72` | Critical alerts, drop-off marker |
| `--color-ops` | `#154aa8` | Ops surface accent |
| `--color-driver` | `#0c7d35` | Driver surface accent |
| `--color-passenger` | `#2d6bff` | Passenger surface accent |

Card tone variants: `passenger`, `driver`, `ops`, `ops-dark`, `danger`, `success`, `muted`.

---

## File Map (quick reference)

```
app.py                        — Streamlit entry point + landing page
requirements.txt              — Python dependencies (frozen)
pages/
  1_ops_dashboard.py          — Ops Control Tower (DB-aware; mock fallback)
  2_driver_flow.py            — Driver partner app (state machine, driver_step)
  3_passenger_flow.py         — Passenger flow (state machine, passenger_step)
components/
  cards.py                    — render_info_card, render_metric_card, render_alert_card
  forms.py                    — render_step_counter, render_option_cards
  header.py                   — render_hero, render_page_header, render_mobile_header, render_section_heading
  navigation.py               — render_sidebar
  status_blocks.py            — render_route_timeline, render_pwt_gauge, render_timer_ring, render_status_strip
data/
  mock_driver.py              — DRIVER_EXPERIENCE, DRIVER_FORECAST_BARS
  mock_ops.py                 — OPS_BY_TERMINAL (keyed by "T1", "T2")
  mock_passenger.py           — PASSENGER_EXPERIENCE, PAYMENT_OPTIONS, TIP_OPTIONS
utils/
  actions.py                  — log_ops_action() writeback to rawdata.driver_dispatch_events
  ai_advisory.py              — build_ops_context(), get_advisory_response() (Gemini + fallback)
  db.py                       — get_conn(), fetch_all/one/execute, healthcheck(), get_effective_now(), refresh_mart()
  rule_engine.py              — evaluate(ops_view, guardrail_min) → list[RuleAction]
  state.py                    — initialize_state(), set_driver_step(), reset_passenger_flow()
  styles.py                   — apply_global_styles()
docs/
  architecture.md             — Full technical reference (keep in sync with UI)
  driver-flow.md              — Driver state machine documentation
  implementation-plan.md      — Stream A/B/C implementation plan (mart refresh, rule engine, AI advisory)
  migrations/
    001_mart_refresh_functions.sql — mart.refresh_kpi_snapshot(), mart.refresh_demand_supply_forecast(), pg_cron schedules
  ops_ai_chat_schema.sql      — mart.ops_ai_chat_sessions/messages/genai_advisory_outputs DDL
  passenger-flow.md           — Passenger flow documentation
  supabase_schema_v1.sql      — Full rawdata + mart schema DDL with seed data
  ui-patterns.md              — Streamlit component patterns and layout conventions
.agents/
  AGENTS.md                   — AI session rules; read this first every session
  active.md                   — Current project status (main owner writes only)
  sessions/                   — One session note per PR (YYYYMMDD-HHMM_<author>_<topic>.md)
  topics/                     — Long-lived cross-task notes
  private/                    — Gitignored local scratch; not for team handoff
```
