from __future__ import annotations

import logging
import os
import re
import ssl
from datetime import datetime
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request
import json

import certifi
import streamlit as st

from utils.db import fetch_all, fetch_one, get_effective_now, healthcheck

try:
    from google import genai
    from google.genai import types as genai_types
except Exception:  # pragma: no cover - import fallback for environments without the SDK
    genai = None
    genai_types = None

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"
AI_MODE_AUTO = "auto"
AI_MODE_GEMINI = "gemini"
AI_MODE_MOCK = "mock"

# Belt-and-suspenders: set certifi CA bundle for libraries that respect env vars
_CA_BUNDLE = certifi.where()
os.environ.setdefault("SSL_CERT_FILE", _CA_BUNDLE)
os.environ.setdefault("REQUESTS_CA_BUNDLE", _CA_BUNDLE)


def _get_secret(name: str, default: str | None = None) -> str | None:
    try:
        return str(st.secrets[name])
    except Exception:
        return default


def _get_ai_mode() -> str:
    mode = (_get_secret("AI_MODE") or AI_MODE_AUTO).strip().lower()
    return mode if mode in {AI_MODE_AUTO, AI_MODE_GEMINI, AI_MODE_MOCK} else AI_MODE_AUTO


def _set_ai_status(mode: str, error_msg: str | None = None) -> None:
    """Store AI mode and optional error in session state for badge display."""
    try:
        st.session_state["ops_ai_last_mode"] = mode
        st.session_state["ops_ai_last_error"] = error_msg or ""
    except Exception:
        pass


def _short_error(exc: Exception) -> str:
    """Return a clean 1-line error message, stripping raw SSL stack details."""
    msg = str(exc)
    if "CERTIFICATE_VERIFY_FAILED" in msg or ("ssl" in msg.lower() and "cert" in msg.lower()):
        return "SSL certificate verification failed"
    if "401" in msg or "403" in msg or "API_KEY_INVALID" in msg.upper():
        return "Authentication error (check API key)"
    if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower():
        return "API quota exhausted (free tier limit reached)"
    if "timeout" in msg.lower() or "timed out" in msg.lower():
        return "Request timed out"
    return msg[:120] if len(msg) > 120 else msg


def _make_ssl_context() -> ssl.SSLContext:
    return ssl.create_default_context(cafile=certifi.where())


def _normalized_terminal(terminal: str | None) -> str:
    if not terminal:
        return "ALL"
    value = str(terminal).strip().upper()
    return value if value in {"T1", "T2", "ALL"} else "ALL"


def _fetch_all_safe(sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    try:
        return fetch_all(sql, params)
    except Exception:
        return []


def _fetch_one_safe(sql: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
    try:
        return fetch_one(sql, params)
    except Exception:
        return None


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _format_clock(value: Any) -> str:
    if isinstance(value, datetime):
        return value.strftime("%H:%M")
    if value is None:
        return "-"
    return str(value)


def _compute_forecast_summary(forecast_rows: list[dict[str, Any]]) -> dict[str, Any]:
    normalized_rows: list[dict[str, Any]] = []
    for row in forecast_rows:
        demand = _to_int(row.get("demand_pax"))
        supply = _to_int(row.get("supply_taxis"))
        deficit_gap = max(demand - supply, 0)
        normalized_rows.append(
            {
                "ts_local": row.get("ts_local"),
                "time": _format_clock(row.get("ts_local")),
                "demand_pax": demand,
                "supply_taxis": supply,
                "deficit_gap": deficit_gap,
            }
        )

    deficit_points = [row for row in normalized_rows if row["deficit_gap"] > 0]
    peak_gap = max((row["deficit_gap"] for row in deficit_points), default=0)
    peak_point = max(deficit_points, key=lambda row: row["deficit_gap"], default=None)

    return {
        "timeseries": normalized_rows,
        "deficit_exists": bool(deficit_points),
        "deficit_window_start_local": deficit_points[0]["ts_local"] if deficit_points else None,
        "deficit_window_end_local": deficit_points[-1]["ts_local"] if deficit_points else None,
        "deficit_window_start": deficit_points[0]["time"] if deficit_points else "-",
        "deficit_window_end": deficit_points[-1]["time"] if deficit_points else "-",
        "peak_deficit_gap": peak_gap,
        "peak_deficit_time": peak_point["time"] if peak_point else "-",
    }


def build_ops_context(airport_code: str, terminal: str) -> dict[str, Any]:
    airport = (airport_code or "BKK").strip().upper()
    terminal_value = _normalized_terminal(terminal)
    connected = healthcheck()
    missing_data: list[str] = []

    if not connected:
        missing_data.append("Database connection unavailable")

    # Anchor all time-window queries to effective_now so historical CSV data is
    # always within the query windows without needing timestamp adjustments.
    effective_now_obj = get_effective_now() if connected else None
    eff_ts = effective_now_obj.ts if effective_now_obj else None

    latest_kpi = _fetch_one_safe(
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
        where airport_code = %(airport_code)s
          and (%(effective_now)s is null or captured_at_local <= %(effective_now)s)
        order by captured_at_local desc
        limit 1
        """,
        {"airport_code": airport, "effective_now": eff_ts},
    )
    if not latest_kpi:
        missing_data.append("No mart.ops_kpi_snapshots row found")

    latest_supply = _fetch_one_safe(
        """
        select
            airport_code,
            captured_at_local,
            taxis_in_holding,
            taxis_at_curb,
            active_lanes_json,
            lane_capacity_per_15m
        from rawdata.taxi_supply_snapshots
        where airport_code = %(airport_code)s
          and (%(effective_now)s is null or captured_at_local <= %(effective_now)s)
        order by captured_at_local desc
        limit 1
        """,
        {"airport_code": airport, "effective_now": eff_ts},
    )
    if not latest_supply:
        missing_data.append("No rawdata.taxi_supply_snapshots row found")

    flights_next_60m = _fetch_all_safe(
        """
        select
            flight_instance_id,
            flight_no,
            origin,
            terminal,
            gate,
            est_arrival_local,
            status
        from rawdata.flight_instances
        where airport_code = %(airport_code)s
          and est_arrival_local between
                coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp)
            and coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp) + interval '60 minutes'
          and (%(terminal)s = 'ALL' or terminal = %(terminal)s)
        order by est_arrival_local
        """,
        {"airport_code": airport, "terminal": terminal_value, "effective_now": eff_ts},
    )
    if not flights_next_60m:
        missing_data.append("No rawdata.flight_instances found in the next 60 minutes")

    demand_signal_rollup = _fetch_one_safe(
        """
        select
            count(*) as signal_count,
            coalesce(sum(pds.pax_count), 0) as pax_count_sum,
            coalesce(sum(pds.luggage_count), 0) as luggage_count_sum
        from rawdata.passenger_demand_signals pds
        left join rawdata.flight_instances fi
            on fi.flight_instance_id = pds.flight_instance_id
        where pds.airport_code = %(airport_code)s
          and pds.created_at_local >= coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp) - interval '20 minutes'
          and pds.created_at_local <= coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp)
          and (%(terminal)s = 'ALL' or fi.terminal = %(terminal)s)
        """,
        {"airport_code": airport, "terminal": terminal_value, "effective_now": eff_ts},
    ) or {
        "signal_count": 0,
        "pax_count_sum": 0,
        "luggage_count_sum": 0,
    }
    if _to_int(demand_signal_rollup.get("signal_count")) == 0:
        missing_data.append("No rawdata.passenger_demand_signals found in the last 20 minutes")

    forecast_rows = _fetch_all_safe(
        """
        select
            generated_at_local,
            horizon_min,
            ts_local,
            demand_pax,
            supply_taxis
        from mart.demand_supply_forecasts
        where airport_code = %(airport_code)s
          and ts_local between
                coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp)
            and coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp) + interval '3 hours'
        order by ts_local
        """,
        {"airport_code": airport, "effective_now": eff_ts},
    )
    if not forecast_rows:
        missing_data.append("No mart.demand_supply_forecasts rows found in the next 3 hours")
    forecast_summary = _compute_forecast_summary(forecast_rows)

    recent_actions = _fetch_all_safe(
        """
        select
            id,
            created_at_local,
            updated_at_local,
            driver_id,
            signal_id,
            flight_instance_id,
            lane,
            status
        from rawdata.driver_dispatch_events
        where airport_code = %(airport_code)s
          and created_at_local >= coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp) - interval '30 minutes'
          and created_at_local <= coalesce(%(effective_now)s, timezone('Asia/Bangkok', now())::timestamp)
        order by created_at_local desc
        """,
        {"airport_code": airport, "effective_now": eff_ts},
    )
    if not recent_actions:
        missing_data.append("No rawdata.driver_dispatch_events found in the last 30 minutes")

    context = {
        "airport_code": airport,
        "terminal": terminal_value,
        "db_connected": connected,
        "missing_data": missing_data,
        "latest_kpi": {
            "captured_at_local": latest_kpi.get("captured_at_local") if latest_kpi else None,
            "pwt_min": _to_float((latest_kpi or {}).get("pwt_min")),
            "waiting_pax": _to_int((latest_kpi or {}).get("waiting_pax")),
            "available_taxis": _to_int((latest_kpi or {}).get("available_taxis")),
            "active_lanes": _to_int((latest_kpi or {}).get("active_lanes")),
            "notes": (latest_kpi or {}).get("notes"),
        },
        "latest_supply_snapshot": {
            "captured_at_local": (latest_supply or {}).get("captured_at_local"),
            "taxis_in_holding": _to_int((latest_supply or {}).get("taxis_in_holding")),
            "taxis_at_curb": _to_int((latest_supply or {}).get("taxis_at_curb")),
            "active_lanes_json": (latest_supply or {}).get("active_lanes_json"),
            "lane_capacity_per_15m": _to_int((latest_supply or {}).get("lane_capacity_per_15m")),
        },
        "flights_next_60m": [
            {
                "flight_instance_id": row.get("flight_instance_id"),
                "flight_no": row.get("flight_no"),
                "origin": row.get("origin"),
                "terminal": row.get("terminal"),
                "gate": row.get("gate"),
                "est_arrival_local": row.get("est_arrival_local"),
                "eta": _format_clock(row.get("est_arrival_local")),
                "status": row.get("status"),
            }
            for row in flights_next_60m
        ],
        "demand_signals_last_20m": {
            "signal_count": _to_int(demand_signal_rollup.get("signal_count")),
            "pax_count_sum": _to_int(demand_signal_rollup.get("pax_count_sum")),
            "luggage_count_sum": _to_int(demand_signal_rollup.get("luggage_count_sum")),
        },
        "forecast_next_3h": forecast_summary,
        "recent_driver_dispatch_events": [
            {
                "id": _to_int(row.get("id")),
                "created_at_local": row.get("created_at_local"),
                "updated_at_local": row.get("updated_at_local"),
                "driver_id": row.get("driver_id"),
                "signal_id": row.get("signal_id"),
                "flight_instance_id": row.get("flight_instance_id"),
                "lane": row.get("lane"),
                "status": row.get("status"),
            }
            for row in recent_actions
        ],
    }
    return context


def _system_prompt() -> str:
    return (
        "You are an airport operations AI advisor for the Hello Ride platform. "
        "Answer concisely, action-first, and ground every conclusion in the provided database context. "
        "Cite concrete numbers from the context whenever possible. "
        "If data is missing, say so clearly and avoid pretending you know more than the context shows. "
        "Return valid JSON only with exactly these keys: "
        '{"summary":"...",'
        '"root_causes":["..."],'
        '"recommended_actions":["..."],'
        '"next_15_min_plan":["..."],'
        '"assumptions":["..."]}'
    )


def _user_prompt(question: str, context: dict[str, Any]) -> str:
    return (
        f"Question: {question}\n\n"
        f"Context JSON:\n{json.dumps(context, default=str, ensure_ascii=True, indent=2)}\n\n"
        "Respond with valid JSON only."
    )


def _extract_json_text(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    if text.startswith("{") and text.endswith("}"):
        return text

    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    return match.group(0) if match else text


def _normalize_answer(answer: dict[str, Any]) -> dict[str, Any]:
    return {
        "summary": str(answer.get("summary") or "").strip(),
        "root_causes": [str(item) for item in (answer.get("root_causes") or [])],
        "recommended_actions": [str(item) for item in (answer.get("recommended_actions") or [])],
        "next_15_min_plan": [str(item) for item in (answer.get("next_15_min_plan") or [])],
        "assumptions": [str(item) for item in (answer.get("assumptions") or [])],
    }


def _fallback_answer(question: str, context: dict[str, Any], extra_assumption: str | None = None) -> dict[str, Any]:
    kpi = context.get("latest_kpi", {})
    forecast = context.get("forecast_next_3h", {})
    demand = context.get("demand_signals_last_20m", {})
    supply = context.get("latest_supply_snapshot", {})
    missing = list(context.get("missing_data", []))
    if extra_assumption:
        missing.append(extra_assumption)

    summary_bits = []
    if context.get("db_connected"):
        summary_bits.append(
            f"BKK {context.get('terminal')} view: PWT is {kpi.get('pwt_min', 0)} min, "
            f"waiting pax {kpi.get('waiting_pax', 0)}, available taxis {kpi.get('available_taxis', 0)}."
        )
    else:
        summary_bits.append("Database context is unavailable, so this answer uses only safe, limited phrasing.")

    if forecast.get("deficit_exists"):
        summary_bits.append(
            f"Forecast shows a supply deficit peaking at {forecast.get('peak_deficit_gap', 0)} around "
            f"{forecast.get('peak_deficit_time', '-')}, with the deficit window running "
            f"{forecast.get('deficit_window_start', '-')} to {forecast.get('deficit_window_end', '-')}."
        )
    else:
        summary_bits.append("Current forecast does not show a clear deficit window in the next 3 hours.")

    root_causes = []
    if _to_int(demand.get("signal_count")) > 0:
        root_causes.append(
            f"Passenger demand signals increased in the last 20 minutes: {demand.get('signal_count', 0)} signals, "
            f"{demand.get('pax_count_sum', 0)} passengers, {demand.get('luggage_count_sum', 0)} bags."
        )
    if _to_int(supply.get("lane_capacity_per_15m")) > 0:
        root_causes.append(
            f"Lane capacity is {supply.get('lane_capacity_per_15m', 0)} taxis per 15 minutes, "
            f"with {supply.get('taxis_in_holding', 0)} in holding and {supply.get('taxis_at_curb', 0)} at curb."
        )
    if not root_causes:
        root_causes.append("Root-cause detail is limited because live database context is missing or incomplete.")

    recommended_actions = []
    if forecast.get("deficit_exists"):
        recommended_actions.append("Stage extra supply before the forecast deficit window begins.")
        recommended_actions.append("Broadcast nearby drivers toward the likely peak-demand terminal.")
    else:
        recommended_actions.append("Continue monitoring live demand and supply changes every few minutes.")
    recommended_actions.append("Confirm lane configuration and curb capacity before the next arrival wave.")

    next_15_min_plan = [
        "Review the latest KPI snapshot and confirm whether PWT is still rising.",
        "Check new passenger demand signals and match them against flights arriving in the next hour.",
        "Log any operator action clearly so the next advisory can reference it.",
    ]

    assumptions = missing or ["Using only the database context returned by the helper."]

    return _normalize_answer(
        {
            "summary": " ".join(summary_bits).strip() or f"Limited advisory response for: {question}",
            "root_causes": root_causes,
            "recommended_actions": recommended_actions,
            "next_15_min_plan": next_15_min_plan,
            "assumptions": assumptions,
        }
    )


def _make_genai_client(api_key: str) -> Any:
    """Create a genai.Client, passing certifi CA bundle via http_options when the SDK supports it."""
    if genai is None:
        raise RuntimeError("google-genai SDK is not available")
    try:
        # google-genai >= 0.5 accepts http_options with client_args forwarded to httpx.Client
        client = genai.Client(
            api_key=api_key,
            http_options={"client_args": {"verify": certifi.where()}},
        )
        return client
    except Exception:
        pass
    return genai.Client(api_key=api_key)


def _sdk_generate(prompt: str, model: str) -> str:
    if genai is None or genai_types is None:
        raise RuntimeError("google-genai SDK is not available")

    api_key = _get_secret("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY in st.secrets")

    client = _make_genai_client(api_key)
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )
    text = getattr(response, "text", None)
    if text:
        return text
    return json.dumps(response.to_json_dict()) if hasattr(response, "to_json_dict") else str(response)


def _http_generate(prompt: str, model: str) -> str:
    api_key = _get_secret("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY in st.secrets")

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    req = urllib_request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    ssl_ctx = _make_ssl_context()
    with urllib_request.urlopen(req, timeout=30, context=ssl_ctx) as response:
        body = json.loads(response.read().decode("utf-8"))

    try:
        return body["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected Gemini HTTP response: {body}") from exc


def ping_gemini() -> tuple[bool, str]:
    """Test Gemini connectivity. Returns (success, message). Safe to call from the page."""
    api_key = _get_secret("GEMINI_API_KEY")
    if not api_key:
        return False, "GEMINI_API_KEY not configured in secrets"
    model = _get_secret("GEMINI_MODEL", DEFAULT_GEMINI_MODEL) or DEFAULT_GEMINI_MODEL
    sdk_error: str | None = None
    try:
        result = _sdk_generate("ping", model)
        return True, f"Gemini (SDK) OK: {str(result)[:80]}"
    except Exception as exc:
        sdk_error = _short_error(exc)
    try:
        result = _http_generate("ping", model)
        return True, f"Gemini (HTTP) OK: {str(result)[:80]}"
    except Exception as exc:
        http_error = _short_error(exc)
        return False, f"SDK: {sdk_error} | HTTP: {http_error}"


def generate_ops_answer(question: str, airport_code: str, terminal: str) -> dict[str, Any]:
    context = build_ops_context(airport_code=airport_code, terminal=terminal)
    model = _get_secret("GEMINI_MODEL", DEFAULT_GEMINI_MODEL) or DEFAULT_GEMINI_MODEL
    ai_mode = _get_ai_mode()

    prompt = f"{_system_prompt()}\n\n{_user_prompt(question, context)}"

    # Skip Gemini if forced to mock or no API key
    if ai_mode == AI_MODE_MOCK:
        _set_ai_status(AI_MODE_MOCK)
        return _fallback_answer(question, context, "AI_MODE=mock — Gemini skipped")

    if not _get_secret("GEMINI_API_KEY"):
        _set_ai_status(AI_MODE_MOCK)
        return _fallback_answer(question, context, "GEMINI_API_KEY is not configured")

    raw_text = ""
    sdk_error: str | None = None

    # Primary path: google-genai SDK (includes certifi SSL fix)
    try:
        raw_text = _sdk_generate(prompt, model)
    except Exception as exc:
        sdk_error = _short_error(exc)
        logger.warning("Gemini SDK failed: %s", sdk_error)

        # Secondary path: direct HTTPS with certifi SSL context
        try:
            raw_text = _http_generate(prompt, model)
        except Exception as http_exc:
            http_error = _short_error(http_exc)
            logger.warning("Gemini HTTP failed: %s", http_error)
            combined = f"SDK: {sdk_error} | HTTP: {http_error}"
            _set_ai_status(AI_MODE_MOCK, combined)
            return _fallback_answer(question, context, "Gemini unavailable — using mock advisory")

    # Parse the structured JSON response
    try:
        parsed = json.loads(_extract_json_text(raw_text))
        if isinstance(parsed, dict):
            _set_ai_status(AI_MODE_GEMINI)
            return _normalize_answer(parsed)
    except Exception:
        pass

    _set_ai_status(AI_MODE_GEMINI)
    return _normalize_answer(
        {
            "summary": raw_text.strip() or _fallback_answer(question, context)["summary"],
            "root_causes": [],
            "recommended_actions": [],
            "next_15_min_plan": [],
            "assumptions": list(context.get("missing_data", [])) or ["Model response was not valid JSON."],
        }
    )
