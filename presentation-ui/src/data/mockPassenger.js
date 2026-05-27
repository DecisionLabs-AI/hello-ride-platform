export const PASSENGER = {
  flight: {
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
  },
  route: {
    pickup: "Pickup Zone C2",
    pickupAddress: "Suvarnabhumi Airport, Terminal 1, Bangkok",
    walkToCurbMin: 6,
  },
  tracking: {
    driver: "Somchai J.",
    vehicle: "Toyota Camry",
    plate: "1กข 2841",
    eta: "4 min",
    distanceKm: 1.3,
    rating: 4.9,
  },
};

export const RIDES = [
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
];

export const PAYMENT_OPTIONS = [
  { id: "cash", label: "Cash Payment", detail: "Cash Payment", value: "Pay directly to driver after the ride" },
  { id: "card", label: "Credit / Debit Card", detail: "Credit / Debit Card", value: "Pay by card after the ride" },
];

export const TIP_OPTIONS = ["฿10", "฿20", "฿50", "฿100"];

export const DESTINATION_PRESETS = [
  "Sukhumvit", "Silom", "Siam", "Phaya Thai", "Chatuchak",
  "Don Mueang Airport", "ICONSIAM", "CentralWorld",
  "Victory Monument", "Asok", "Ekkamai", "Thonglor",
  "Rama 9", "Bang Na", "Ratchada", "Ari",
];
