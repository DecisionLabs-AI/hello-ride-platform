# Hello Ride

Hello Ride is a Streamlit prototype for proactive taxi dispatch at Suvarnabhumi Airport (BKK). It demonstrates three operating surfaces that work together to shift the airport queue from reactive dispatching to a signal-driven system that mobilises supply before passengers reach the pickup curb.

- **Passenger Portal** — QR-triggered demand capture, ride selection, live pickup orchestration
- **Driver View** — Dispatch offers, readiness checks, onboarding flow, trip navigation
- **OPS Control Tower** — PWT monitoring, AI advisory, demand forecasting, supply telemetry

## Product Brief

```text
Capture demand early → forecast queue pressure → mobilise supply before passengers reach the curb
```

Hello Ride shifts the airport taxi queue from reactive dispatching to proactive scheduling. By combining flight arrival data, early passenger demand signals, taxi supply telemetry, and operational intervention controls, the system is designed to reduce Passenger Wait Time (PWT) — especially during flight bunching and delay scenarios.

## Repository Structure

```text
hello-ride-platform/
├── app.py                       # Streamlit entry point / landing page
├── requirements.txt             # Python dependencies
├── pages/
│   ├── 1_ops_dashboard.py       # Ops Control Tower
│   ├── 2_driver_flow.py         # Driver partner app
│   └── 3_passenger_flow.py      # Passenger portal
├── components/
│   ├── cards.py                 # Info, metric, and alert card components
│   ├── forms.py                 # Counter and option card form components
│   ├── header.py                # Hero, page header, and section heading components
│   ├── navigation.py            # Sidebar navigation
│   └── status_blocks.py         # PWT gauge, timer ring, route timeline, status strip
├── data/
│   ├── mock_driver.py           # Driver mock data
│   ├── mock_ops.py              # OPS mock data (by terminal)
│   └── mock_passenger.py        # Passenger mock data
├── utils/
│   ├── state.py                 # Session state initialisation and helpers
│   └── styles.py                # Global inline CSS
└── docs/                        # Flow and architecture reference docs
```

## Run Locally

Requires **Python 3.11**. Install dependencies:

```bash
pip install -r requirements.txt
```

Run the Streamlit app:

```bash
streamlit run app.py
```

The app opens at `http://localhost:8501`.

### Demo credentials

| Surface | Credential |
|---|---|
| Driver login | username `driver_demo` · password `1234` |

Credentials are pre-filled automatically via a `localStorage` draft bridge.

## Validate Python Syntax

```bash
python3 -m compileall app.py pages components data utils
```

## Notes

- All data is static mock data — no backend or API integration.
- Passenger and Driver flows use `st.session_state` to preserve state-machine behaviour across reruns.
- Destination autocomplete uses `streamlit.components.v1` to inject a JS bridge; confirmation is Enter-only.
- OPS dashboard uses `st.line_chart` for the arrival wave forecast (Altair dependency removed).
- Global CSS is injected once in `app.py` via `apply_global_styles()` in `utils/styles.py` — never call it inside a page file.
- See `docs/architecture.md` for the full technical reference.
