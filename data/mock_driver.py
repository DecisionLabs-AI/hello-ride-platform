DRIVER_EXPERIENCE = {
    "profile": {
        "name": "Somchai Jaidee",
        "status": "Online",
        "score": "94.2% ready",
        "vehicle": "Toyota Camry",
    },
    "incomingJob": {
        "pickup": "Baggage Claim Gate A, Terminal 1",
        "dropoff": "Asok BTS Station, Sukhumvit",
        "flightRef": "TG401",
        "payout": "THB 385",
        "distance": "32.4 km",
        "etaToPickup": "4 min",
        "countdown": 12,
        "passengers": 2,
        "luggage": 3,
        "payment": "Cash",
    },
    "readiness": [
        {"label": "Identity verified", "value": "Valid today"},
        {"label": "Vehicle inspection", "value": "Completed 13:55"},
        {"label": "Fuel range", "value": "260 km remaining"},
    ],
    "signals": [
        {"label": "Early demand signal", "value": "Passenger scanned QR at 14:42"},
        {"label": "Wave intensity", "value": "High demand from Japan / Gulf arrivals"},
        {"label": "Ops note", "value": "Hold lane entry after this trip for rebalancing"},
    ],
    # Single source of truth for the offered job.
    # Shown on jobRequest, tripNavigation, and paymentComplete.
    # All fields here must stay consistent — do not read from incomingJob or
    # activeTrip on those screens.  fareBreakdown items must sum to payout.
    "guideTrip": {
        "job_id": "JOB-20260410-001",
        "passengerName": "Tanaka K.",
        "pickup": "Baggage Claim Gate A, Terminal 1",
        "pickupAddress": "Suvarnabhumi Airport, Terminal 1, Bangkok",
        "dropoff": "Asok BTS Station, Sukhumvit",
        "dropoffAddress": "Sukhumvit Rd, Khlong Toei, Bangkok 10110",
        "eta": "4 mins",
        "distance": "1.2 km to pickup",
        "payout": "THB 385",
        "fareBreakdown": {
            "distanceKm": 32.4,
            "distanceFare": "THB 300",
            "durationMin": 45,
            "durationFare": "THB 70",
            "bookingFee": "THB 15",
        },
    },
}


DRIVER_FORECAST_BARS = [
    {"time": "14:00", "height": 36, "type": "normal", "label": ""},
    {"time": "16:00", "height": 52, "type": "normal", "label": ""},
    {"time": "18:00", "height": 80, "type": "surge", "label": "Surge"},
    {"time": "20:00", "height": 96, "type": "peak", "label": "Peak"},
    {"time": "22:00", "height": 58, "type": "normal", "label": ""},
    {"time": "00:00", "height": 30, "type": "normal", "label": ""},
]
