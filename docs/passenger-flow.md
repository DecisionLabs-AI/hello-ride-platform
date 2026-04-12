# Passenger Flow

> Implemented in `pages/3_passenger_flow.py`. State is managed via `st.session_state` keys defined in `utils/state.py`.

## Overview

The passenger surface is a multi-screen state machine gated on `st.session_state.passenger_step`. Each step value maps to a distinct conditional block rendered by `pages/3_passenger_flow.py`. Passenger flow can be reset at any time by calling `reset_passenger_flow()` from `utils/state.py`.

---

## Session State Variables

| Key | Type | Initial | Purpose |
|---|---|---|---|
| `passenger_step` | `str` | `"home"` | Active screen |
| `passenger_destination` | `str \| dict` | `""` | Confirmed destination — either `""` or `{"mode": "selected"\|"free_text", "value": str}` |
| `passenger_destination_input` | `str` | `""` | Live text input value (Streamlit widget key) |
| `passenger_destination_mode` | `str` | `"free_text"` | Hidden widget tracking whether destination was chosen from presets (`"selected"`) or typed (`"free_text"`) |
| `passenger_destination_debug` | `str` | `""` | Internal debug string (not rendered) |
| `passenger_count` | `int` | `1` | Number of passengers |
| `passenger_luggage` | `int` | `1` | Number of luggage items |
| `passenger_special_assistance` | `bool` | `False` | Accessibility vehicle requested |
| `passenger_notes` | `str` | `""` | Free-text trip notes |
| `passenger_selected_ride` | `str` | `""` | ID of selected ride option |
| `passenger_payment` | `str` | `""` | Selected payment method ID |
| `passenger_rating` | `int` | `5` | Star rating (1–5) |
| `passenger_tip` | `str` | `"฿50"` | Selected tip value |
| `passenger_comment` | `str` | `""` | Review text |
| `passenger_review_submitted` | `bool` | `False` | Review submitted flag |

---

## Screen Map

```
home → carType    (Confirm Pick-up button)
carType → ride    (Book button, requires eligible ride selected)
ride → review     (Continue button)
review → [submitted state]   (Submit Review button)
[submitted] → home           (Back to Home — calls reset_passenger_flow())
```

---

## Ride Eligibility

Ride eligibility is computed inline each render from `PASSENGER_EXPERIENCE["rides"]`:

```python
is_eligible = (passenger_count <= ride["maxPassengers"]
               and passenger_luggage <= ride["maxLuggage"])
reason = "" if is_eligible else f"Supports up to {ride['maxPassengers']} passengers and {ride['maxLuggage']} luggage"
```

`canBook` is `True` only when `passenger_selected_ride` is non-empty and the selected ride is eligible.

When `passenger_count` or `passenger_luggage` changes to make the current `passenger_selected_ride` ineligible, `passenger_selected_ride` is reset to `""` to prevent booking an ineligible ride.

---

## Screen Details

### `home` — `passenger_step == "home"`

Mobile-style home screen. Passenger enters destination, counts, and optional trip details.

**Sections:**
1. **Destination input** — `st.text_input` bound to `passenger_destination_input` plus a hidden `passenger_destination_mode` widget. An autocomplete dropdown of preset Bangkok destinations (`DESTINATION_PRESETS`) appears as the user types. Confirmation is **Enter-only**:
   - Arrow keys highlight a suggestion; Enter selects it as `mode="selected"`.
   - Enter with no highlighted suggestion and ≥ 3 characters accepts the typed text as `mode="free_text"`.
   - Enter with < 3 characters triggers Streamlit's native rerun, which shows the inline validation error without advancing the step.
   - There is no Go/Use button. Clicking a suggestion is supported but not required.
2. **Route summary** — read-only pickup → destination timeline
3. **Trip details card** — passenger counter, luggage counter (`render_step_counter` from `components/forms.py`), special assistance toggle, additional notes
4. **Confirm Pick-up** button — disabled while `passenger_confirm_errors()` is non-empty → `passenger_step = "carType"`

**Destination validation rules** (`passenger_destination_is_valid()`):
- `mode == "selected"` → always valid
- `mode == "free_text"` → valid only if `len(value) >= 3`
- Empty → invalid (`"Please enter your destination"`)

**Header:** `render_mobile_header` — no back arrow (first step).

---

### `carType` — `passenger_step == "carType"`

Ride type and payment selection.

**Sections:**
1. **Journey summary** — read-only route display with pickup and destination
2. **Ride selection** — `render_option_cards` with eligibility; ineligible options display reason text and are unselectable
3. **Payment selection** — wallet or card, radio-style from `PAYMENT_OPTIONS`
4. **Book** button — disabled unless `canBook`; on click → `passenger_step = "ride"`

**Header:** back arrow → `"home"`.

---

### `ride` — `passenger_step == "ride"`

Post-booking confirmation / trip-in-progress screen. Read-only summary.

**Sections:**
1. Map placeholder card — "Arrived at Destination" + fare display
2. Trip summary — driver info from `PASSENGER_EXPERIENCE["tracking"]`, vehicle, passenger count, luggage count, ride type, payment method, additional notes
3. **Continue** button → `passenger_step = "review"`

**Header:** back arrow → `"carType"`.

---

### `review` — `passenger_step == "review"`

Post-trip rating and tip screen.

**Sections:**
1. Driver card — name, vehicle, plate from `PASSENGER_EXPERIENCE["tracking"]`
2. Star rating — 5-button row; `passenger_rating` highlights filled stars
3. Tip selection — `TIP_OPTIONS` rendered via `render_option_cards`
4. Comment text area
5. **Submit Review** button → sets `passenger_review_submitted = True`

**Submitted state (same step, different render):**
When `passenger_review_submitted == True`, renders a confirmation card and a "Back to Home" button that calls `reset_passenger_flow()` and navigates to `"home"`.

**Header:** X button → `"ride"`.

---

## Mock Data Reference

All passenger screen data comes from `PASSENGER_EXPERIENCE` in `data/mock_passenger.py`:

```
PASSENGER_EXPERIENCE["currentFlight"]  — code, origin, landedAt, baggageClaim, terminal
PASSENGER_EXPERIENCE["signal"]         — capturedAt, headStartMin, confidence, pwtSavedMin, partySize, luggage, specialAssistance
PASSENGER_EXPERIENCE["route"]          — pickup, dropoff, walkToCurbMin
PASSENGER_EXPERIENCE["rides"]          — [{ id, label, description, price, maxPassengers, maxLuggage }]
PASSENGER_EXPERIENCE["tracking"]       — driver, vehicle, plate, eta, distanceKm, rating
```

`PASSENGER_EXPERIENCE["rides"]` is the source of truth for ride options. Changes to `maxPassengers` or `maxLuggage` here directly affect ride eligibility logic.

```
PAYMENT_OPTIONS  — [{ id, label }]           # consumed by carType payment selector
TIP_OPTIONS      — ["฿10", "฿20", ...]       # consumed by review tip selector
```
