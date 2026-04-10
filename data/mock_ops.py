from copy import deepcopy


OPS_BY_TERMINAL = {
    "T1": {
        "code": "T1",
        "title": "Terminal 1",
        "subtitle": "Precision dispatch",
        "pwt": 19,
        "waitingPassengers": 302,
        "waitingTrend": "+15%",
        "holdingTaxis": 101,
        "taxiTrend": "-6%",
        "laneLoad": 87,
        "fleetReadiness": 93.9,
        "projectedDeficit": 49,
        "aiAdvice": "Activate Terminal 1 overflow lane planning and broadcast a 6-minute head start to holding drivers.",
        "criticalWindow": {"start": "14:45", "end": "15:00"},
        "flights": [
            {"code": "TG401", "origin": "Tokyo", "eta": "14:35", "terminal": "T1", "status": "Bags on belt", "demand": 84},
            {"code": "EK374", "origin": "Dubai", "eta": "14:50", "terminal": "T1", "status": "Taxiing", "demand": 122},
            {"code": "QR833", "origin": "Doha", "eta": "15:10", "terminal": "T1", "status": "On final", "demand": 96},
        ],
        "demandSignals": [
            {"time": "14:12", "zone": "Claim A", "parties": 4, "luggage": 3},
            {"time": "14:18", "zone": "Claim C", "parties": 3, "luggage": 4},
            {"time": "14:25", "zone": "Claim D", "parties": 5, "luggage": 6},
        ],
        "supply": [
            {"name": "Ready drivers", "value": 101, "detail": "33 in holding lane, 68 inbound"},
            {"name": "Accepted dispatches", "value": 35, "detail": "Last 15 min"},
            {"name": "Declines", "value": 5, "detail": "Mostly long-haul mismatch"},
        ],
        "forecast": [
            {"time": "14:00", "demand": 34, "supply": 46},
            {"time": "14:15", "demand": 48, "supply": 50},
            {"time": "14:30", "demand": 70, "supply": 49},
            {"time": "14:45", "demand": 102, "supply": 44},
            {"time": "15:00", "demand": 136, "supply": 43},
            {"time": "15:15", "demand": 116, "supply": 47},
            {"time": "15:30", "demand": 84, "supply": 50},
            {"time": "15:45", "demand": 54, "supply": 53},
        ],
    },
    "T2": {
        "code": "T2",
        "title": "Terminal 2",
        "subtitle": "Precision dispatch",
        "pwt": 12,
        "waitingPassengers": 40,
        "waitingTrend": "+4%",
        "holdingTaxis": 27,
        "taxiTrend": "+2%",
        "laneLoad": 63,
        "fleetReadiness": 95.3,
        "projectedDeficit": 14,
        "aiAdvice": "Keep Terminal 2 driver release steady and hold backup capacity near the arrivals bridge.",
        "criticalWindow": {"start": "15:00", "end": "15:15"},
        "flights": [
            {"code": "CX751", "origin": "Hong Kong", "eta": "15:25", "terminal": "T2", "status": "Scheduled", "demand": 67},
            {"code": "MH782", "origin": "Kuala Lumpur", "eta": "15:08", "terminal": "T2", "status": "Taxiing", "demand": 41},
        ],
        "demandSignals": [
            {"time": "14:21", "zone": "Claim E", "parties": 2, "luggage": 1},
            {"time": "14:31", "zone": "Arrivals bridge", "parties": 2, "luggage": 1},
            {"time": "14:36", "zone": "Claim F", "parties": 1, "luggage": 2},
        ],
        "supply": [
            {"name": "Ready drivers", "value": 27, "detail": "10 in holding lane, 17 inbound"},
            {"name": "Accepted dispatches", "value": 6, "detail": "Last 15 min"},
            {"name": "Declines", "value": 1, "detail": "Low mismatch"},
        ],
        "forecast": [
            {"time": "14:00", "demand": 4, "supply": 8},
            {"time": "14:15", "demand": 4, "supply": 8},
            {"time": "14:30", "demand": 4, "supply": 7},
            {"time": "14:45", "demand": 8, "supply": 8},
            {"time": "15:00", "demand": 10, "supply": 7},
            {"time": "15:15", "demand": 6, "supply": 7},
            {"time": "15:30", "demand": 6, "supply": 8},
            {"time": "15:45", "demand": 6, "supply": 9},
        ],
    },
}


def _parse_percent(value: str) -> float:
    return float(value.replace("%", ""))


def _format_percent(value: float) -> str:
    rounded = round(value)
    return f"{rounded:+d}%"


def _weighted_average(values: list[tuple[float, float]]) -> int:
    numerator = sum(value * weight for value, weight in values)
    denominator = sum(weight for _, weight in values) or 1
    return round(numerator / denominator)


def _aggregate_forecast(terminals: list[dict]) -> list[dict]:
    by_time: dict[str, dict] = {}
    for terminal in terminals:
        for point in terminal["forecast"]:
            slot = by_time.setdefault(point["time"], {"time": point["time"], "demand": 0, "supply": 0})
            slot["demand"] += point["demand"]
            slot["supply"] += point["supply"]
    return [by_time[time] for time in sorted(by_time)]


def _aggregate_supply(terminals: list[dict]) -> list[dict]:
    ready_total = sum(terminal["supply"][0]["value"] for terminal in terminals)
    accepted_total = sum(terminal["supply"][1]["value"] for terminal in terminals)
    declines_total = sum(terminal["supply"][2]["value"] for terminal in terminals)
    t1_ready = OPS_BY_TERMINAL["T1"]["supply"][0]["value"]
    t2_ready = OPS_BY_TERMINAL["T2"]["supply"][0]["value"]
    return [
        {"name": "Ready drivers", "value": ready_total, "detail": f"{t1_ready} T1 ready, {t2_ready} T2 ready"},
        {"name": "Accepted dispatches", "value": accepted_total, "detail": "Last 15 min across terminals"},
        {"name": "Declines", "value": declines_total, "detail": "Combined airport response pulse"},
    ]


def _build_all_view() -> dict:
    terminals = [OPS_BY_TERMINAL["T1"], OPS_BY_TERMINAL["T2"]]
    waiting_total = sum(terminal["waitingPassengers"] for terminal in terminals)
    holding_total = sum(terminal["holdingTaxis"] for terminal in terminals)
    return {
        "code": "All",
        "title": "All terminals",
        "subtitle": "Airport-wide dispatch",
        "pwt": _weighted_average([(terminal["pwt"], terminal["waitingPassengers"]) for terminal in terminals]),
        "waitingPassengers": waiting_total,
        "waitingTrend": _format_percent(
            sum(_parse_percent(terminal["waitingTrend"]) * terminal["waitingPassengers"] for terminal in terminals)
            / waiting_total
        ),
        "holdingTaxis": holding_total,
        "taxiTrend": _format_percent(
            sum(_parse_percent(terminal["taxiTrend"]) * terminal["holdingTaxis"] for terminal in terminals)
            / holding_total
        ),
        "laneLoad": _weighted_average([(terminal["laneLoad"], terminal["holdingTaxis"]) for terminal in terminals]),
        "fleetReadiness": round(
            sum(terminal["fleetReadiness"] * terminal["holdingTaxis"] for terminal in terminals) / holding_total,
            1,
        ),
        "projectedDeficit": _weighted_average(
            [(terminal["projectedDeficit"], terminal["waitingPassengers"]) for terminal in terminals]
        ),
        "aiAdvice": "Balance Terminal 1 surge control with a steady Terminal 2 release wave and keep driver broadcasts synchronized airport-wide.",
        "criticalWindow": {"start": "14:45", "end": "15:15"},
        "flights": sorted(
            [flight for terminal in terminals for flight in terminal["flights"]],
            key=lambda item: item["eta"],
        ),
        "demandSignals": sorted(
            [signal for terminal in terminals for signal in terminal["demandSignals"]],
            key=lambda item: item["time"],
        ),
        "supply": _aggregate_supply(terminals),
        "forecast": _aggregate_forecast(terminals),
    }


def get_ops_experience(terminal: str | None) -> dict:
    if terminal not in {"T1", "T2", "All"}:
        terminal = "T1"
    if terminal == "All":
        return deepcopy(_build_all_view())
    return deepcopy(OPS_BY_TERMINAL[terminal])


OPS_EXPERIENCE = get_ops_experience("All")
