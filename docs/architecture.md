# Hello Ride Platform — Architecture

## Overview

Hello Ride is a frontend prototype for a proactive taxi dispatch system at Suvarnabhumi Airport (BKK). It demonstrates three operating surfaces that work together to shift the airport queue from reactive dispatching to a signal-driven system that mobilises supply before passengers reach the pickup curb.

---

## Tech Stack

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

## Repository Structure

```
hello-ride-platform/
├── docs/                        # Project documentation
│   └── architecture.md
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

## Application Surfaces

The app has three distinct user-facing surfaces, each at its own route.

```
/             Landing page — prototype overview and navigation
/passenger    Passenger mobile flow
/driver       Driver partner app
/ops          Operations control tower
```

### Passenger Surface (`/passenger`)

A mobile-first flow simulating a passenger arriving at the airport.

**Screens (multi-step state machine):**

```
home → carType → ride → review → [submitted]
```

| Screen | Key state |
|---|---|
| `home` | destination, passengerCount, luggageCount, specialAssistance, additionalNotes |
| `carType` | selectedRideType (validated against capacity), selectedPaymentMethod |
| `ride` | read-only summary of booked trip |
| `review` | selectedRating, selectedTip, reviewComment, reviewSubmitted |

**Ride eligibility** is computed with `useMemo` keyed on `[rideOptions, passengerCount, luggageCount]`. A ride is eligible when both its `maxPassengers` and `maxLuggage` thresholds are met.

---

### Driver Surface (`/driver`)

A mobile-first flow covering the full driver partner lifecycle.

**Screens (state machine driven by `currentStep`):**

```
home → registration → verification → applicationStatus → guide
                                                           ↓
                                                       jobRequest  (countdown timer)
                                                           ↓
                                                     tripNavigation
                                                           ↓
                                                     paymentComplete → guide
```

**Key state:**

| State | Type | Purpose |
|---|---|---|
| `currentStep` | string | Active screen |
| `isRegistered` | boolean | Completed registration form |
| `isVerified` | boolean | Passed face scan |
| `isApproved` | boolean | Academy + background check passed |
| `isOnline` | boolean | Driver is available for jobs |
| `countdown` | number | Job-request accept/reject timer (12 → 0) |
| `registrationForm` | object | Controlled form fields: firstName, lastName, phone |

**Countdown timer** is implemented with `useEffect` keyed on `currentStep`. The interval resets to 12 whenever the driver enters the `jobRequest` screen and auto-transitions to `guide` (auto-reject) at 0. The interval is always cleared on cleanup.

**Online toggle semantics:**
- `handleOnlineChange` — used on the guide screen; going online triggers a transition to `jobRequest`.
- `handleTripOnlineChange` — used mid-trip; only updates `isOnline`, never triggers a screen transition.

---

### Ops Surface (`/ops`)

A desktop-first operations dashboard. This surface is stateless — it renders directly from `opsExperience` mock data.

**Layout:** two-column grid (`280px sidebar | 1fr main`).

**Key panels:**

| Panel | Data source |
|---|---|
| PWT gauge | `opsExperience.pwt` |
| Waiting passengers / holding taxis | `opsExperience.waitingPassengers`, `holdingTaxis` |
| Lane load progress bar | `opsExperience.laneLoad` |
| AI advisory alert | `opsExperience.aiAdvice`, `projectedDeficit` |
| Arrival wave forecast chart | `opsExperience.forecast` (SVG, custom-drawn) |
| Flight wave | `opsExperience.flights` |
| Demand capture (QR signals) | `opsExperience.demandSignals` |
| Supply telemetry | `opsExperience.supply` |

---

## Data Layer

All mock data lives in a single file: [`frontend/src/data/mockData.js`](../frontend/src/data/mockData.js).

### Exports

#### `passengerExperience`

```js
{
  currentFlight: { code, origin, landedAt, baggageClaim, terminal },
  signal:        { capturedAt, headStartMin, confidence, pwtSavedMin, partySize, luggage, specialAssistance },
  route:         { pickup, dropoff, walkToCurbMin },
  rides: [       // consumed by PassengerPage ride-selection step
    { id, label, description, price, maxPassengers, maxLuggage }
  ],
  tracking:      { driver, vehicle, plate, eta, distanceKm, rating },
}
```

#### `driverExperience`

```js
{
  profile:     { name, status, score, vehicle },
  incomingJob: { pickup, dropoff, flightRef, payout, distance, etaToPickup, countdown, passengers, luggage, payment },
  readiness:   [{ label, value }],
  signals:     [{ label, value }],
  guideTrip:   { pickup, pickupAddress, dropoff, dropoffAddress, eta, distance, payout },
  activeTrip:  {
    driver, service, pickup, dropoff, payout,
    fareBreakdown: { distanceKm, distanceFare, durationMin, durationFare, bookingFee }
    // fareBreakdown line items must always sum to payout
  },
}
```

#### `opsExperience`

```js
{
  pwt, waitingPassengers, waitingTrend, holdingTaxis, taxiTrend,
  laneLoad, fleetReadiness, projectedDeficit, aiAdvice,
  flights:       [{ code, origin, eta, terminal, status, demand }],
  demandSignals: [{ time, zone, parties, luggage }],
  supply:        [{ name, value, detail }],
  forecast:      [{ time, demand, supply }],  // drives the SVG chart
}
```

#### `navigationCards`

Array of `{ path, label, title, description, color }` used by the landing page grid.

---

## Shared UI Component Library (`ui.jsx`)

All components are named exports.

| Component | Props | Purpose |
|---|---|---|
| `AppBadge` | `tone`, `children` | Small label pill |
| `SurfaceCard` | `className`, `children` | Glassmorphism panel card |
| `SectionEyebrow` | `children` | Small uppercase section label |
| `MetricTile` | `label`, `value`, `delta`, `tone`, `className` | KPI display tile |
| `LinearProgress` | `value`, `className`, `indicatorClassName` | Radix progress bar wrapper |
| `Divider` | `className` | Horizontal separator |
| `PhoneShell` | `tone` (`passenger`\|`driver`), `children` | Mobile phone frame |
| `DashboardShell` | `children` | Desktop dashboard wrapper |
| `UserAvatar` | `name`, `className` | Initials avatar with null-safe guard |
| `HeaderBrand` | `title`, `subtitle` | Logo + title header row |
| `LinkArrow` | — | Decorative arrow icon |

---

## Theming

Colours are defined as HSL CSS custom properties in `index.css` and mapped to Tailwind semantic tokens in `tailwind.config.js`.

| Token | HSL value | Usage |
|---|---|---|
| `--primary` | `142 100% 35%` | Brand green, CTAs |
| `--secondary` | `214 63% 43%` | Blue accents |
| `--accent` | `346 72% 46%` | Pink/red highlights |
| `--success` | `142 72% 42%` | Positive states |
| `--danger` | `356 78% 46%` | Critical alerts |
| `--warning` | `35 92% 55%` | Warning states |

Custom Tailwind utilities defined in `tailwind.config.js`:
- `shadow-panel` — `0 24px 70px rgba(15,23,42,0.12)`
- `shadow-glow` — card glow effect
- `bg-runway-grid` — diagonal grid background pattern used in phone shells

---

## Routing

Defined in `App.jsx` using React Router `<Routes>`.

```
/             LandingPage
/passenger    PassengerPage
/driver       DriverPage
/ops          OpsPage
*             NotFound          (catch-all 404)
```

`ShellNav` is a sticky top bar rendered on every route via the root `App` layout.

---

## State Management

The prototype uses local React state only (`useState`, `useEffect`, `useMemo`). There is no global store.

**Implications for production:**
- Navigation between tabs resets all page state (booking flow progress, driver step, etc.)
- A shared store (e.g. Zustand, React Context) or URL-encoded state would be needed to persist flows across tab switches.

---

## Production Readiness Gaps

This is a frontend prototype. The following are required before production deployment:

| Area | Gap |
|---|---|
| Backend | No API integration; all data is static mock |
| Authentication | No auth layer on any surface |
| State persistence | All state is ephemeral; resets on navigation |
| Error handling | No error boundaries; no loading/error states |
| Input validation | No server-side validation; minimal client-side |
| Testing | No unit, integration, or E2E tests |
| Code splitting | All routes eagerly loaded; no `React.lazy` |
| Monitoring | No analytics, error tracking, or logging |
