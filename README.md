# Hello Ride

Hello Ride is a Vite + React frontend prototype for proactive taxi dispatch at Suvarnabhumi Airport (BKK). It demonstrates three operating surfaces that shift the queue from reactive dispatching to a signal-driven system that mobilises supply before passengers reach the pickup curb.

---

## 1. Project Brief

The Hello Ride project aims to transform the Suvarnabhumi Airport taxi queuing system from a **Reactive** model to a **Proactive Dispatching** model. By integrating real-time flight data, early passenger demand signals, weather conditions, and taxi supply telemetry, the system is designed to significantly reduce **Passenger Wait Time (PWT)**—the core KPI of the operation.

### Key Pain Points

Currently, during peak hours, "flight bunching," or significant flight delays, the legacy system cannot mobilize taxi supply quickly enough. This results in a severe supply-demand mismatch, forcing passengers to wait between 30–60+ minutes. Furthermore, information asymmetry between drivers and operations (Ops) leads to a high reliance on manual, sub-optimal decision-making.

### Solution Highlights

The core of this solution is **Early Demand Capture (+20 minutes)**. By implementing QR code scans at baggage claim areas, the system captures confirmed demand before passengers even reach the pickup curb. We utilize **time-lag logic**—modeling the duration from Flight Landing → Immigration/Baggage → Pickup—to execute rational, data-driven advance dispatching.

---

## 2. System / Data Design

The system architecture is divided into three primary interfaces tailored to each stakeholder's role: the **Passenger Portal**, the **Driver View**, and the **Ops Control Tower**.

### Data Architecture

The data layer utilizes a clearly defined layering strategy:

```
Raw → Events → Telemetry → Features → Forecast → KPI
```

Key tables within this schema:

| Table | Purpose |
|---|---|
| `flight_instances` | Canonical flight occurrences |
| `passenger_demand_signals` | Early demand captured via QR interactions |
| `driver_dispatch_events` | Event timeline (offer / accept / decline) |
| `taxi_supply_snapshots` | Real-time supply telemetry and location data |
| `weather_raw` | Environmental factors tracking |
| `features_15m` | Aggregated model features at 15-minute intervals |
| `queue_metrics_15m` | KPI outcomes and performance metrics per 15-minute window |

---

## 3. Stack

| Layer | Technology | Version |
|---|---|---|
| Build tool | Vite | 6.3.5 |
| UI framework | React | 19.1.0 |
| Routing | React Router DOM | 7.6.1 |
| Styling | Tailwind CSS | 3.4.17 |
| Component primitives | Radix UI | various |
| Icons | Lucide React | 0.511.0 |
| Class utilities | clsx | 2.1.1 |

---

## 4. Project Structure

```text
hello-ride-platform/
├── docs/                        # Project documentation
│   └── architecture.md          # Full architecture reference
├── frontend/                    # Entire frontend application
│   ├── index.html               # HTML entry point
│   ├── vite.config.js           # Vite build configuration
│   ├── tailwind.config.js       # Design token definitions
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx             # React root, BrowserRouter mount
│       ├── App.jsx              # Shell nav, route definitions, NotFound
│       ├── index.css            # Tailwind directives + CSS custom properties
│       ├── components/
│       │   ├── ui.jsx           # Shared component library
│       │   ├── passenger-page.jsx
│       │   ├── driver-page.jsx
│       │   └── ops-page.jsx
│       ├── data/
│       │   └── mockData.js      # Single source of truth for all mock data
│       └── lib/
│           └── utils.js         # cn() classname utility wrapper
├── package.json                 # Root-level npm scripts (delegates to frontend/)
└── README.md
```

---

## 5. Routes

| Path | Surface |
|---|---|
| `/` | Landing page — prototype overview and navigation |
| `/passenger` | Passenger mobile flow |
| `/driver` | Driver partner app |
| `/ops` | Operations control tower |

---

## 6. Install

From the project root:

```bash
npm run frontend:install
```

Or directly inside `frontend/`:

```bash
cd frontend
npm install
```

---

## 7. Run Locally

```bash
npm run dev
```

Starts the Vite app at `http://localhost:5173`.

---

## 8. Build

```bash
npm run build
```

---

## 9. Preview Production Build

```bash
npm run preview
```

---

## Notes

- All data is static mock — no backend or API integration.
- Root npm scripts proxy to the `frontend/` app for convenience.
- See [docs/architecture.md](docs/architecture.md) for full technical reference including component API, state design, theming, and production readiness gaps.
