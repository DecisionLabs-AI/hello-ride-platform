# Hello Ride Platform — Claude Code Rules

## Project Context

Hello Ride is a **Streamlit prototype** for a proactive taxi dispatch system at Suvarnabhumi Airport (BKK). It is a Python + Streamlit multi-page app. There is no React frontend. All data is static mock data in `data/mock_driver.py`, `data/mock_passenger.py`, and `data/mock_ops.py`.

---

## Scope Rules

### What is in scope
- Editing Python page logic inside `pages/`
- Editing Python component functions inside `components/`
- Editing mock data inside `data/`
- Editing state management helpers inside `utils/state.py`
- Editing global styling inside `utils/styles.py`
- Editing documentation in `docs/` and `README.md`

### What is out of scope — never touch without explicit instruction
- `app.py` page config block (`st.set_page_config`) and top-level layout — unless the task explicitly names it
- `requirements.txt` — frozen unless the user explicitly asks
- `.gitignore` — frozen unless the user explicitly asks
- Other page files when the task names a specific page
- `components/` shared components — changes there affect all three surfaces

---

## Page / Screen Inventory

Each surface has an unofficial name used in task descriptions. Map these carefully before patching:

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

### Ops keys

| Key | Type | Initial | Purpose |
|---|---|---|---|
| `ops_terminal` | `str` | `"T1"` | Selected terminal (T1 / T2 / All) |
| `ops_workspace` | `str` | `"Live Monitoring"` | Active workspace tab |
| `ops_guardrail_min` | `int` | `10` | PWT guardrail threshold (minutes) |
| `ops_extra_lane_active` | `bool` | `False` | Extra lane activated flag |
| `ops_last_broadcast` | `str` | `""` | Last broadcast message text |

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

### Never do these

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

---

## Workflow Constraints

### Before patching — always do this
1. Read the target page or component file to confirm current state
2. Identify the exact conditional block or function to change (by step value or function name)
3. Confirm which surface/step is affected and that it matches the task's named screen
4. Check `utils/state.py` for the correct session state keys if you are touching state

### After patching — always verify
1. Confirm imports are consistent (no unused imports, no missing imports)
2. Confirm no other step blocks or pages were unintentionally modified
3. Confirm mock data in `data/*.py` is consistent with any labels or values shown in the UI

### Documentation sync
When a UI change removes, renames, or restructures a named panel or metric:
- Update the relevant section in `docs/architecture.md`
- UI and docs must stay consistent at all times

---

## Design Tokens (quick reference)

These CSS variables are injected by `utils/styles.py`:

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
requirements.txt              — Python dependencies (streamlit, pandas, altair)
pages/
  1_ops_dashboard.py          — Ops Control Tower
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
  state.py                    — initialize_state(), set_driver_step(), reset_passenger_flow()
  styles.py                   — apply_global_styles()
docs/
  architecture.md             — Full technical reference (keep in sync with UI)
  driver-flow.md              — Driver state machine documentation
  passenger-flow.md           — Passenger flow documentation
  ui-patterns.md              — Streamlit component patterns and layout conventions
```
