import json
import re
import pandas as pd
import streamlit as st
from datetime import datetime
from html import escape

from components.cards import render_alert_card, render_info_card, render_metric_card
from components.header import render_page_header, render_section_heading
from components.navigation import render_sidebar
from components.status_blocks import render_pwt_gauge
from data.mock_ops import get_ops_experience
from utils.ai_advisory import build_ops_context, generate_ops_answer, ping_gemini
from utils.db import EffectiveNow, execute, fetch_all, fetch_one, get_effective_now, healthcheck
from utils.ml_predictor import predict_ops_ml
from utils.state import initialize_state
from utils.styles import apply_global_styles


st.set_page_config(
    page_title="Hello Ride | OPS",
    page_icon="H",
    layout="wide",
    initial_sidebar_state="expanded",
)


TERMINAL_TITLES = {
    "T1": "Terminal 1",
    "T2": "Terminal 2",
    "ALL": "All terminals",
}

OPS_PWT_ALERT_THRESHOLD = 15
OPS_CONTEXT_CACHE_VERSION = "2026-04-16-healthcheck-v2"


def _record_debug_error(label: str, exc: Exception) -> None:
    if not st.session_state.get("ops_debug_mode"):
        return
    raw = type(exc).__name__ + ": " + str(exc)[:200]
    sanitized = re.sub(
        r"(password|host|user|dbname|://)[^\s,;\"']+",
        r"\1=***",
        raw,
        flags=re.IGNORECASE,
    )
    st.session_state.setdefault("ops_debug_errors", []).append(f"[{label[:60]}] {sanitized}")


def fetch_all_safe(sql: str, params: dict | None = None) -> list[dict]:
    try:
        return fetch_all(sql, params)
    except Exception as exc:
        _record_debug_error(sql[:60], exc)
        return []


def fetch_one_safe(sql: str, params: dict | None = None) -> dict | None:
    try:
        return fetch_one(sql, params)
    except Exception as exc:
        _record_debug_error(sql[:60], exc)
        return None


def normalize_terminal(terminal: str | None) -> str:
    value = str(terminal or "ALL").strip().upper()
    return value if value in {"T1", "T2", "ALL"} else "ALL"


def mock_terminal_key(terminal: str | None) -> str:
    value = normalize_terminal(terminal)
    return "All" if value == "ALL" else value


@st.cache_data(ttl=20, show_spinner=False)
def get_cached_ops_context(
    airport_code: str,
    terminal: str,
    cache_version: str = OPS_CONTEXT_CACHE_VERSION,
) -> dict:
    _ = cache_version
    return build_ops_context(airport_code=airport_code, terminal=terminal)


def format_clock(value: datetime | str | None) -> str:
    if value is None:
        return "-"
    if isinstance(value, datetime):
        return value.strftime("%H:%M")
    return str(value)


def pct_delta(current: int | float | None, previous: int | float | None) -> str:
    if current is None or previous in (None, 0):
        return "Live"
    change = round(((float(current) - float(previous)) / float(previous)) * 100)
    return f"{change:+d}%"


def latest_kpi_snapshot(effective_now: object = None) -> dict | None:
    rows = fetch_all_safe(
        """
        select
            airport_code,
            captured_at_local,
            pwt_min,
            waiting_pax,
            available_taxis,
            active_lanes,
            notes
        from mart.ops_kpi_snapshots
        where airport_code = 'BKK'
          and (%(effective_now)s is null or captured_at_local <= %(effective_now)s)
        order by captured_at_local desc
        limit 2
        """,
        {"effective_now": effective_now},
    )
    if not rows:
        return None

    current = rows[0]
    previous = rows[1] if len(rows) > 1 else None
    available_taxis = int(current.get("available_taxis") or 0)
    active_lanes = int(current.get("active_lanes") or 0)
    lane_load = min(100, round((available_taxis / max(active_lanes * 50, 1)) * 100)) if active_lanes else 0

    return {
        "pwt": int(round(float(current.get("pwt_min") or 0))),
        "waitingPassengers": int(current.get("waiting_pax") or 0),
        "waitingTrend": pct_delta(
            current.get("waiting_pax"),
            previous.get("waiting_pax") if previous else None,
        ),
        "holdingTaxis": available_taxis,
        "taxiTrend": pct_delta(
            current.get("available_taxis"),
            previous.get("available_taxis") if previous else None,
        ),
        "laneLoad": lane_load,
        "fleetReadiness": round((available_taxis / max(available_taxis + 8, 1)) * 100, 1),
        "projectedDeficit": 0,
        "capturedAt": current.get("captured_at_local"),
        "notes": current.get("notes", ""),
        "activeLanes": active_lanes,
    }


def load_flights(terminal: str, effective_now: object = None) -> list[dict]:
    terminal = normalize_terminal(terminal)
    rows = fetch_all_safe(
        """
        select
            fi.flight_instance_id,
            fi.flight_no as code,
            fi.origin,
            fi.terminal,
            fi.est_arrival_local as eta_at,
            fi.status,
            greatest(coalesce(sum(pds.pax_count), 0) * 12, 24) as demand
        from rawdata.flight_instances fi
        left join rawdata.passenger_demand_signals pds
            on pds.flight_instance_id = fi.flight_instance_id
        where fi.est_arrival_local between
                coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp)
            and coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp) + interval '1 hour'
          and (%(terminal)s = 'ALL' or fi.terminal = %(terminal)s)
        group by fi.flight_instance_id, fi.flight_no, fi.origin, fi.terminal, fi.est_arrival_local, fi.status
        order by fi.est_arrival_local
        """,
        {"terminal": terminal, "effective_now": effective_now},
    )
    return [
        {
            "flight_instance_id": row["flight_instance_id"],
            "code": row["code"],
            "origin": row["origin"],
            "terminal": row["terminal"],
            "eta": format_clock(row.get("eta_at")),
            "status": str(row.get("status", "")).replace("_", " ").title(),
            "demand": int(row.get("demand") or 0),
        }
        for row in rows
    ]


def load_demand_signals(terminal: str, effective_now: object = None) -> list[dict]:
    terminal = normalize_terminal(terminal)
    rows = fetch_all_safe(
        """
        select
            pds.id,
            coalesce(fi.flight_no, pds.vehicle_type) as zone,
            pds.flight_instance_id,
            pds.created_at_local as scanned_at,
            pds.pax_count as party_size,
            pds.luggage_count,
            pds.vehicle_type,
            pds.status
        from rawdata.passenger_demand_signals pds
        left join rawdata.flight_instances fi
            on fi.flight_instance_id = pds.flight_instance_id
        where pds.created_at_local >= coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp) - interval '20 minutes'
          and pds.created_at_local <= coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp)
          and (%(terminal)s = 'ALL' or fi.terminal = %(terminal)s)
        order by pds.created_at_local desc
        """,
        {"terminal": terminal, "effective_now": effective_now},
    )
    return [
        {
            "id": int(row["id"]),
            "zone": row["zone"],
            "flight_instance_id": row.get("flight_instance_id"),
            "time": format_clock(row.get("scanned_at")),
            "parties": int(row.get("party_size") or 0),
            "luggage": int(row.get("luggage_count") or 0),
            "vehicle_type": row.get("vehicle_type"),
            "status": row.get("status"),
        }
        for row in rows
    ]


def latest_supply_snapshot(effective_now: object = None) -> dict | None:
    return fetch_one_safe(
        """
        select
            airport_code,
            captured_at_local,
            taxis_in_holding,
            taxis_at_curb,
            active_lanes_json,
            lane_capacity_per_15m
        from rawdata.taxi_supply_snapshots
        where airport_code = 'BKK'
          and (%(effective_now)s is null or captured_at_local <= %(effective_now)s)
        order by captured_at_local desc
        limit 1
        """,
        {"effective_now": effective_now},
    )


def latest_weather_snapshot(effective_now: object = None) -> dict | None:
    return fetch_one_safe(
        """
        select
            airport_code,
            time_local,
            rain_mm,
            wind_kmh,
            temp_c
        from rawdata.weather_raw
        where airport_code = 'BKK'
          and (%(effective_now)s is null or time_local <= %(effective_now)s)
        order by time_local desc
        limit 1
        """,
        {"effective_now": effective_now},
    )

def load_supply_items(effective_now: object = None) -> list[dict]:
    supply = latest_supply_snapshot(effective_now)
    dispatch_rows = fetch_all_safe(
        """
        select lower(status) as status, count(*) as total
        from rawdata.driver_dispatch_events
        where airport_code = 'BKK'
          and created_at_local >= coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp) - interval '15 minutes'
          and created_at_local <= coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp)
        group by lower(status)
        """,
        {"effective_now": effective_now},
    )
    weather = latest_weather_snapshot(effective_now)
    dispatch_counts = {str(row["status"]).lower(): int(row["total"]) for row in dispatch_rows}

    return [
        {
            "name": "Taxis in holding",
            "detail": "Latest airport holding snapshot",
            "value": int((supply or {}).get("taxis_in_holding") or 0),
        },
        {
            "name": "Taxis at curb",
            "detail": "Latest curb availability",
            "value": int((supply or {}).get("taxis_at_curb") or 0),
        },
        {
            "name": "Lane capacity / 15m",
            "detail": "Capacity from the latest supply snapshot",
            "value": int((supply or {}).get("lane_capacity_per_15m") or 0),
        },
        {
            "name": "Recent dispatch events",
            "detail": "Last 15 minutes across control actions",
            "value": sum(dispatch_counts.values()),
        },
        {
            "name": "Weather now",
            "detail": f"Rain {float((weather or {}).get('rain_mm') or 0):.1f} mm · Wind {float((weather or {}).get('wind_kmh') or 0):.1f} km/h",
            "value": f"{float((weather or {}).get('temp_c') or 0):.1f} C",
        },
    ]


def load_forecast_series(effective_now: object = None) -> list[dict]:
    rows = fetch_all_safe(
        """
        select
            generated_at_local,
            ts_local,
            demand_pax,
            supply_taxis
        from mart.demand_supply_forecasts
        where airport_code = 'BKK'
          and ts_local between
                coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp)
            and coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp) + interval '3 hours'
        order by ts_local
        """,
        {"effective_now": effective_now},
    )
    return [
        {
            "ts": row.get("ts_local"),
            "time": format_clock(row.get("ts_local")),
            "demand": int(row.get("demand_pax") or 0),
            "supply": int(row.get("supply_taxis") or 0),
            "deficit_gap": max(int(row.get("demand_pax") or 0) - int(row.get("supply_taxis") or 0), 0),
            "generated_at": row.get("generated_at_local"),
        }
        for row in rows
    ]


def _fetch_debug_timestamps() -> dict[str, str]:
    """Return max timestamps for key rawdata and mart tables. Never exposes credentials."""
    queries = {
        "rawdata.flight_instances · max(est_arrival_local)":
            "SELECT max(est_arrival_local) AS ts FROM rawdata.flight_instances WHERE airport_code = 'BKK'",
        "rawdata.passenger_demand_signals · max(created_at_local)":
            "SELECT max(created_at_local) AS ts FROM rawdata.passenger_demand_signals WHERE airport_code = 'BKK'",
        "rawdata.taxi_supply_snapshots · max(captured_at_local)":
            "SELECT max(captured_at_local) AS ts FROM rawdata.taxi_supply_snapshots WHERE airport_code = 'BKK'",
        "rawdata.driver_dispatch_events · max(created_at_local)":
            "SELECT max(created_at_local) AS ts FROM rawdata.driver_dispatch_events WHERE airport_code = 'BKK'",
        "mart.ops_kpi_snapshots · max(captured_at_local)":
            "SELECT max(captured_at_local) AS ts FROM mart.ops_kpi_snapshots WHERE airport_code = 'BKK'",
        "mart.demand_supply_forecasts · max(ts_local)":
            "SELECT max(ts_local) AS ts FROM mart.demand_supply_forecasts WHERE airport_code = 'BKK'",
        "DB current Bangkok time":
            "SELECT timezone('Asia/Bangkok', now())::timestamp AS ts",
    }
    return {
        label: str((fetch_one_safe(sql) or {}).get("ts") or "NULL")
        for label, sql in queries.items()
    }


def latest_ai_advice(ops_view: dict) -> str:
    mart_row = fetch_one_safe(
        """
        select advisory_text, linked_action
        from mart.genai_advisory_outputs
        where airport_code = 'BKK'
        order by created_at_local desc
        limit 1
        """
    )
    if mart_row and mart_row.get("advisory_text"):
        return str(mart_row["advisory_text"])

    weather = ops_view.get("weather") or {}
    peak_slot = max(ops_view["forecast"], key=lambda item: item["demand"] - item["supply"]) if ops_view["forecast"] else None
    if not peak_slot:
        return f"DB connected for {ops_view['title']}. Continue monitoring live KPIs and airside conditions."

    gap = peak_slot["demand"] - peak_slot["supply"]
    if gap > 0:
        return (
            f"Demand is projected to exceed supply by about {gap} around {peak_slot['time']}. "
            f"Prepare overflow handling and message nearby drivers before the peak window. Weather now: {float(weather.get('rain_mm') or 0):.1f} mm rain, {float(weather.get('wind_kmh') or 0):.1f} km/h wind."
        )
    return f"Supply is currently covering demand for {ops_view['title']}. Maintain driver messaging and monitor the next arrival pulse."


def compute_deficit_window(forecast: list[dict]) -> dict:
    deficit_points = [point for point in forecast if point["demand"] > point["supply"]]
    if not deficit_points:
        return {
            "exists": False,
            "start": "-",
            "end": "-",
            "peak_gap": 0,
            "peak_pct": 0,
            "start_ts": None,
            "end_ts": None,
        }

    start_point = deficit_points[0]
    end_point = deficit_points[-1]
    peak_gap = max(point["demand"] - point["supply"] for point in deficit_points)
    peak_supply = max(max(point["supply"], 1) for point in deficit_points)
    peak_pct = round((peak_gap / peak_supply) * 100)
    return {
        "exists": True,
        "start": start_point["time"],
        "end": end_point["time"],
        "peak_gap": peak_gap,
        "peak_pct": peak_pct,
        "start_ts": start_point.get("ts"),
        "end_ts": end_point.get("ts"),
    }


def ensure_ops_view_shape(ops_view: dict) -> dict:
    normalized = dict(ops_view)
    forecast = []
    for point in normalized.get("forecast", []):
        demand = int(point.get("demand") or 0)
        supply = int(point.get("supply") or 0)
        forecast.append(
            {
                **point,
                "demand": demand,
                "supply": supply,
                "deficit_gap": int(point.get("deficit_gap") or max(demand - supply, 0)),
            }
        )

    normalized["forecast"] = forecast
    deficit_window = normalized.get("deficitWindow") or compute_deficit_window(forecast)
    normalized["deficitWindow"] = deficit_window

    critical_window = normalized.get("criticalWindow") or {}
    normalized["criticalWindow"] = {
        "start": critical_window.get("start", deficit_window["start"]),
        "end": critical_window.get("end", deficit_window["end"]),
    }
    normalized["projectedDeficit"] = int(
        normalized.get("projectedDeficit") or deficit_window["peak_pct"]
    )
    normalized["weather"] = normalized.get("weather") or {}
    normalized["activeLanes"] = int(normalized.get("activeLanes") or 0)
    normalized["notes"] = str(normalized.get("notes") or "")
    return normalized


def build_deficit_breakdown(ops_view: dict) -> list[dict]:
    breakdown: list[dict] = []
    for flight in sorted(ops_view["flights"], key=lambda item: item["demand"], reverse=True)[:2]:
        breakdown.append(
            {
                "factor": f"{flight['code']} arrival wave from {flight['origin']}",
                "impact": int(flight["demand"]),
                "type": "demand",
            }
        )

    if ops_view["demandSignals"]:
        parties = sum(signal["parties"] for signal in ops_view["demandSignals"])
        breakdown.append(
            {
                "factor": "Recent QR scan activity across baggage claim",
                "impact": parties,
                "type": "demand",
            }
        )

    supply_lookup: dict[str, int] = {}
    for item in ops_view["supply"]:
        try:
            supply_lookup[item["name"]] = int(item["value"])
        except (TypeError, ValueError):
            continue
    holding = supply_lookup.get("Taxis in holding", 0)
    curb = supply_lookup.get("Taxis at curb", 0)
    dispatch_events = supply_lookup.get("Recent dispatch events", 0)

    breakdown.append(
        {
            "factor": "Holding lane capacity buffer",
            "impact": -holding,
            "type": "supply",
        }
    )
    breakdown.append(
        {
            "factor": "Curb-side ready taxi availability",
            "impact": -curb,
            "type": "supply",
        }
    )
    if dispatch_events:
        breakdown.append(
            {
                "factor": "Recent control actions already in flight",
                "impact": -dispatch_events,
                "type": "supply",
            }
        )
    return breakdown


def build_impact_simulation(ops_view: dict) -> dict:
    peak_gap = ops_view["deficitWindow"]["peak_gap"]
    peak_pct = ops_view["deficitWindow"]["peak_pct"]
    projected_gap = max(round(peak_pct * 0.45), 0)
    current_pwt = max(int(ops_view["pwt"]), 0)
    projected_pwt = max(round(current_pwt * 0.7), 4) if peak_pct > 0 else current_pwt
    reduction_pct = max(round(((current_pwt - projected_pwt) / max(current_pwt, 1)) * 100), 0)

    return {
        "current_pwt": current_pwt,
        "projected_pwt": projected_pwt,
        "pwt_reduction_pct": reduction_pct,
        "current_deficit": int(max(peak_pct, 0)),
        "projected_deficit": int(projected_gap),
        "queue_time_reduction": max(current_pwt - projected_pwt, 0),
        "action": "Activate extra lane plus broadcast to drivers",
    }


def _safe_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _supply_value(ops_view: dict, name: str, default: float = 0.0) -> float:
    for item in ops_view.get("supply", []):
        if item.get("name") == name:
            return _safe_float(item.get("value"), default)
    return default


def build_ml_feature_row(ops_view: dict) -> dict:
    forecast = ops_view.get("forecast") or []
    first_ts = forecast[0].get("ts") if forecast else None
    hour_of_day = first_ts.hour if isinstance(first_ts, datetime) else 0
    day_of_week = first_ts.weekday() if isinstance(first_ts, datetime) else 0
    demand_signals = ops_view.get("demandSignals") or []
    flights = ops_view.get("flights") or []
    weather = ops_view.get("weather") or {}

    taxis_in_holding = _supply_value(
        ops_view,
        "Taxis in holding",
        _safe_float(ops_view.get("holdingTaxis")),
    )

    return {
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "is_weekend": int(day_of_week >= 5),
        "confirmed_qr_count": len(demand_signals),
        "total_pax": sum(_safe_float(signal.get("parties")) for signal in demand_signals),
        "total_luggage": sum(_safe_float(signal.get("luggage")) for signal in demand_signals),
        "arriving_flights": len(flights),
        "pax_est": sum(_safe_float(flight.get("demand")) for flight in flights),
        "delay_avg_min": 0,
        "avg_taxis_in_holding": taxis_in_holding,
        "avg_taxis_at_curb": _supply_value(ops_view, "Taxis at curb"),
        "avg_active_lanes": _safe_float(ops_view.get("activeLanes")),
        "avg_lane_capacity": _supply_value(ops_view, "Lane capacity / 15m"),
        "rain_mm": _safe_float(weather.get("rain_mm")),
        "wind_kmh": _safe_float(weather.get("wind_kmh")),
        "temp_c": _safe_float(weather.get("temp_c")),
    }


def build_ops_view_from_db(terminal: str, effective_now: EffectiveNow | None = None) -> dict | None:
    terminal = normalize_terminal(terminal)
    if effective_now is None:
        effective_now = get_effective_now()
    eff_ts = effective_now.ts

    kpi = latest_kpi_snapshot(eff_ts)
    flights = load_flights(terminal, eff_ts)
    signals = load_demand_signals(terminal, eff_ts)
    supply = load_supply_items(eff_ts)
    forecast = load_forecast_series(eff_ts)
    weather = latest_weather_snapshot(eff_ts)

    raw_supply = latest_supply_snapshot(eff_ts)
    if not any([kpi, flights, signals, forecast, raw_supply]):
        return None

    top_title = TERMINAL_TITLES.get(terminal, "Terminal view")
    deficit_window = compute_deficit_window(forecast)

    ops_view = {
        "code": terminal,
        "title": top_title,
        "subtitle": "Live database view",
        "pwt": kpi["pwt"] if kpi else 0,
        "waitingPassengers": kpi["waitingPassengers"] if kpi else 0,
        "waitingTrend": kpi["waitingTrend"] if kpi else "Live",
        "holdingTaxis": kpi["holdingTaxis"] if kpi else 0,
        "taxiTrend": kpi["taxiTrend"] if kpi else "Live",
        "laneLoad": kpi["laneLoad"] if kpi else 0,
        "fleetReadiness": kpi["fleetReadiness"] if kpi else 0.0,
        "projectedDeficit": deficit_window["peak_pct"],
        "criticalWindow": {"start": deficit_window["start"], "end": deficit_window["end"]},
        "deficitWindow": deficit_window,
        "flights": flights,
        "demandSignals": signals,
        "supply": supply,
        "forecast": forecast,
        "weather": weather or {},
        "activeLanes": (kpi or {}).get("activeLanes", 0),
        "notes": (kpi or {}).get("notes", ""),
    }
    ops_view["aiAdvice"] = latest_ai_advice(ops_view)
    ops_view["deficitBreakdown"] = build_deficit_breakdown(ops_view)
    ops_view["impactSimulation"] = build_impact_simulation(ops_view)
    ops_view["_using_mart_kpi"] = kpi is not None
    ops_view["_using_mart_forecast"] = bool(forecast)
    ops_view["_using_mock"] = False
    dispatch_count = next(
        (item["value"] for item in supply if "dispatch" in item.get("name", "").lower()), 0
    )
    ops_view["_debug_info"] = {
        "effective_now": str(effective_now),
        "effective_now_source": effective_now.source,
        "flights_count": len(flights),
        "demand_signals_count": len(signals),
        "dispatch_events_count": int(dispatch_count),
        "supply_snapshot_present": raw_supply is not None,
        "forecast_points_count": len(forecast),
        "kpi_present": kpi is not None,
    }
    return ensure_ops_view_shape(ops_view)


def db_status_badge(connected: bool, info: dict | None = None) -> None:
    label = "Connected" if connected else "Not Connected"
    color = "#0c7d35" if connected else "#b91c1c"
    bg = "#e9f8ef" if connected else "#fdecec"
    source = str((info or {}).get("source", ""))
    error = str((info or {}).get("error", ""))
    source_html = (
        f'<div style="font-size:0.72rem;color:#64748b;margin-top:0.1rem;">{escape(source)}</div>'
        if source else ""
    )
    error_html = (
        f'<div style="font-size:0.66rem;color:#b91c1c;margin-top:0.08rem;overflow-wrap:anywhere;">{escape(error[:120])}</div>'
        if error and not connected else ""
    )
    with st.container():
        st.markdown(
            f"""
            <div style="margin-top:0.35rem;padding:0.55rem 0.7rem;border-radius:0.85rem;border:1px solid #dfe8f2;background:{bg};">
              <div class="ops-section-eyebrow" style="margin-bottom:0.18rem;">DB Status</div>
              <div style="font-size:0.95rem;font-weight:700;color:{color};">{label}</div>
              {source_html}{error_html}
            </div>
            """,
            unsafe_allow_html=True,
        )


def log_dispatch_action(action_type: str, ops_view: dict) -> None:
    top_signal = ops_view["demandSignals"][0] if ops_view["demandSignals"] else {}
    top_flight = ops_view["flights"][0] if ops_view["flights"] else {}
    lane_value = 2 if action_type == "lane_activated" else None
    advisory_text = (
        f"Operator action logged: {action_type.replace('_', ' ')} for BKK. "
        f"Deficit window {ops_view['deficitWindow']['start']} to {ops_view['deficitWindow']['end']}. "
        f"PWT {ops_view['pwt']} min, projected deficit {ops_view['projectedDeficit']}%."
    )

    execute(
        """
        insert into rawdata.driver_dispatch_events (
            airport_code,
            created_at_local,
            updated_at_local,
            driver_id,
            signal_id,
            flight_instance_id,
            lane,
            status
        )
        values (%s, timezone('Asia/Bangkok', now())::timestamp, timezone('Asia/Bangkok', now())::timestamp, %s, %s, %s, %s, %s)
        """,
        (
            "BKK",
            "OPS_CONTROL_TOWER",
            top_signal.get("id"),
            top_flight.get("flight_instance_id"),
            lane_value,
            action_type,
        ),
    )
    execute(
        """
        insert into mart.genai_advisory_outputs (
            airport_code,
            created_at_local,
            deficit_window_start_local,
            deficit_window_end_local,
            advisory_text,
            linked_action
        )
        values (%s, timezone('Asia/Bangkok', now())::timestamp, %s, %s, %s, %s)
        """,
        (
            "BKK",
            ops_view["deficitWindow"]["start_ts"],
            ops_view["deficitWindow"]["end_ts"],
            advisory_text,
            action_type,
        ),
    )


def apply_ops_typography_styles() -> None:
    st.markdown(
        """
        <style>
        .ops-section-eyebrow {
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #64748b;
          line-height: 1.2;
          margin-bottom: 0.35rem;
        }

        .ops-section-title {
          font-size: 1.02rem;
          font-weight: 700;
          line-height: 1.3;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin-bottom: 0;
          text-wrap: balance;
        }

        .ops-item-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.24rem 0.52rem;
          border-radius: 999px;
          background: #eef3ff;
          font-size: 0.62rem;
          font-weight: 700;
          color: #4b6487;
          text-align: center;
          line-height: 1;
          white-space: nowrap;
          letter-spacing: 0.03em;
        }

        .ops-control-shell {
          padding: 0.15rem 0.1rem 0;
        }

        .ops-control-note {
          font-size: 0.76rem;
          color: #64748b;
          line-height: 1.4;
          margin-top: 0.2rem;
        }

        .ops-card-title {
          font-size: 0.93rem;
          font-weight: 600;
          line-height: 1.34;
          letter-spacing: -0.01em;
          color: #0f172a;
          margin-bottom: 0.16rem;
        }

        .ops-card-subtitle {
          font-size: 0.78rem;
          font-weight: 400;
          line-height: 1.45;
          color: #64748b;
        }

        .ops-card-caption {
          font-size: 0.58rem;
          font-weight: 600;
          line-height: 1.2;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          text-align: right;
          white-space: nowrap;
          margin-bottom: 0.24rem;
        }

        .ops-card-value {
          font-size: 1.02rem;
          font-weight: 700;
          line-height: 1.18;
          letter-spacing: -0.01em;
          color: #0f172a;
          text-align: right;
          white-space: nowrap;
        }

        .ops-card-value-compact {
          font-size: 0.94rem;
          line-height: 1.14;
        }

        .ops-card-caption-soft {
          font-size: 0.56rem;
          letter-spacing: 0.02em;
        }

        .ops-section-shell {
          padding: 0.08rem;
        }

        .ops-section-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: start;
          gap: 0.7rem;
          padding: 0.12rem 0.18rem 0.95rem;
        }

        .ops-section-head-main {
          min-width: 0;
          max-width: 18.2rem;
        }

        .ops-section-head-side {
          align-self: start;
          justify-self: end;
          padding-top: 0.04rem;
        }

        .ops-list-stack {
          display: flex;
          flex-direction: column;
          gap: 0.78rem;
        }

        .ops-list-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 7.35rem;
          align-items: start;
          gap: 0.9rem;
          padding: 0.96rem 1.02rem;
          border: 1px solid #dfe8f2;
          border-radius: 1rem;
          background: #ffffff;
        }

        .ops-card-main {
          min-width: 0;
          padding-right: 0.08rem;
        }

        .ops-card-side {
          width: 7.35rem;
          text-align: right;
          padding-right: 0.08rem;
          padding-top: 0.06rem;
        }

        .ops-card-main .ops-card-title,
        .ops-card-main .ops-card-subtitle {
          overflow-wrap: anywhere;
        }

        .ops-context-card {
          padding: 0.25rem 0 0.1rem;
        }

        .ops-context-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #64748b;
          line-height: 1.2;
        }

        .ops-context-value {
          font-size: 1.1rem;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin-top: 0.22rem;
          white-space: nowrap;
        }

        @keyframes ops-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def build_forecast_chart_frame(series: list[dict]) -> pd.DataFrame:
    if not series:
        return pd.DataFrame(columns=["demand", "supply", "deficit_gap"])
    frame = pd.DataFrame(series).set_index("time")
    return frame[["demand", "supply", "deficit_gap"]]


def with_fallback(items: list[dict], fallback: list[dict]) -> list[dict]:
    return items if items else fallback


def render_ops_detail_section(
    eyebrow: str,
    title: str,
    items: list[dict],
    fallback_items: list[dict],
    row_widths: tuple[float, float] = (3.9, 1.35),
    compact_metric: bool = False,
) -> None:
    resolved_items = with_fallback(items, fallback_items)

    with st.container(border=True):
        header_left, header_right = st.columns([6.3, 0.7], gap="small")
        with header_left:
            st.markdown(
                f"""
                <div class="ops-section-eyebrow">{escape(eyebrow.upper())}</div>
                <div class="ops-section-title">{escape(title)}</div>
                """,
                unsafe_allow_html=True,
            )
        with header_right:
            st.markdown(
                f'<div class="ops-item-count">{len(resolved_items)} items</div>',
                unsafe_allow_html=True,
            )

        for item in resolved_items:
            try:
                with st.container(border=True):
                    row_left, row_right = st.columns(list(row_widths), gap="medium")
                    with row_left:
                        st.markdown(
                            f'<div class="ops-card-title">{escape(str(item.get("title", "Untitled")))}</div>',
                            unsafe_allow_html=True,
                        )
                        if item.get("subtitle"):
                            st.markdown(
                                f'<div class="ops-card-subtitle">{escape(str(item["subtitle"]))}</div>',
                                unsafe_allow_html=True,
                            )
                    with row_right:
                        if item.get("caption"):
                            caption_class = "ops-card-caption ops-card-caption-soft" if compact_metric else "ops-card-caption"
                            st.markdown(
                                f'<div class="{caption_class}">{escape(str(item["caption"]))}</div>',
                                unsafe_allow_html=True,
                            )
                        value_class = "ops-card-value ops-card-value-compact" if compact_metric else "ops-card-value"
                        st.markdown(
                            f'<div class="{value_class}">{escape(str(item.get("value", "-")))}</div>',
                            unsafe_allow_html=True,
                        )
            except Exception:
                with st.container(border=True):
                    st.write(item.get("title", "Untitled"))
                    if item.get("subtitle"):
                        st.caption(item["subtitle"])
                    label = f"{item.get('caption', '')} " if item.get("caption") else ""
                    st.write(f"{label}{item.get('value', '-')}")


def ensure_ops_ai_state() -> None:
    st.session_state.setdefault("ops_ai_session_ids", {})
    st.session_state.setdefault("ops_ai_histories", {})
    st.session_state.setdefault("ops_ai_chat_input", "")
    st.session_state.setdefault("ops_ai_last_mode", "")
    st.session_state.setdefault("ops_ai_last_error", "")


def default_ai_message() -> dict:
    return {
        "role": "assistant",
        "content": {
            "summary": "Hello Ride AI Advisory is ready. Ask about deficit risk, arrival-wave pressure, lane activation, or the next 15 minutes of BKK operations.",
            "root_causes": [],
            "recommended_actions": [],
            "next_15_min_plan": [],
            "assumptions": [],
        },
        "context_json": None,
    }


def get_terminal_chat_history(terminal: str) -> list[dict]:
    terminal = normalize_terminal(terminal)
    histories = st.session_state.ops_ai_histories
    if terminal not in histories:
        histories[terminal] = [default_ai_message()]
    return histories[terminal]


def parse_chat_content(role: str, content: str) -> str | dict:
    if role != "assistant":
        return content
    try:
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    return content


def load_chat_history_from_db(session_id: int) -> list[dict]:
    rows = fetch_all_safe(
        """
        select role, content, context_json
        from mart.ops_ai_chat_messages
        where session_id = %(session_id)s
        order by created_at_local asc, id asc
        """,
        {"session_id": session_id},
    )
    if not rows:
        return [default_ai_message()]

    return [
        {
            "role": row["role"],
            "content": parse_chat_content(str(row["role"]), str(row["content"])),
            "context_json": row.get("context_json"),
        }
        for row in rows
    ]


def get_existing_chat_session_id(terminal: str) -> int | None:
    row = fetch_one_safe(
        """
        select id
        from mart.ops_ai_chat_sessions
        where airport_code = 'BKK'
          and terminal = %(terminal)s
          and mode = 'ai_advisory'
        order by created_at_local desc, id desc
        limit 1
        """,
        {"terminal": normalize_terminal(terminal)},
    )
    return int(row["id"]) if row and row.get("id") is not None else None


def prime_chat_state_from_db(terminal: str, db_connected: bool) -> None:
    ensure_ops_ai_state()
    terminal = normalize_terminal(terminal)
    if terminal in st.session_state.ops_ai_histories:
        return

    if not db_connected:
        st.session_state.ops_ai_histories[terminal] = [default_ai_message()]
        return

    session_id = get_existing_chat_session_id(terminal)
    if session_id:
        st.session_state.ops_ai_session_ids[terminal] = session_id
        st.session_state.ops_ai_histories[terminal] = load_chat_history_from_db(session_id)
        return

    st.session_state.ops_ai_histories[terminal] = [default_ai_message()]


def get_or_create_chat_session_id(terminal: str, db_connected: bool) -> int | None:
    ensure_ops_ai_state()
    terminal = normalize_terminal(terminal)
    session_ids = st.session_state.ops_ai_session_ids
    if terminal in session_ids:
        return session_ids[terminal]

    if not db_connected:
        return None

    existing_id = get_existing_chat_session_id(terminal)
    if existing_id:
        session_ids[terminal] = existing_id
        return existing_id

    created = fetch_one_safe(
        """
        insert into mart.ops_ai_chat_sessions (
            airport_code,
            terminal,
            mode,
            created_at_local
        )
        values ('BKK', %(terminal)s, 'ai_advisory', timezone('Asia/Bangkok', now())::timestamp)
        returning id
        """,
        {"terminal": terminal},
    )
    if created and created.get("id") is not None:
        session_ids[terminal] = int(created["id"])
        return int(created["id"])
    return None


def persist_chat_message(
    session_id: int | None,
    role: str,
    content: str,
    context_json: str | None = None,
) -> None:
    if session_id is None:
        return
    execute(
        """
        insert into mart.ops_ai_chat_messages (
            session_id,
            role,
            content,
            context_json,
            created_at_local
        )
        values (%s, %s, %s, %s, timezone('Asia/Bangkok', now())::timestamp)
        """,
        (session_id, role, content, context_json),
    )


def render_assistant_payload(payload: str | dict) -> None:
    if not isinstance(payload, dict):
        st.write(str(payload))
        return

    summary = str(payload.get("summary") or "").strip()
    if summary:
        st.write(summary)

    sections = [
        ("Root causes", payload.get("root_causes") or []),
        ("Recommended actions", payload.get("recommended_actions") or []),
        ("Next 15 min plan", payload.get("next_15_min_plan") or []),
        ("Assumptions", payload.get("assumptions") or []),
    ]
    for title, items in sections:
        items = [str(item).strip() for item in items if str(item).strip()]
        if not items:
            continue
        st.markdown(f"**{title}**")
        for item in items:
            st.markdown(f"- {item}")


def advisory_strip_from_context(context: dict) -> dict:
    latest_kpi = context.get("latest_kpi", {})
    forecast = context.get("forecast_next_3h", {})
    peak_gap = int(forecast.get("peak_deficit_gap") or 0)
    supply_points = [
        max(int(point.get("supply_taxis") or 0), 1)
        for point in (forecast.get("timeseries") or [])
        if int(point.get("demand_pax") or 0) > int(point.get("supply_taxis") or 0)
    ]
    projected_deficit_pct = round((peak_gap / max(max(supply_points, default=1), 1)) * 100) if peak_gap else 0
    return {
        "terminal": context.get("terminal", "ALL"),
        "pwt_min": round(float(latest_kpi.get("pwt_min") or 0), 1),
        "projected_deficit_pct": int(projected_deficit_pct),
        "waiting_pax": int(latest_kpi.get("waiting_pax") or 0),
        "available_taxis": int(latest_kpi.get("available_taxis") or 0),
    }


def get_mock_advisory_response(user_message: str, terminal_context: str, ops_metrics: dict) -> str:
    prompt = user_message.lower()
    top_flight = max(ops_metrics["flights"], key=lambda item: item["demand"]) if ops_metrics["flights"] else None
    peak_slot = max(ops_metrics["forecast"], key=lambda item: item["demand"] - item["supply"]) if ops_metrics["forecast"] else None
    deficit_gap = peak_slot["demand"] - peak_slot["supply"] if peak_slot else 0

    if "causing the projected deficit" in prompt or "arrival wave risk" in prompt:
        if top_flight and peak_slot:
            return (
                f"{terminal_context} is under pressure because demand peaks around {peak_slot['time']}, where forecast demand exceeds supply by about {deficit_gap}. "
                f"The largest arrival driver is {top_flight['code']} from {top_flight['origin']} with {top_flight['demand']} forecast passengers, and current PWT is {ops_metrics['pwt']} minutes."
            )

    if "overflow capacity" in prompt or "activate overflow" in prompt:
        if ops_metrics["pwt"] > OPS_PWT_ALERT_THRESHOLD or ops_metrics["projectedDeficit"] >= 25:
            return (
                f"Yes for {terminal_context}: projected deficit is {ops_metrics['projectedDeficit']}% and PWT is {ops_metrics['pwt']} minutes, above the {OPS_PWT_ALERT_THRESHOLD}-minute guardrail. "
                "Ops should prepare overflow handling now and pair it with an immediate driver broadcast."
            )
        return (
            f"Not yet for {terminal_context}. PWT is {ops_metrics['pwt']} minutes and projected deficit is {ops_metrics['projectedDeficit']}%, so I would hold overflow capacity in reserve and keep monitoring the next arrival pulse."
        )

    if "summarize terminal 1 status" in prompt or "summarize" in prompt:
        return (
            f"{terminal_context} summary: PWT is {ops_metrics['pwt']} minutes, projected deficit is {ops_metrics['projectedDeficit']}%, waiting passengers are {ops_metrics['waitingPassengers']}, and available taxis are {ops_metrics['holdingTaxis']}. "
            f"Lane load is {ops_metrics['laneLoad']}% and fleet readiness is {ops_metrics['fleetReadiness']}%."
        )

    if "next 15 minutes" in prompt:
        return (
            f"For the next 15 minutes in {terminal_context}, focus on three actions: keep driver messaging active, protect holding supply around the {ops_metrics['criticalWindow']['start']} to {ops_metrics['criticalWindow']['end']} risk window, and watch whether waiting passengers stay above {ops_metrics['waitingPassengers']} with no improvement in PWT."
        )

    if "drivers sufficient" in prompt or "drivers" in prompt:
        sufficiency = "not sufficient" if ops_metrics["holdingTaxis"] < ops_metrics["waitingPassengers"] else "currently sufficient"
        return (
            f"Driver supply in {terminal_context} is {sufficiency}. There are {ops_metrics['holdingTaxis']} available taxis against {ops_metrics['waitingPassengers']} waiting passengers, and the projected deficit is {ops_metrics['projectedDeficit']}%."
        )

    return (
        f"For {terminal_context}, the live picture is PWT {ops_metrics['pwt']} minutes, projected deficit {ops_metrics['projectedDeficit']}%, waiting passengers {ops_metrics['waitingPassengers']}, and available taxis {ops_metrics['holdingTaxis']}. "
        "I can help explain risk, recommend next actions, or summarize terminal status."
    )


def render_ai_context_summary(context_strip: dict) -> None:
    with st.container(border=True):
        st.markdown("#### Advisory context")
        st.caption("Live OPS context used by the assistant")
        metric_cols = st.columns(5, gap="small")
        metrics = [
            ("Current terminal", context_strip["terminal"]),
            ("PWT", f"{context_strip['pwt_min']} min"),
            ("Projected deficit", f"{context_strip['projected_deficit_pct']}%"),
            ("Waiting pax", str(context_strip["waiting_pax"])),
            ("Available taxis", str(context_strip["available_taxis"])),
        ]
        for column, (label, value) in zip(metric_cols, metrics):
            with column:
                st.markdown(
                    f"""
                    <div class="ops-context-card">
                      <div class="ops-context-label">{label}</div>
                      <div class="ops-context-value">{value}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

def _render_ai_status_badge() -> None:
    mode = st.session_state.get("ops_ai_last_mode", "")
    error = st.session_state.get("ops_ai_last_error", "")
    if mode == "gemini":
        color, bg, border, dot, label = "#0c7d35", "#e9f8ef", "#a7f3d0", "#0c7d35", "AI: Connected"
    elif mode == "mock":
        color, bg, border, dot, label = "#9a3412", "#fff7ed", "#fed7aa", "#f97316", "AI: Offline (Mock)"
    else:
        color, bg, border, dot, label = "#475569", "#f1f5f9", "#cbd5e1", "#94a3b8", "AI: Ready"
    error_html = (
        f'<span style="font-size:0.7rem;color:#94a3b8;margin-left:0.4rem;">{escape(error[:80])}</span>'
        if error and mode == "mock"
        else ""
    )
    st.markdown(
        f"""<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.6rem;">
          <span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.22rem 0.65rem 0.22rem 0.5rem;
          border-radius:999px;background:{bg};border:1px solid {border};font-size:0.72rem;font-weight:700;
          color:{color};white-space:nowrap;">
            <span style="display:inline-block;width:0.45rem;height:0.45rem;border-radius:50%;background:{dot};"></span>
            {label}
          </span>{error_html}
        </div>""",
        unsafe_allow_html=True,
    )


def render_ai_advisory(ops_view: dict, db_connected: bool) -> None:
    ensure_ops_ai_state()
    terminal = normalize_terminal(st.session_state.ops_terminal)
    prime_chat_state_from_db(terminal, db_connected=db_connected)
    history = get_terminal_chat_history(terminal)
    cached_context = get_cached_ops_context("BKK", terminal)
    context_strip = advisory_strip_from_context(cached_context)

    render_ai_context_summary(context_strip)
    _render_ai_status_badge()

    with st.expander("Test AI connection", expanded=False):
        if st.button("Ping Gemini", key="btn_ping_gemini"):
            with st.spinner("Testing Gemini connection..."):
                ok, msg = ping_gemini()
            if ok:
                st.success(f"Connected: {msg}")
            else:
                st.error(f"Gemini unreachable: {msg}")

    if not db_connected:
        st.warning("Database is not connected. Advisory responses will use safe fallback phrasing and chat history will not be persisted.")
    elif cached_context.get("missing_data"):
        st.warning(
            "Some live context is missing from the database: "
            + ", ".join(str(item) for item in cached_context["missing_data"])
        )

    with st.container(border=True):
        st.caption("Quick prompts")
        quick_prompts = [
            "What is causing the projected deficit?",
            "Should we activate overflow capacity now?",
            "Summarize this terminal status",
            "What should ops do in the next 15 minutes?",
            "Explain the arrival wave risk",
            "Are drivers sufficient for current demand?",
        ]
        prompt_cols = st.columns(3, gap="small")
        for index, prompt in enumerate(quick_prompts):
            with prompt_cols[index % 3]:
                if st.button(prompt, width="stretch", key=f"ops_prompt_{prompt}"):
                    st.session_state.ops_ai_chat_input = prompt

    with st.container(border=True):
        st.caption("Advisory chat")
        for message in history:
            with st.chat_message(message["role"]):
                if message["role"] == "assistant":
                    render_assistant_payload(message["content"])
                else:
                    st.write(str(message["content"]))

        user_question = st.chat_input(
            "Ask about deficits, arrivals, supply, or the next actions",
            key="ops_ai_chat_input",
        )

        if user_question and user_question.strip():
            question = user_question.strip()
            terminal_history = get_terminal_chat_history(terminal)
            terminal_history.append({"role": "user", "content": question, "context_json": None})

            session_id = get_or_create_chat_session_id(terminal, db_connected=db_connected)
            if db_connected:
                try:
                    persist_chat_message(session_id, "user", question)
                except Exception as exc:
                    st.warning(f"Could not persist user message: {exc}")

            with st.spinner("Generating advisory..."):
                answer = generate_ops_answer(question, "BKK", terminal)

            assistant_content = json.dumps(answer, ensure_ascii=True)
            assistant_context_json = json.dumps(cached_context, default=str, ensure_ascii=True)
            terminal_history.append(
                {
                    "role": "assistant",
                    "content": answer,
                    "context_json": assistant_context_json,
                }
            )
            if db_connected:
                try:
                    persist_chat_message(
                        session_id,
                        "assistant",
                        assistant_content,
                        assistant_context_json,
                    )
                except Exception as exc:
                    st.warning(f"Could not persist assistant message: {exc}")
            st.rerun()


def render_critical_alert(ops_view: dict) -> None:
    has_deficit = ops_view["deficitWindow"]["exists"]
    if not has_deficit and ops_view["pwt"] <= OPS_PWT_ALERT_THRESHOLD:
        return
    weather = ops_view.get("weather", {})
    render_alert_card(
        title=f"Deficit Alert — PWT {ops_view['pwt']} min",
        body=(
            f"Forecast demand exceeds supply by up to {ops_view['deficitWindow']['peak_gap']} during "
            f"{ops_view['criticalWindow']['start']} – {ops_view['criticalWindow']['end']}. "
            f"Weather now: {float(weather.get('rain_mm') or 0):.1f} mm rain, {float(weather.get('wind_kmh') or 0):.1f} km/h wind."
        ),
        advisory=ops_view["aiAdvice"],
    )


def render_ai_advisory_card(ops_view: dict) -> None:
    render_section_heading("AI Advisory", "Recommended Action")
    render_info_card(
        eyebrow=f"AI Advisory · {ops_view['title']}",
        title="Recommended next action",
        body=ops_view["aiAdvice"],
        tone="ops",
    )


def render_deficit_breakdown(ops_view: dict) -> None:
    breakdown = ops_view.get("deficitBreakdown", [])
    if not breakdown:
        return
    render_section_heading("Deficit Breakdown", "Why is there a projected gap?")
    demand_factors = [f for f in breakdown if f["type"] == "demand"]
    supply_factors = [f for f in breakdown if f["type"] == "supply"]
    with st.container(border=True):
        left_col, right_col = st.columns(2, gap="medium")
        with left_col:
            st.markdown('<div class="ops-section-eyebrow">DEMAND PRESSURE</div>', unsafe_allow_html=True)
            for item in demand_factors:
                st.markdown(
                    f'<div class="ops-list-card">'
                    f'<div class="ops-card-main"><div class="ops-card-title">{escape(item["factor"])}</div></div>'
                    f'<div class="ops-card-side">'
                    f'<div class="ops-card-caption">forecast pax</div>'
                    f'<div class="ops-card-value" style="color:#0c7d35;">&#8593; +{item["impact"]}</div>'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )
        with right_col:
            st.markdown('<div class="ops-section-eyebrow">SUPPLY CONSTRAINTS</div>', unsafe_allow_html=True)
            for item in supply_factors:
                st.markdown(
                    f'<div class="ops-list-card">'
                    f'<div class="ops-card-main"><div class="ops-card-title">{escape(item["factor"])}</div></div>'
                    f'<div class="ops-card-side">'
                    f'<div class="ops-card-caption">taxis short</div>'
                    f'<div class="ops-card-value" style="color:#b91c1c;">&#8595; -{abs(item["impact"])}</div>'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )


def render_impact_simulation(ops_view: dict) -> None:
    sim = ops_view.get("impactSimulation")
    if not sim:
        return
    render_section_heading("Impact Simulation", "If we act now — projected outcome")
    with st.container(border=True):
        st.markdown(
            f'<div class="ops-section-eyebrow">RECOMMENDED ACTION</div>'
            f'<div class="ops-section-title">{escape(sim["action"])}</div>',
            unsafe_allow_html=True,
        )
        st.markdown("<br>", unsafe_allow_html=True)
        before_col, arrow_col, after_col = st.columns([1, 0.18, 1], gap="small")
        with before_col:
            with st.container(border=True):
                st.markdown('<div class="ops-section-eyebrow">CURRENT STATE</div>', unsafe_allow_html=True)
                render_metric_card("PWT", f"{sim['current_pwt']} min", tone="danger")
                render_metric_card("Projected deficit", f"{sim['current_deficit']}%", tone="danger")
        with arrow_col:
            st.markdown(
                '<div style="text-align:center;font-size:1.4rem;padding-top:2.4rem;color:#64748b;">&#8594;</div>',
                unsafe_allow_html=True,
            )
        with after_col:
            with st.container(border=True):
                st.markdown('<div class="ops-section-eyebrow">AFTER ACTION</div>', unsafe_allow_html=True)
                render_metric_card("PWT", f"{sim['projected_pwt']} min", f"\u2212{sim['pwt_reduction_pct']}% reduction", tone="ops")
                render_metric_card("Projected deficit", f"{sim['projected_deficit']}%", f"\u2212{sim['queue_time_reduction']} min queue time", tone="ops")


def render_ml_prediction_card(ops_view: dict) -> None:
    render_section_heading("ML Prediction: Wait Time & Breach Risk", "Runtime inference")
    ml_result = predict_ops_ml(build_ml_feature_row(ops_view))

    with st.container(border=True):
        st.caption("Model trained offline in Colab using XGBoost and loaded at runtime for inference.")
        if not ml_result.get("available"):
            st.warning(f"ML prediction unavailable: {ml_result.get('error', 'Unknown error')}")
            return

        risk_label = "High risk" if ml_result.get("is_breach_risk") else "Under control"
        risk_tone = "danger" if ml_result.get("is_breach_risk") else "ops"
        metric_cols = st.columns(3, gap="medium")
        with metric_cols[0]:
            render_metric_card(
                "Predicted Wait Time",
                f"{float(ml_result['predicted_wait_min']):.1f} min",
                tone=risk_tone,
            )
        with metric_cols[1]:
            render_metric_card(
                "Breach Risk Probability",
                f"{float(ml_result['breach_probability']) * 100:.0f}%",
                tone=risk_tone,
            )
        with metric_cols[2]:
            render_metric_card("Risk Status", risk_label, tone=risk_tone)


def render_ops_control_actions(ops_view: dict) -> None:
    render_section_heading("OPS Control Actions", "Act now — these change live state")
    with st.container(border=True):
        st.markdown('<div class="ops-section-eyebrow">DISPATCH CONTROLS</div>', unsafe_allow_html=True)
        action_col1, action_col2, action_col3 = st.columns(3, gap="medium")

        with action_col1:
            with st.container(border=True):
                st.markdown(
                    '<div class="ops-card-title">Activate Extra Lane</div>'
                    '<div class="ops-card-subtitle">Log a lane activation event for the active BKK deficit window</div>',
                    unsafe_allow_html=True,
                )
                overflow_active = st.session_state.ops_extra_lane_active
                overflow_label = "Extra Lane Active \u2713" if overflow_active else "Activate Extra Lane"
                overflow_type = "secondary" if overflow_active else "primary"
                if st.button(overflow_label, key="btn_overflow_lane", type=overflow_type, use_container_width=True):
                    try:
                        log_dispatch_action("lane_activated", ops_view)
                        st.session_state.ops_extra_lane_active = True
                        st.session_state.ops_flash_message = "Extra lane activation logged to Supabase."
                        st.rerun()
                    except Exception as exc:
                        st.error(f"Could not log extra lane action: {exc}")

        with action_col2:
            with st.container(border=True):
                st.markdown(
                    '<div class="ops-card-title">Driver Broadcast</div>'
                    '<div class="ops-card-subtitle">Log a driver broadcast for the current BKK deficit window</div>',
                    unsafe_allow_html=True,
                )
                last_broadcast = st.session_state.ops_last_broadcast
                broadcast_label = f"Sent {last_broadcast} \u2713" if last_broadcast else "Broadcast to Drivers"
                broadcast_type = "secondary" if last_broadcast else "primary"
                if st.button(broadcast_label, key="btn_broadcast", type=broadcast_type, use_container_width=True):
                    try:
                        stamp = datetime.now().strftime("%H:%M")
                        log_dispatch_action("broadcast", ops_view)
                        st.session_state.ops_last_broadcast = stamp
                        st.session_state.ops_flash_message = f"Driver broadcast logged to Supabase at {stamp}."
                        st.rerun()
                    except Exception as exc:
                        st.error(f"Could not log driver broadcast: {exc}")

        with action_col3:
            with st.container(border=True):
                st.markdown(
                    '<div class="ops-card-title">Latest Advisory</div>'
                    '<div class="ops-card-subtitle">Most recent operator guidance from the mart layer</div>',
                    unsafe_allow_html=True,
                )
                st.caption(
                    f"Deficit window: {ops_view['criticalWindow']['start']} – {ops_view['criticalWindow']['end']}"
                    if ops_view["deficitWindow"]["exists"]
                    else "No current deficit window in the next 3 hours."
                )
                st.write(ops_view["aiAdvice"])


def render_live_monitoring(ops_view: dict) -> None:
    # Stage 1: Critical Alert (only when PWT exceeds guardrail)
    render_critical_alert(ops_view)

    # Stage 2: KPI Summary
    top_left, top_right = st.columns([2.6, 1], gap="large")
    with top_left:
        gauge_col, details_col = st.columns([1, 1.6], gap="large")
        with gauge_col:
            if ops_view["pwt"] > OPS_PWT_ALERT_THRESHOLD:
                st.markdown(
                    """
                    <div style="margin-bottom:0.75rem;padding:0.45rem 0.7rem;border-radius:999px;background:#fee2e2;color:#b91c1c;
                    font-size:0.74rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;animation:ops-blink 1.2s ease-in-out infinite;">
                      PWT above 15 min
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            render_pwt_gauge(
                value=ops_view["pwt"],
                label="PWT",
                status="Critical delay"
                if ops_view["pwt"] > OPS_PWT_ALERT_THRESHOLD
                else "Within guardrail",
            )
        with details_col:
            metric_cols = st.columns(2, gap="medium")
            with metric_cols[0]:
                render_metric_card(
                    "Waiting pax",
                    ops_view["waitingPassengers"],
                    ops_view["waitingTrend"],
                    tone="ops",
                )
            with metric_cols[1]:
                render_metric_card(
                    "Available taxis",
                    ops_view["holdingTaxis"],
                    ops_view["taxiTrend"],
                )
            st.markdown(
                f'<div class="hr-card"><div class="hr-card-row"><div>'
                f'<div class="hr-eyebrow">Lane 1 high-capacity mode</div>'
                f'<div class="hr-copy">System load {ops_view["laneLoad"]}%</div>'
                f'</div></div></div>',
                unsafe_allow_html=True,
            )
            st.progress(ops_view["laneLoad"] / 100)
            tail_cols = st.columns(2, gap="medium")
            with tail_cols[0]:
                render_metric_card("Active lanes", str(ops_view["activeLanes"]))
            with tail_cols[1]:
                render_metric_card("Projected deficit", f"{ops_view['projectedDeficit']}%", tone="danger")

    with top_right:
        render_metric_card(
            "PWT guardrail",
            f"{OPS_PWT_ALERT_THRESHOLD} min",
            f"{ops_view['title']} intervention threshold",
            tone="ops",
        )

    # Stage 3: AI Advisory
    render_ai_advisory_card(ops_view)

    # Stage 4: Deficit Breakdown — WHY
    render_deficit_breakdown(ops_view)

    # Stage 5: Impact Simulation — SO WHAT
    render_impact_simulation(ops_view)

    # Stage 6: ML runtime prediction
    render_ml_prediction_card(ops_view)

    # Stage 7: OPS Control Actions — WHAT TO DO
    render_ops_control_actions(ops_view)

    # Stage 8: Arrival Wave Chart (enhanced with phase labels)
    render_section_heading("Predictive forecast", "Arrival Wave Analysis")
    st.line_chart(
        build_forecast_chart_frame(ops_view["forecast"]),
        color=["#154AA8", "#CBD5E1", "#b91c1c"],
        use_container_width=True,
        height=280,
    )

    # Stage 9: Supporting data tables
    lower_cols = st.columns([1.06, 1.28, 1.06], gap="medium")
    with lower_cols[0]:
        render_ops_detail_section(
            eyebrow="Flight wave",
            title="Arrivals driving demand",
            items=[
                {
                    "title": f"{flight['code']} · {flight['origin']}",
                    "subtitle": f"{flight['status']} · {flight['terminal']} · ETA {flight['eta']}",
                    "value": str(flight["demand"]),
                    "caption": "forecast pax",
                }
                for flight in ops_view["flights"]
            ],
            fallback_items=[
                {
                    "title": "TG401 · Tokyo",
                    "subtitle": "Bags on belt · T1 · ETA 14:35",
                    "value": "84",
                    "caption": "forecast pax",
                }
            ],
        )
    with lower_cols[1]:
        render_ops_detail_section(
            eyebrow="Demand capture",
            title="QR scans in the last 20 minutes",
            items=[
                {
                    "title": signal["zone"],
                    "subtitle": signal["time"],
                    "value": f"{signal['parties']} parties",
                    "caption": f"{signal['luggage']} bags",
                }
                for signal in ops_view["demandSignals"]
            ],
            fallback_items=[
                {
                    "title": "Claim A",
                    "subtitle": "14:12",
                    "value": "4 parties",
                    "caption": "3 bags",
                }
            ],
            row_widths=(3.1, 1.9),
            compact_metric=True,
        )
    with lower_cols[2]:
        render_ops_detail_section(
            eyebrow="Supply telemetry",
            title="Driver response pulse",
            items=[
                {
                    "title": item["name"],
                    "subtitle": item["detail"],
                    "value": str(item["value"]),
                    "caption": "",
                }
                for item in ops_view["supply"]
            ],
            fallback_items=[
                {
                    "title": "Ready drivers",
                    "subtitle": "Holding lane and inbound availability",
                    "value": "128",
                    "caption": "",
                }
            ],
        )

    if st.session_state.get("ops_debug_mode"):
        with st.expander("Debug: effective_now + DB timestamps", expanded=True):
            st.caption(
                "effective_now anchors all time-window queries. "
                "Windows: demand signals ±20 min · dispatch events ±15 min · "
                "flights +60 min · forecast +3 hr. "
                "No credentials or connection details are shown."
            )
            debug_info = ops_view.get("_debug_info") or {}
            st.markdown("**Anchor time**")
            st.markdown(
                f"- **effective_now**: `{debug_info.get('effective_now', 'n/a')}`"
            )
            st.markdown(
                f"- **effective_now_source**: `{debug_info.get('effective_now_source', 'n/a')}`"
            )
            st.markdown("**Row counts this render**")
            count_rows = [
                ("flights (next 60 min)", debug_info.get("flights_count", "?")),
                ("demand signals (last 20 min)", debug_info.get("demand_signals_count", "?")),
                ("dispatch events (last 15 min)", debug_info.get("dispatch_events_count", "?")),
                ("supply snapshot present", debug_info.get("supply_snapshot_present", "?")),
                ("forecast points (next 3 hr)", debug_info.get("forecast_points_count", "?")),
                ("KPI snapshot present", debug_info.get("kpi_present", "?")),
            ]
            for label, value in count_rows:
                st.markdown(f"- **{label}**: `{value}`")
            st.markdown("**Max timestamps per table**")
            for label, value in _fetch_debug_timestamps().items():
                st.markdown(f"- **{label}**: `{value}`")
            debug_errors = st.session_state.get("ops_debug_errors") or []
            if debug_errors:
                st.markdown("**Query errors this run:**")
                for err in debug_errors:
                    st.code(err, language=None)


initialize_state()
apply_global_styles()
apply_ops_typography_styles()
render_sidebar(active="ops")

if st.session_state.ops_terminal not in {"T1", "T2", "ALL"}:
    st.session_state.ops_terminal = "ALL"

db_health = healthcheck()
db_connected = bool(db_health)
db_info = db_health.info
if st.session_state.get("ops_flash_message"):
    st.toast(st.session_state.pop("ops_flash_message"))

if st.session_state.get("ops_debug_mode"):
    st.session_state["ops_debug_errors"] = []

effective_now = get_effective_now() if db_connected else None
ops_view = build_ops_view_from_db(st.session_state.ops_terminal, effective_now) if db_connected else None
_using_mock = ops_view is None
if _using_mock:
    ops_view = get_ops_experience(mock_terminal_key(st.session_state.ops_terminal))
    ops_view["_using_mock"] = True
    ops_view["_using_mart_kpi"] = False
    ops_view["_using_mart_forecast"] = False
    ops_view["_debug_info"] = {
        "effective_now": str(effective_now) if effective_now else "n/a",
        "effective_now_source": effective_now.source if effective_now else "n/a",
        "flights_count": 0,
        "demand_signals_count": 0,
        "dispatch_events_count": 0,
        "supply_snapshot_present": False,
        "forecast_points_count": 0,
        "kpi_present": False,
    }
ops_view = ensure_ops_view_shape(ops_view)

if db_connected and _using_mock:
    eff_str = str(effective_now) if effective_now else "unknown"
    eff_src = effective_now.source if effective_now else "unknown"
    st.warning(
        f"DB connected but no rows in time window "
        f"(effective_now={eff_str}, source={eff_src}). "
        "Showing **MOCK data**. Enable 'Debug DB' in View controls to inspect timestamps."
    )
elif db_connected:
    if not ops_view.get("_using_mart_kpi"):
        st.warning(
            "**mart.ops_kpi_snapshots** is empty — KPI metrics (PWT, waiting pax, taxis) show 0. "
            "Populate this table to see live KPIs."
        )
    if not ops_view.get("_using_mart_forecast"):
        st.warning(
            "**mart.demand_supply_forecasts** is empty — forecast chart is blank. "
            "Populate this table to see the demand vs supply projection."
        )

control_col, intro_col = st.columns([0.9, 4.2], gap="large")

with control_col:
    render_info_card(
        eyebrow=st.session_state.ops_terminal,
        title=ops_view["title"],
        body="Terminal context stays visible here while live filters and workspace controls sit closer to the main dashboard area.",
        tone="neutral",
    )

with intro_col:
    header_main, header_controls = st.columns([2.55, 1.45], gap="medium")
    with header_main:
        if st.session_state.ops_workspace == "AI Advisory":
            render_page_header(
                eyebrow="AI Advisory",
                title="Operations decision support",
                body=f"Ask the assistant about queue pressure, arrival-wave risk, supply sufficiency, and the next actions for {ops_view['title']}. Responses are grounded in the selected terminal context.",
            )
        else:
            render_page_header(
                eyebrow="Hello Ride Console",
                title="Suvarnabhumi Airport control tower",
                body=f"Recreated from the original ops dashboard with the same monitoring hierarchy: queue health first, then intervention controls, arrival wave analysis, and supply telemetry. Current view: {ops_view['title']}.",
            )
    with header_controls:
        with st.container(border=True):
            st.markdown('<div class="ops-control-shell">', unsafe_allow_html=True)
            st.caption("View controls")
            st.segmented_control(
                "Terminal view",
                options=["T1", "T2", "ALL"],
                key="ops_terminal",
                selection_mode="single",
            )
            st.radio(
                "Workspace",
                options=["Live Monitoring", "AI Advisory"],
                key="ops_workspace",
                label_visibility="collapsed",
            )
            db_status_badge(db_connected, db_info)
            ctrl_refresh, ctrl_debug = st.columns(2, gap="small")
            with ctrl_refresh:
                if st.button("↻ Refresh", key="btn_refresh_live", use_container_width=True):
                    get_cached_ops_context.clear()
                    st.session_state.pop("ops_debug_errors", None)
                    st.rerun()
            with ctrl_debug:
                st.toggle("Debug DB", key="ops_debug_mode", value=False)
            st.markdown(
                '<div class="ops-control-note">Switch terminal context or move into AI Advisory without leaving the OPS surface.</div>',
                unsafe_allow_html=True,
            )
            st.markdown("</div>", unsafe_allow_html=True)

if st.session_state.ops_workspace == "AI Advisory":
    render_ai_advisory(ops_view, db_connected=db_connected)
else:
    render_live_monitoring(ops_view)
