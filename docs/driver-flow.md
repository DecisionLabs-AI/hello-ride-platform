# Driver Flow

> Implemented in `pages/2_driver_flow.py`. State is managed via `st.session_state` keys defined in `utils/state.py`.

## Overview

The driver surface is a multi-screen state machine gated on `st.session_state.driver_step`. Each step value maps to a distinct conditional block rendered by `pages/2_driver_flow.py`. All transitions use `set_driver_step()` from `utils/state.py`.

---

## Session State Variables

| Key | Type | Initial | Purpose |
|---|---|---|---|
| `driver_step` | `str` | `"login"` | Active screen |
| `driver_registered` | `bool` | `False` | Registration form submitted |
| `driver_verified` | `bool` | `False` | Face scan passed |
| `driver_approved` | `bool` | `False` | Academy + background check passed |
| `driver_online` | `bool` | `False` | Driver is available for jobs |
| `driver_in_queue` | `bool` | `False` | Driver is in holding queue |
| `driver_queue_position` | `int` | `8` | Position in queue |
| `driver_queue_wait_min` | `int` | `12` | Estimated queue wait (minutes) |
| `driver_face_scan_started` | `bool` | `False` | Face scan animation started |
| `driver_job_started_at` | `float \| None` | `None` | Timestamp when job offer started |
| `driver_offer_expired` | `bool` | `False` | Job offer countdown expired |
| `driver_registration` | `dict` | `{firstName, lastName, phone}` | Registration form fields |

---

## Screen Map

```
login
 ├─ Register → registration
 └─ Login    → guide (sets driver_registered, driver_verified, driver_approved = True)

registration → verification    (submit document)
verification → applicationStatus (face scan done)
applicationStatus → guide      (ready to go online, requires driver_approved)

guide
 └─ Go Online toggle (on) → jobRequest   (set_driver_step)
 └─ Accept Queue button  → jobRequest   (set_driver_step)

jobRequest
 ├─ Accept → tripNavigation              (set_driver_step)
 ├─ Decline → guide                      (set_driver_step)
 └─ Countdown reaches 0 → guide         (auto-reject, driver_offer_expired = True)

tripNavigation → paymentComplete        (Arrived at Pick-up)

paymentComplete → guide                 (Confirm Payment, sets driver_online = True)
```

---

## Screen Details

### `login` — `driver_step == "login"`

Driver onboarding landing page.

- **Register CTA:** sets `driver_step = "registration"` via `set_driver_step`
- **Login CTA:** sets `driver_registered`, `driver_verified`, `driver_approved` = `True`, transitions to `"guide"` (bypasses onboarding for demo)

---

### `registration` — `driver_step == "registration"`

Controlled form: `firstName`, `lastName`, `phone`. All fields update `st.session_state.driver_registration`.

- **Submit:** sets `driver_registered = True`, transitions to `"verification"`

---

### `verification` — `driver_step == "verification"`

Face scan simulation.

- **Start Scan:** sets `driver_face_scan_started = True`, `driver_verified = True`
- **Done:** transitions to `"applicationStatus"`

---

### `applicationStatus` — `driver_step == "applicationStatus"`

Academy + background check status screen.

- **Complete Academy:** sets `driver_approved = True` (only if `driver_registered` and `driver_verified`)
- **Ready to Go Online:** transitions to `"guide"`

---

### `guide` — `driver_step == "guide"`

Main driver home screen. Shown after onboarding and after each completed trip.

**Key sections (top to bottom):**
1. Go Online — toggle bound to `driver_online`
2. Active Incentives — static area bonus card
3. High Demand — alert card with "Accept Queue" CTA
4. Today's Demand Forecast — bar chart from `DRIVER_FORECAST_BARS`
5. Bottom nav — Home / Earnings / Activity / Account (decorative)

**Navigation from this screen:**
- Go Online toggle switched ON → `set_driver_step("jobRequest")`, `driver_online = True`
- "Accept Queue" button → `set_driver_step("jobRequest")` (does not change `driver_online`)

**Important:** The online toggle on this screen is the only place that both sets `driver_online` and triggers a step transition. The mid-trip toggle (`tripNavigation`) only updates `driver_online` — no step transition.

---

### `jobRequest` — `driver_step == "jobRequest"`

Incoming job offer with countdown timer.

**Countdown timer:**
- `driver_job_started_at` is set by `set_driver_step("jobRequest")` in `utils/state.py`
- Elapsed time is computed as `time.time() - driver_job_started_at`
- At 12 seconds elapsed: sets `driver_offer_expired = True`, auto-returns to `"guide"`
- Uses `st.rerun()` to refresh the countdown display

**Job data:** sourced from `DRIVER_EXPERIENCE["guideTrip"]` in `data/mock_driver.py`. This is the single source of truth — the same object is used on `tripNavigation` and `paymentComplete`.

**Navigation:**
- Accept → `set_driver_step("tripNavigation")`
- Decline → `set_driver_step("guide")`

---

### `tripNavigation` — `driver_step == "tripNavigation"`

Active trip screen. Shows passenger info, fare, route (pickup → destination).

**Trip data:** sourced from `DRIVER_EXPERIENCE["guideTrip"]` in `data/mock_driver.py` — same object as the job offer preview. Fields used: `passengerName`, `pickup`, `pickupAddress`, `dropoff`, `dropoffAddress`, `payout`.

**Route display:** rendered via `render_route_timeline()` from `components/status_blocks.py`.

**Online toggle:** updates `driver_online` only — never triggers a step transition.

**Navigation:**
- "Arrived at Pick-up" → `set_driver_step("paymentComplete")`

---

### `paymentComplete` — `driver_step == "paymentComplete"`

Fare breakdown and payment confirmation screen.

**Fare data:** sourced from `DRIVER_EXPERIENCE["guideTrip"]["fareBreakdown"]` in `data/mock_driver.py`. The line items (`distanceFare`, `durationFare`, `bookingFee`) must always sum to `guideTrip["payout"]`.

**Navigation:**
- "Confirm Payment" → sets `driver_online = True`, `set_driver_step("guide")`

---

## Transition Reference

| From | Action | To | State changes |
|---|---|---|---|
| `login` | Register | `registration` | — |
| `login` | Login | `guide` | `driver_registered`, `driver_verified`, `driver_approved` = `True` |
| `registration` | Submit | `verification` | `driver_registered` = `True` |
| `verification` | Start Scan | — | `driver_face_scan_started` = `True`, `driver_verified` = `True` |
| `verification` | Done | `applicationStatus` | — |
| `applicationStatus` | Complete Academy | — | `driver_approved` = `True` (conditional) |
| `applicationStatus` | Ready to Go Online | `guide` | — |
| `guide` | Go Online (on) | `jobRequest` | `driver_online` = `True`, `driver_job_started_at` set |
| `guide` | Accept Queue | `jobRequest` | `driver_job_started_at` set |
| `jobRequest` | Accept | `tripNavigation` | — |
| `jobRequest` | Decline | `guide` | — |
| `jobRequest` | Countdown expires | `guide` | `driver_offer_expired` = `True` |
| `tripNavigation` | Arrived | `paymentComplete` | — |
| `paymentComplete` | Confirm Payment | `guide` | `driver_online` = `True` |

---

## Mock Data Reference

All driver screen data comes from `DRIVER_EXPERIENCE` in `data/mock_driver.py`:

```
DRIVER_EXPERIENCE["profile"]          — name, status, score, vehicle
DRIVER_EXPERIENCE["incomingJob"]      — pickup, dropoff, flightRef, payout, distance, etaToPickup, countdown, passengers, luggage, payment
DRIVER_EXPERIENCE["readiness"]        — [{ label, value }] — pre-trip checklist rows
DRIVER_EXPERIENCE["signals"]          — [{ label, value }] — ops signal rows
DRIVER_EXPERIENCE["guideTrip"]        — passengerName, pickup, pickupAddress, dropoff, dropoffAddress, eta, distance, payout, fareBreakdown
DRIVER_EXPERIENCE["guideTrip"]["fareBreakdown"]  — distanceKm, distanceFare, durationMin, durationFare, bookingFee
                                                    (items must sum to guideTrip["payout"])
```

`DRIVER_FORECAST_BARS` — list of `{ time, height, type, label }` — drives the demand forecast bar chart on the guide screen.
