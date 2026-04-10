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
    "guideTrip": {
        "pickup": "Marina Bay Sands, Tower 3",
        "pickupAddress": "10 Bayfront Ave, Singapore 018956",
        "dropoff": "Changi Airport Terminal 4",
        "dropoffAddress": "Airport Blvd, Singapore 819665",
        "eta": "4 mins",
        "distance": "1.2 km away",
        "payout": "$14.50",
    },
    "activeTrip": {
        "driver": "Alex Johnston",
        "service": "GrabCar Premium",
        "pickup": "12 Marina View, Asia Square Tower 1",
        "dropoff": "Changi Airport Terminal 3",
        "payout": "$24.50",
        "fareBreakdown": {
            "distanceKm": 9.8,
            "distanceFare": "$16.00",
            "durationMin": 22,
            "durationFare": "$6.50",
            "bookingFee": "$2.00",
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
