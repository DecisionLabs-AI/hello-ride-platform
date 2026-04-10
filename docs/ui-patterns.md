# UI Patterns

Reference for layout patterns, shared components, and design conventions used across all three surfaces.

All components are plain Python functions in `components/`. They render Streamlit elements and inject HTML/CSS via `st.markdown(..., unsafe_allow_html=True)`. Global CSS is applied once by `apply_global_styles()` in `utils/styles.py`.

---

## Component Library

### `components/cards.py`

#### `render_info_card(eyebrow, title, body, tone="default")`

General info card. Used on the landing page, within surface pages, and for contextual content blocks.

```python
render_info_card(
    eyebrow="Passenger Portal",
    title="Capture demand before passengers hit the curb",
    body="QR-triggered early demand, assisted ride selection...",
    tone="passenger",
)
```

| Param | Type | Notes |
|---|---|---|
| `eyebrow` | `str` | Small uppercase label above title |
| `title` | `str` | Card heading |
| `body` | `str` | Body text |
| `tone` | `str` | One of: `default`, `passenger`, `driver`, `ops`, `ops-dark`, `danger`, `success`, `muted` |

---

#### `render_metric_card(label, value, delta=None, tone="default")`

KPI display tile. Used in the Ops dashboard for numeric metrics with optional trend delta.

```python
render_metric_card(
    label="Waiting pax",
    value=342,
    delta="+12%",
    tone="ops",
)
```

| Param | Type | Notes |
|---|---|---|
| `label` | `str` | Uppercase label above the value |
| `value` | `str \| int` | Main displayed metric |
| `delta` | `str \| None` | Trend label (e.g. `"+12%"`); omit to hide |
| `tone` | `str` | Card tone variant |

---

#### `render_alert_card(title, body, tone="danger")`

Alert or advisory card. Used for the Ops AI advisory, projected deficit alerts, and high-demand notices.

```python
render_alert_card(
    title="Projected Deficit",
    body="45 drivers short in next 15 minutes.",
    tone="danger",
)
```

---

### `components/header.py`

#### `render_hero(badge, title, body, aside_title, aside_body)`

Landing page hero section with a badge, headline, body text, and an aside panel.

```python
render_hero(
    badge="Hello Ride prototype",
    title="Predictive Dispatching for Proactive Taxi Operations",
    body="A Streamlit prototype preserving three operating surfaces...",
    aside_title="Design intent",
    aside_body="Shift the airport queue from reactive dispatching to signal-driven supply mobilisation.",
)
```

---

#### `render_page_header(eyebrow, title, body)`

Top-of-page header. Used at the top of each surface page.

```python
render_page_header(
    eyebrow="OPS Control Tower",
    title="Live Monitoring",
    body="Real-time demand and supply telemetry for Terminal 1.",
)
```

---

#### `render_mobile_header(back_label, title, forward_label)`

Mobile-style step header with optional back and forward labels. Used within passenger and driver step flows.

```python
render_mobile_header(
    back_label="← Back",
    title="Hello Ride",
    forward_label="",
)
```

---

#### `render_section_heading(title, badge=None)`

In-page section divider. Used to separate logical groups within a page.

```python
render_section_heading("Today's Demand Forecast", badge="Live")
```

---

### `components/status_blocks.py`

#### `render_route_timeline(pickup, pickup_address, dropoff, dropoff_address)`

Pickup → destination indicator with a vertical connector line. Used on the driver trip navigation screen and the passenger home screen.

```python
render_route_timeline(
    pickup="Marina Bay Sands, Tower 3",
    pickup_address="10 Bayfront Ave, Singapore 018956",
    dropoff="Changi Airport Terminal 4",
    dropoff_address="Airport Blvd, Singapore 819665",
)
```

**Connector line rule:** the line between pickup and destination is content-driven — it stretches to the height of the pickup content. Never use a fixed height on the connector. The implementation uses CSS `flex: 1` on the connector element.

---

#### `render_pwt_gauge(value, max_value, threshold)`

Circular SVG gauge for Passenger Wait Time. Used in the Ops Live Monitoring workspace.

```python
render_pwt_gauge(value=18, max_value=30, threshold=10)
```

| Param | Notes |
|---|---|
| `value` | Current PWT in minutes |
| `max_value` | Maximum scale value |
| `threshold` | Guardrail threshold; arc turns red above this value |

---

#### `render_timer_ring(seconds_remaining, total_seconds)`

Countdown timer ring using a conic gradient. Used on the driver `jobRequest` screen.

```python
render_timer_ring(seconds_remaining=8, total_seconds=12)
```

---

#### `render_status_strip(steps, current)`

5-step horizontal progress indicator. Used on the driver `applicationStatus` screen.

```python
render_status_strip(
    steps=["Submitted", "Verifying", "Training", "Background", "Active"],
    current=2,
)
```

---

### `components/forms.py`

#### `render_step_counter(label, key, min_val, max_val)`

Increment/decrement counter bound to a session state key. Used for passenger count and luggage count on the passenger `home` screen.

```python
render_step_counter(label="Passengers", key="passenger_count", min_val=1, max_val=6)
render_step_counter(label="Luggage", key="passenger_luggage", min_val=0, max_val=9)
```

| Param | Notes |
|---|---|
| `label` | Display label above the counter |
| `key` | `st.session_state` key to read and update |
| `min_val` | Minimum allowed value |
| `max_val` | Maximum allowed value |

---

#### `render_option_cards(options, key)`

Radio-style option card group. Selected option is stored in `st.session_state[key]`. Used for ride type selection and tip selection.

```python
render_option_cards(
    options=[
        {"id": "hello-taxi", "label": "Hello Taxi", "description": "Metered queue · 3 mins", "price": "THB 350"},
        {"id": "hello-car", "label": "Hello Car", "description": "Comfort sedan · 5 mins", "price": "THB 420"},
    ],
    key="passenger_selected_ride",
)
```

---

## Styling

### Global CSS injection

All styles are defined in `utils/styles.py` and injected once at app startup by `apply_global_styles()` in `app.py`. Never call `apply_global_styles()` inside a page file.

```python
# In app.py only:
from utils.styles import apply_global_styles
apply_global_styles()
```

### Design tokens

CSS custom properties available globally after `apply_global_styles()`:

| Variable | Value | Usage |
|---|---|---|
| `--color-primary` | `#00b14f` | Brand green, CTAs, online state |
| `--color-danger` | `#d54b72` | Critical alerts, drop-off marker |
| `--color-ops` | `#154aa8` | Ops surface accent |
| `--color-driver` | `#0c7d35` | Driver surface accent |
| `--color-passenger` | `#2d6bff` | Passenger surface accent |
| `--color-warning` | `#f59e0b` | Surge indicators |
| `--color-success` | `#29a85a` | Positive states |

### Card tone variants

The `tone` parameter on card components maps to a CSS class that sets the card's background, text colour, and border:

| Tone | Visual | Used on |
|---|---|---|
| `default` | White card | General content |
| `passenger` | Blue-tinted | Passenger surface cards |
| `driver` | Green-tinted | Driver surface cards |
| `ops` | Blue-accent | Ops metric cards |
| `ops-dark` | Dark gradient | Ops hero / forecast area |
| `danger` | Red gradient | Projected deficit, critical alerts |
| `success` | Green tint | Positive confirmation states |
| `muted` | Light grey | Secondary / disabled content |

---

## Layout Conventions

### Streamlit columns

Use `st.columns()` for side-by-side content. Standard patterns:

```python
# Two equal columns
col1, col2 = st.columns(2)

# Three equal columns (landing page navigation cards)
cols = st.columns(3, gap="large")

# Metric row (Ops dashboard)
c1, c2, c3, c4 = st.columns(4)
```

Avoid more than 4 columns for metric cards — narrow columns make labels unreadable on standard screens.

### Mobile-style step pages

Passenger and driver pages simulate a mobile phone frame using a centered narrow column:

```python
_, center, _ = st.columns([1, 2, 1])
with center:
    # step content here
```

This keeps the content width comparable to a phone screen without requiring a fixed-width container.

### Containers and expanders

- Use `st.container()` to group related elements that share a card background
- Use `st.expander()` for collapsible detail sections (e.g. fare breakdown, flight details)
- Avoid nesting expanders inside columns — Streamlit renders them unreliably

---

## Route Timeline Pattern

The route marker pattern for pickup → destination is implemented in `render_route_timeline()` in `components/status_blocks.py`.

**Design contract:**
- Green circle — pickup marker
- Vertical connector line — stretches to content height via `flex: 1` (never a fixed pixel height)
- Red square — destination marker
- Both markers align to the text baseline of their respective label

**Where this pattern is used:**

| Screen | Implementation |
|---|---|
| Passenger `home` | `render_route_timeline()` |
| Passenger `carType` | Simplified inline version (smaller dots, no address sublabel) |
| Driver `tripNavigation` | `render_route_timeline()` |

**Do not** render this pattern with a fixed-height connector — it breaks when text wraps or sublabels are added. Always use `render_route_timeline()` or match its CSS flex pattern.

---

## Ops Dashboard Structure

```
1_ops_dashboard.py
  ├── Terminal selector (ops_terminal: T1 / T2 / All)
  ├── Workspace toggle (ops_workspace: Live Monitoring / AI Advisory)
  │
  ├── Live Monitoring workspace
  │     ├── render_pwt_gauge()       — circular PWT gauge
  │     ├── render_metric_card() × N — key KPI tiles (pax, taxis, lane load, readiness, deficit)
  │     ├── render_alert_card()      — projected deficit alert (tone="danger")
  │     ├── Altair forecast chart    — demand vs supply over 15-min windows
  │     ├── render_info_card()       — flight wave table
  │     ├── render_info_card()       — demand signals table
  │     └── render_info_card()       — supply telemetry table
  │
  └── AI Advisory workspace
        ├── Chat history display
        ├── st.chat_input()          — user message input
        └── Mock AI response renderer
```

The AI Advisory chatbot uses `ops_ai_chat_history` in session state and generates mock responses — no live LLM call is made.
