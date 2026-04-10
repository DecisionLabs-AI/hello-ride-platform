PASSENGER_EXPERIENCE = {
    "currentFlight": {
        "code": "TG401",
        "origin": "Tokyo Narita",
        "landedAt": "14:35",
        "baggageClaim": "Baggage Claim A",
        "terminal": "Terminal 1",
    },
    "signal": {
        "capturedAt": "14:42",
        "headStartMin": 20,
        "confidence": 92,
        "pwtSavedMin": 14,
        "partySize": 2,
        "luggage": 3,
        "specialAssistance": True,
    },
    "route": {
        "pickup": "Pickup Zone C2",
        "dropoff": "Sukhumvit / Asok",
        "walkToCurbMin": 6,
    },
    "rides": [
        {
            "id": "hello-taxi",
            "label": "Hello Taxi",
            "description": "Metered queue · 3 mins",
            "price": "THB 350",
            "maxPassengers": 4,
            "maxLuggage": 2,
        },
        {
            "id": "hello-car",
            "label": "Hello Car",
            "description": "Comfort sedan · 5 mins",
            "price": "THB 420",
            "maxPassengers": 4,
            "maxLuggage": 3,
        },
        {
            "id": "hello-suv",
            "label": "Hello SUV",
            "description": "Extra space · 8 mins",
            "price": "THB 580",
            "maxPassengers": 6,
            "maxLuggage": 6,
        },
    ],
    "tracking": {
        "driver": "Somchai J.",
        "vehicle": "Toyota Camry",
        "plate": "1กข 2841",
        "eta": "4 min",
        "distanceKm": 1.3,
        "rating": 4.9,
    },
}


PAYMENT_OPTIONS = [
    {
        "id": "wallet",
        "label": "Wallet",
        "detail": "Hello Pay Wallet",
        "value": "THB 142.50 available",
    },
    {
        "id": "card",
        "label": "Card",
        "detail": "Visa ending 2048",
        "value": "Business card",
    },
]


TIP_OPTIONS = ["฿10", "฿20", "฿50", "฿100"]
