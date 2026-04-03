export const passengerExperience = {
  currentFlight: {
    code: "TG401",
    origin: "Tokyo Narita",
    landedAt: "14:35",
    baggageClaim: "Baggage Claim A",
    terminal: "Terminal 1",
  },
  signal: {
    capturedAt: "14:42",
    headStartMin: 20,
    confidence: 92,
    pwtSavedMin: 14,
    partySize: 2,
    luggage: 3,
    specialAssistance: true,
  },
  route: {
    pickup: "Pickup Zone C2",
    dropoff: "Sukhumvit / Asok",
    walkToCurbMin: 6,
  },
  // Single source of truth consumed by PassengerPage's ride-selection step.
  // Fields: id, label, description, price, maxPassengers, maxLuggage.
  rides: [
    {
      id: "hello-taxi",
      label: "Hello Taxi",
      description: "Metered queue · 3 mins",
      price: "THB 350",
      maxPassengers: 4,
      maxLuggage: 2,
    },
    {
      id: "hello-car",
      label: "Hello Car",
      description: "Comfort sedan · 5 mins",
      price: "THB 420",
      maxPassengers: 4,
      maxLuggage: 3,
    },
    {
      id: "hello-suv",
      label: "Hello SUV",
      description: "Extra space · 8 mins",
      price: "THB 580",
      maxPassengers: 6,
      maxLuggage: 6,
    },
  ],
  tracking: {
    driver: "Somchai J.",
    vehicle: "Toyota Camry",
    plate: "1กข 2841",
    eta: "4 min",
    distanceKm: 1.3,
    rating: 4.9,
  },
};

export const driverExperience = {
  profile: {
    name: "Somchai Jaidee",
    status: "Online",
    score: "94.2% ready",
    vehicle: "Toyota Camry",
  },
  incomingJob: {
    pickup: "Baggage Claim Gate A, Terminal 1",
    dropoff: "Asok BTS Station, Sukhumvit",
    flightRef: "TG401",
    payout: "THB 385",
    distance: "32.4 km",
    etaToPickup: "4 min",
    countdown: 12,
    passengers: 2,
    luggage: 3,
    payment: "Cash",
  },
  readiness: [
    { label: "Identity verified", value: "Valid today" },
    { label: "Vehicle inspection", value: "Completed 13:55" },
    { label: "Fuel range", value: "260 km remaining" },
  ],
  signals: [
    { label: "Early demand signal", value: "Passenger scanned QR at 14:42" },
    { label: "Wave intensity", value: "High demand from Japan / Gulf arrivals" },
    { label: "Ops note", value: "Hold lane entry after this trip for rebalancing" },
  ],
  // Active job offer shown on the job-request screen.
  guideTrip: {
    pickup: "Marina Bay Sands, Tower 3",
    pickupAddress: "10 Bayfront Ave, Singapore 018956",
    dropoff: "Changi Airport Terminal 4",
    dropoffAddress: "Airport Blvd, Singapore 819665",
    eta: "4 mins",
    distance: "1.2 km away",
    payout: "$14.50",
  },
  // Trip in progress shown on the navigation and payment-complete screens.
  // fareBreakdown line items must sum to payout.
  activeTrip: {
    driver: "Alex Johnston",
    service: "GrabCar Premium",
    pickup: "12 Marina View, Asia Square Tower 1",
    dropoff: "Changi Airport Terminal 3",
    payout: "$24.50",
    fareBreakdown: {
      distanceKm: 9.8,
      distanceFare: "$16.00",
      durationMin: 22,
      durationFare: "$6.50",
      bookingFee: "$2.00",
    },
  },
};

export const opsExperience = {
  pwt: 18,
  waitingPassengers: 342,
  waitingTrend: "+12%",
  holdingTaxis: 128,
  taxiTrend: "-4%",
  laneLoad: 82,
  fleetReadiness: 94.2,
  projectedDeficit: 45,
  aiAdvice: "Activate Lane 4 now and broadcast a 6-minute head start to holding drivers.",
  flights: [
    { code: "TG401", origin: "Tokyo", eta: "14:35", terminal: "T1", status: "Bags on belt", demand: 84 },
    { code: "EK374", origin: "Dubai", eta: "14:50", terminal: "T1", status: "Taxiing", demand: 122 },
    { code: "QR833", origin: "Doha", eta: "15:10", terminal: "T1", status: "On final", demand: 96 },
    { code: "CX751", origin: "Hong Kong", eta: "15:25", terminal: "T2", status: "Scheduled", demand: 67 }
  ],
  demandSignals: [
    { time: "14:12", zone: "Claim A", parties: 4, luggage: 3 },
    { time: "14:18", zone: "Claim C", parties: 3, luggage: 4 },
    { time: "14:25", zone: "Claim D", parties: 5, luggage: 6 },
    { time: "14:31", zone: "Arrivals bridge", parties: 2, luggage: 1 }
  ],
  supply: [
    { name: "Ready drivers", value: 128, detail: "43 in holding lane, 85 inbound" },
    { name: "Accepted dispatches", value: 41, detail: "Last 15 min" },
    { name: "Declines", value: 6, detail: "Mostly long-haul mismatch" }
  ],
  forecast: [
    { time: "14:00", demand: 38, supply: 54 },
    { time: "14:15", demand: 52, supply: 58 },
    { time: "14:30", demand: 74, supply: 56 },
    { time: "14:45", demand: 110, supply: 52 },
    { time: "15:00", demand: 146, supply: 50 },
    { time: "15:15", demand: 122, supply: 54 },
    { time: "15:30", demand: 90, supply: 58 },
    { time: "15:45", demand: 60, supply: 62 }
  ],
};

export const navigationCards = [
  {
    path: "/passenger",
    label: "Passenger Portal",
    title: "Capture demand before passengers hit the curb",
    description:
      "QR-triggered early demand, assisted ride selection, and live pickup orchestration for arriving travelers.",
    color: "passenger",
  },
  {
    path: "/driver",
    label: "Driver View",
    title: "Turn supply into a ready, signal-driven fleet",
    description:
      "Dispatch offers, readiness checks, and actionable ops guidance for airport drivers.",
    color: "driver",
  },
  {
    path: "/ops",
    label: "Ops Control Tower",
    title: "See passenger waves before queues break",
    description:
      "PWT, flight bunching, demand forecasts, supply telemetry, and AI-backed intervention controls.",
    color: "ops",
  }
];
