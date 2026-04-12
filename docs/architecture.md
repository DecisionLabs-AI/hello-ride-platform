# Hello Ride Platform — Architecture

## Overview

Hello Ride is a Streamlit prototype for a proactive taxi dispatch system at Suvarnabhumi Airport (BKK). It demonstrates three operating surfaces that work together to shift the airport queue from reactive dispatching to a signal-driven system that mobilises supply before passengers reach the pickup curb.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI framework | Streamlit | ≥ 1.55, < 2.0 |
| Language | Python | 3.11 |
| Data / tabular | pandas | 2.1.4 |
| Charts | Streamlit native (`st.line_chart`) | — |
| Styling | Inline CSS via `st.markdown(unsafe_allow_html=True)` | — |
| State management | `st.session_state` | — |

---

## Repository Structure

```
hello-ride-platform/
├── app.py                       # Entry point — page config + landing page
├── requirements.txt             # Python dependencies
├── pages/
│   ├── 1_ops_dashboard.py       # Ops Control Tower
│   ├── 2_driver_flow.py         # Driver partner app
│   └── 3_passenger_flow.py      # Passenger portal
├── components/
│   ├── __init__.py
│   ├── cards.py                 # render_info_card, render_metric_card, render_alert_card
│   ├── forms.py                 # render_step_counter, render_option_cards
│   ├── header.py                # render_hero, render_page_header, render_mobile_header, render_section_heading
│   ├── navigation.py            # render_sidebar
│   └── status_blocks.py        # render_route_timeline, render_pwt_gauge, render_timer_ring, render_status_strip
├── data/
│   ├── __init__.py
│   ├── mock_driver.py           # DRIVER_EXPERIENCE, DRIVER_FORECAST_BARS
│   ├── mock_ops.py              # OPS_BY_TERMINAL (keyed by "T1", "T2")
│   └── mock_passenger.py        # PASSENGER_EXPERIENCE, PAYMENT_OPTIONS, TIP_OPTIONS
├── utils/
│   ├── __init__.py
│   ├── state.py                 # initialize_state(), set_driver_step(), reset_passenger_flow()
│   └── styles.py                # apply_global_styles() — 650+ lines of inline CSS
└── docs/
    ├── architecture.md
    ├── driver-flow.md
    ├── passenger-flow.md
    └── ui-patterns.md
```

---

## Application Surfaces

The app has three distinct user-facing surfaces, each as a Streamlit page.

```
app.py                  Landing page — prototype overview and navigation
pages/1_ops_dashboard   Ops Control Tower
pages/2_driver_flow     Driver partner app
pages/3_passenger_flow  Passenger portal
```

### Passenger Surface (`pages/3_passenger_flow.py`)

A mobile-style flow simulating a passenger arriving at the airport.

**Screens (multi-step state machine on `passenger_step`):**

```
home → carType → ride → review → [submitted]
```

| Step | Key session state |
|---|---|
| `home` | `passenger_destination`, `passenger_destination_mode`, `passenger_count`, `passenger_luggage`, `passenger_special_assistance`, `passenger_notes` |
| `carType` | `passenger_selected_ride` (validated against capacity), `passenger_payment` |
| `ride` | Read-only summary |
| `review` | `passenger_rating`, `passenger_tip`, `passenger_comment`, `passenger_review_submitted` |

**Ride eligibility** is computed inline based on `passenger_count` and `passenger_luggage` against each ride's `maxPassengers` and `maxLuggage` from `PASSENGER_EXPERIENCE["rides"]`.

---

### Driver Surface (`pages/2_driver_flow.py`)

A mobile-style flow covering the full driver partner lifecycle.

**Screens (state machine on `driver_step`):**

```
login → registration → guide
                         ↓
                     jobRequest  (countdown timer)
                         ↓
                   tripNavigation
                         ↓
                   paymentComplete → guide
```

Note: `applicationStatus` remains in the SCREENS dict but is no longer on the critical path. Registration sets `driver_verified = True` and `driver_approved = True` automatically and routes directly to `guide`.

**Key session state:**

| Key | Type | Purpose |
|---|---|---|
| `driver_step` | `str` | Active screen |
| `driver_registered` | `bool` | Registration form submitted |
| `driver_verified` | `bool` | Set to `True` on registration submit |
| `driver_approved` | `bool` | Set to `True` on registration submit |
| `driver_online` | `bool` | Driver is available for jobs |
| `driver_job_started_at` | `float \| None` | Unix timestamp when job offer started |
| `driver_offer_expired` | `bool` | Countdown expired flag |

**Countdown timer** is implemented by comparing `time.time()` to `driver_job_started_at`. When elapsed ≥ 12 seconds, the offer is marked expired and the driver is returned to `guide`. `set_driver_step("jobRequest")` (in `utils/state.py`) sets `driver_job_started_at` on entry.

**Online toggle semantics:**
- On the `guide` screen: toggling online sets `driver_online = True` and transitions to `jobRequest`.
- During `tripNavigation`: toggling only updates `driver_online` — never triggers a screen transition.

---

### Ops Surface (`pages/1_ops_dashboard.py`)

A desktop-first operations dashboard with two workspace modes.

**Workspace toggle (`ops_workspace`):**
- `"Live Monitoring"` — PWT gauge, metric tiles, forecast chart, flight wave, demand signals, supply telemetry
- `"AI Advisory"` — AI chatbot interface with mock responses

**Terminal selector (`ops_terminal`):** switches data between `"T1"`, `"T2"`, and `"All"` via `OPS_BY_TERMINAL` in `data/mock_ops.py`.

**Key panels (Live Monitoring — stage order):**

| Stage | Panel | Data source |
|---|---|---|
| 1 | Critical Alert (conditional, PWT > guardrail) | `ops["pwt"]`, `ops["projectedDeficit"]`, `ops["aiAdvice"]` |
| 2 | KPI summary — PWT gauge + metric tiles | `ops["pwt"]`, `ops["waitingPassengers"]`, `ops["holdingTaxis"]`, `ops["laneLoad"]`, `ops["fleetReadiness"]`, `ops["projectedDeficit"]` |
| 3 | AI Advisory (standalone ops-blue card) | `ops["aiAdvice"]` |
| 4 | Deficit Breakdown — WHY | `ops["deficitBreakdown"]` |
| 5 | Impact Simulation — SO WHAT | `ops["impactSimulation"]` |
| 6 | OPS Control Actions — WHAT TO DO | `ops_extra_lane_active`, `ops_last_broadcast`, `ops_lane2_active` |
| 7 | Arrival Wave Chart | `ops["forecast"]` (`st.line_chart`, demand vs supply series) |
| 8 | Supporting data tables | `ops["flights"]`, `ops["demandSignals"]`, `ops["supply"]` |

---

## Data Layer

All mock data lives in three Python modules under `data/`.

### `data/mock_passenger.py`

```python
PASSENGER_EXPERIENCE = {
  "currentFlight": { "code", "origin", "landedAt", "baggageClaim", "terminal" },
  "signal":        { "capturedAt", "headStartMin", "confidence", "pwtSavedMin", "partySize", "luggage", "specialAssistance" },
  "route":         { "pickup", "dropoff", "walkToCurbMin" },
  "rides": [       # consumed by carType step
    { "id", "label", "description", "price", "maxPassengers", "maxLuggage" }
  ],
  "tracking":      { "driver", "vehicle", "plate", "eta", "distanceKm", "rating" },
}
PAYMENT_OPTIONS = [...]   # list of { "id", "label" }
TIP_OPTIONS = [...]        # list of tip strings e.g. "฿50"
```

### `data/mock_driver.py`

```python
DRIVER_EXPERIENCE = {
  "profile":     { "name", "status", "score", "vehicle" },
  "incomingJob": { "pickup", "dropoff", "flightRef", "payout", "distance", "etaToPickup", "countdown", "passengers", "luggage", "payment" },
  "readiness":   [{ "label", "value" }],
  "signals":     [{ "label", "value" }],
  "guideTrip":   { "passengerName", "pickup", "pickupAddress", "dropoff", "dropoffAddress", "eta", "distance", "payout", "fareBreakdown" },
}
# fareBreakdown: { distanceKm, distanceFare, durationMin, durationFare, bookingFee }
# fareBreakdown line items must sum to payout

DRIVER_FORECAST_BARS = [
  { "time", "height", "type", "label" }  # type: "normal" | "surge" | "peak"
]
```

### `data/mock_ops.py`

```python
OPS_BY_TERMINAL = {
  "T1": {
    "pwt", "waitingPassengers", "waitingTrend", "holdingTaxis", "taxiTrend",
    "laneLoad", "fleetReadiness", "projectedDeficit", "aiAdvice",
    "criticalWindow":    { "start", "end" },
    "flights":           [{ "code", "origin", "eta", "terminal", "status", "demand" }],
    "demandSignals":     [{ "time", "zone", "parties", "luggage" }],
    "supply":            [{ "name", "value", "detail" }],
    "forecast":          [{ "time", "demand", "supply" }],
    "deficitBreakdown":  [{ "factor", "impact", "type" }],  # type: "demand" | "supply"
    "impactSimulation":  { "current_pwt", "projected_pwt", "pwt_reduction_pct",
                           "current_deficit", "projected_deficit",
                           "queue_time_reduction", "action" },
  },
  "T2": { ... },
}
```

---

## Shared UI Component Library

All components are plain Python functions that render Streamlit elements.

### `components/cards.py`

| Function | Signature | Purpose |
|---|---|---|
| `render_info_card` | `(eyebrow, title, body, tone="default")` | General info card |
| `render_metric_card` | `(label, value, delta=None, tone="default")` | KPI display tile |
| `render_alert_card` | `(title, body, tone="danger")` | Alert / warning card |

### `components/header.py`

| Function | Signature | Purpose |
|---|---|---|
| `render_hero` | `(badge, title, body, aside_title, aside_body)` | Landing page hero |
| `render_page_header` | `(eyebrow, title, body)` | Top-of-page header |
| `render_mobile_header` | `(back_label, title, forward_label)` | Mobile step header |
| `render_section_heading` | `(title, badge=None)` | In-page section divider |

### `components/status_blocks.py`

| Function | Signature | Purpose |
|---|---|---|
| `render_route_timeline` | `(pickup, pickup_address, dropoff, dropoff_address)` | Pickup → destination indicator |
| `render_pwt_gauge` | `(value, max_value, threshold)` | Circular PWT gauge (Ops) |
| `render_timer_ring` | `(seconds_remaining, total_seconds)` | Countdown timer (Driver job offer) |
| `render_status_strip` | `(steps, current)` | 5-step progress bar (Driver onboarding) |

### `components/forms.py`

| Function | Signature | Purpose |
|---|---|---|
| `render_step_counter` | `(label, key, min_val, max_val)` | Increment/decrement counter |
| `render_option_cards` | `(options, key)` | Radio-style option card group |

---

## Styling

All CSS is defined in `utils/styles.py` and injected once at app startup by `apply_global_styles()` in `app.py` via `st.markdown(..., unsafe_allow_html=True)`.

**CSS variable tokens (`:root`):**

| Variable | Value | Usage |
|---|---|---|
| `--hr-bg` | `#f6fbf7` | Base background reference |
| `--hr-surface` | `rgba(255,255,255,0.96)` | Card / hero surface fill |
| `--hr-card` | `#ffffff` | Solid card fill |
| `--hr-foreground` | `#0f172a` | Body text |
| `--hr-muted` | `#64748b` | Secondary / caption text |
| `--hr-border` | `#d9e4ee` | Input and row borders |
| `--hr-primary` | `#00b14f` | Brand green, CTAs, online state |
| `--hr-primary-deep` | `#0c7d35` | Driver accent, hover states |
| `--hr-secondary` | `#154aa8` | Ops surface accent |
| `--hr-danger` | `#b91c1c` | Critical alerts |
| `--hr-danger-deep` | `#991b1b` | Gauge and deep danger states |
| `--hr-info` | `#2d6bff` | Passenger surface accent |

**`st.container(border=True)` styling:**

`[data-testid="stVerticalBlockBorderWrapper"]` is targeted globally to give every bordered container a white surface (`rgba(255,255,255,0.98)`), a visible slate border, and a soft shadow — ensuring cards separate clearly from the tinted page background on all surfaces.

**Card tone variants** (`tone` parameter on card components): `default`, `passenger`, `driver`, `ops`, `ops-dark`, `danger`, `success`, `muted`.

---

## State Management

The prototype uses `st.session_state` for all stateful values. State is initialised once at app startup by `initialize_state()` in `utils/state.py`, which sets defaults only for keys not already present (safe for reruns).

**Helper functions in `utils/state.py`:**

| Function | Purpose |
|---|---|
| `initialize_state()` | Set all session state defaults. Called once in `app.py`. |
| `set_driver_step(step)` | Transition driver to a new step. Also sets `driver_job_started_at` for `"jobRequest"`. |
| `reset_passenger_flow()` | Reset all `passenger_*` keys to initial values. |

**Ops-specific state keys:**

| Key | Type | Default | Purpose |
|---|---|---|---|
| `ops_terminal` | `str` | `"T1"` | Selected terminal context |
| `ops_workspace` | `str` | `"Live Monitoring"` | Active workspace tab |
| `ops_guardrail_min` | `int` | `10` | PWT threshold for critical alert |
| `ops_extra_lane_active` | `bool` | `False` | Overflow lane toggle |
| `ops_last_broadcast` | `str` | `""` | Timestamp of last driver broadcast (HH:MM) |
| `ops_lane2_active` | `bool` | `False` | Lane 2 open/close toggle |

**Implications:**
- State persists across page navigation within the same browser session.
- Refreshing the browser resets all session state to defaults.

---

## Production Readiness Gaps

This is a prototype. The following are required before production deployment:

| Area | Gap |
|---|---|
| Backend | No API integration; all data is static mock |
| Authentication | No auth layer on any surface |
| State persistence | Session state resets on browser refresh |
| Error handling | No error boundaries or loading/error states |
| Input validation | Minimal; no server-side validation |
| Testing | No unit, integration, or E2E tests |
| Real-time data | No WebSocket or polling for live PWT / flight data |
| Monitoring | No analytics, error tracking, or logging |
