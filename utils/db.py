from __future__ import annotations

from dataclasses import dataclass
import hashlib
import socket
from typing import Any, Mapping, Sequence
from urllib.parse import parse_qsl, urlencode, urlparse

import psycopg2
from psycopg2.extras import RealDictCursor
import streamlit as st

QueryParams = Sequence[Any] | Mapping[str, Any] | None


@dataclass(frozen=True)
class HealthcheckResult:
    ok: bool
    info: dict[str, Any]

    def __bool__(self) -> bool:
        return self.ok


@dataclass(frozen=True)
class EffectiveNow:
    """Anchor timestamp for OPS time-window queries.

    Picked from the latest available rawdata row so historical CSV uploads
    still fall inside all query windows. Falls back to DB Bangkok time.
    """
    ts: Any  # datetime.datetime from psycopg2, or None as last resort
    source: str  # supply_snapshot | demand_signal | flight_instance | db_now

    def __str__(self) -> str:
        return str(self.ts)[:19] if self.ts is not None else "unknown"


def _get_secret(name: str) -> str:
    try:
        return str(st.secrets[name])
    except KeyError as exc:
        raise KeyError(
            f"Missing Streamlit secret '{name}'. Set it in .streamlit/secrets.toml "
            "or in your Streamlit Cloud app secrets."
        ) from exc


def _get_optional_secret(name: str) -> str | None:
    try:
        value = st.secrets[name]
    except KeyError:
        return None

    rendered = str(value).strip()
    return rendered or None


def _resolve_host(host: str) -> str:
    if not host:
        return ""
    try:
        matches = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return host
    return str(matches[0][4][0]) if matches else host


def _short_error(exc: Exception, limit: int = 220) -> str:
    message = " ".join(str(exc).split())
    if len(message) <= limit:
        return message
    return f"{message[: limit - 3]}..."


def _normalize_database_url(database_url: str) -> tuple[str, dict[str, Any]]:
    parsed = urlparse(database_url)
    if not parsed.scheme or not parsed.hostname:
        raise ValueError(
            "Invalid DATABASE_URL. Copy the full Postgres connection string from "
            "Supabase Database -> Connect."
        )

    query_params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query_params["sslmode"] = "require"
    normalized_url = parsed._replace(query=urlencode(query_params)).geturl()
    dbname = parsed.path.lstrip("/") or "postgres"
    port = parsed.port or 5432
    host = parsed.hostname or ""
    user = parsed.username or ""

    info = {
        "source": "DATABASE_URL",
        "host": host,
        "resolved_host": _resolve_host(host),
        "port": port,
        "dbname": dbname,
        "user": user,
    }
    return normalized_url, info


def _load_connection_settings() -> dict[str, Any]:
    database_url = _get_optional_secret("DATABASE_URL")
    if database_url:
        normalized_url, info = _normalize_database_url(database_url)
        return {
            "cache_key": hashlib.sha256(normalized_url.encode("utf-8")).hexdigest(),
            "dsn": normalized_url,
            "host": None,
            "port": info["port"],
            "dbname": info["dbname"],
            "user": info["user"],
            "password": None,
            "info": info,
        }

    host = _get_secret("DB_HOST")
    port = int(_get_secret("DB_PORT"))
    dbname = _get_secret("DB_NAME")
    user = _get_secret("DB_USER")
    password = _get_secret("DB_PASSWORD")
    signature = f"{host}:{port}:{dbname}:{user}"

    return {
        "cache_key": hashlib.sha256(signature.encode("utf-8")).hexdigest(),
        "dsn": None,
        "host": host,
        "port": port,
        "dbname": dbname,
        "user": user,
        "password": password,
        "info": {
            "source": "DB_*",
            "host": host,
            "resolved_host": _resolve_host(host),
            "port": port,
            "dbname": dbname,
            "user": user,
        },
    }


@st.cache_resource
def _create_cached_connection(
    cache_key: str,
    dsn: str | None,
    host: str | None,
    port: int,
    dbname: str,
    user: str,
    password: str | None,
):
    connect_kwargs: dict[str, Any] = {
        "cursor_factory": RealDictCursor,
        "sslmode": "require",
    }
    if dsn:
        connect_kwargs["dsn"] = dsn
    else:
        connect_kwargs.update(
            {
                "host": host,
                "port": port,
                "dbname": dbname,
                "user": user,
                "password": password,
            }
        )
    return psycopg2.connect(**connect_kwargs)


def reset_connection() -> None:
    _create_cached_connection.clear()


def get_conn():
    """Create and cache a Postgres connection for the current Streamlit process."""
    settings = _load_connection_settings()
    conn = _create_cached_connection(
        settings["cache_key"],
        settings["dsn"],
        settings["host"],
        settings["port"],
        settings["dbname"],
        settings["user"],
        settings["password"],
    )
    if conn.closed:
        reset_connection()
        conn = _create_cached_connection(
            settings["cache_key"],
            settings["dsn"],
            settings["host"],
            settings["port"],
            settings["dbname"],
            settings["user"],
            settings["password"],
        )
    return conn


def fetch_all(sql: str, params: QueryParams = None) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
    except Exception:
        conn.rollback()
        raise

    return [dict(row) for row in rows]


def fetch_one(sql: str, params: QueryParams = None) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            row = cursor.fetchone()
    except Exception:
        conn.rollback()
        raise

    return dict(row) if row is not None else None


def execute(sql: str, params: QueryParams = None) -> None:
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def healthcheck() -> HealthcheckResult:
    try:
        settings = _load_connection_settings()
    except Exception as exc:
        return HealthcheckResult(
            False,
            {"source": "unknown", "error": _short_error(exc)},
        )

    info = settings["info"]
    safe_info: dict[str, Any] = {"source": info.get("source", "unknown")}
    try:
        row = fetch_one("SELECT 1 AS ok")
    except Exception as exc:
        safe_info["error"] = _short_error(exc)
        return HealthcheckResult(False, safe_info)

    return HealthcheckResult(bool(row and row.get("ok") == 1), safe_info)


def get_effective_now() -> EffectiveNow:
    """Return the anchor timestamp for OPS time-window queries.

    Priority order (picks the highest available max timestamp):
      1. max(rawdata.taxi_supply_snapshots.captured_at_local)
      2. max(rawdata.passenger_demand_signals.created_at_local)
      3. max(rawdata.flight_instances.est_arrival_local)
      4. DB current Bangkok time (always succeeds as final fallback)

    This allows historical CSV data uploaded to Supabase to be within
    every query window without needing to update timestamps in the CSV.
    """
    candidates: list[tuple[str, str]] = [
        (
            "supply_snapshot",
            "SELECT max(captured_at_local) AS ts FROM rawdata.taxi_supply_snapshots WHERE airport_code = 'BKK'",
        ),
        (
            "demand_signal",
            "SELECT max(created_at_local) AS ts FROM rawdata.passenger_demand_signals WHERE airport_code = 'BKK'",
        ),
        (
            "flight_instance",
            "SELECT max(est_arrival_local) AS ts FROM rawdata.flight_instances WHERE airport_code = 'BKK'",
        ),
    ]
    for source, sql in candidates:
        try:
            row = fetch_one(sql)
            if row and row.get("ts") is not None:
                return EffectiveNow(ts=row["ts"], source=source)
        except Exception:
            continue

    try:
        row = fetch_one("SELECT timezone('Asia/Bangkok', now())::timestamp AS ts")
        if row and row.get("ts") is not None:
            return EffectiveNow(ts=row["ts"], source="db_now")
    except Exception:
        pass

    return EffectiveNow(ts=None, source="db_now")
