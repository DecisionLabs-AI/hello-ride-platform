export const DRIVER = {
  profile: {
    name: "Somchai Jaidee",
    status: "Online",
    score: "94.2% ready",
    vehicle: "Toyota Camry",
  },
  guideTrip: {
    job_id: "JOB-20260410-001",
    passengerName: "Tanaka K.",
    pickup: "Baggage Claim Gate A, Terminal 1",
    pickupAddress: "Suvarnabhumi Airport, Terminal 1, Bangkok",
    dropoff: "Asok BTS Station, Sukhumvit",
    dropoffAddress: "Sukhumvit Rd, Khlong Toei, Bangkok 10110",
    eta: "4 mins",
    distance: "1.2 km to pickup",
    payout: "THB 385",
    flightRef: "TG401",
    passengers: 2,
    luggage: 3,
    payment: "Cash",
    fareBreakdown: {
      distanceKm: 32.4,
      distanceFare: "THB 300",
      durationMin: 45,
      durationFare: "THB 70",
      bookingFee: "THB 15",
    },
  },
  queue: {
    position: 8,
    waitMin: 12,
  },
  incentive: "+THB 50 per trip during the current airport arrival wave.",
  forecastBars: [
    { time: "14:00", height: 36, type: "normal", label: "" },
    { time: "16:00", height: 52, type: "normal", label: "" },
    { time: "18:00", height: 80, type: "surge", label: "Surge" },
    { time: "20:00", height: 96, type: "peak", label: "Peak" },
    { time: "22:00", height: 58, type: "normal", label: "" },
    { time: "00:00", height: 30, type: "normal", label: "" },
  ],
};

export const DEFAULT_CREDENTIALS = {
  username: "driver_demo",
  password: "1234",
};
