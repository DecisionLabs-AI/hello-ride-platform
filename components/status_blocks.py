from html import escape
import time

import streamlit as st


def render_route_timeline(
    pickup: str,
    destination: str,
    pickup_sublabel: str = "",
    destination_sublabel: str = "",
) -> None:
    pickup_sub = f'<div class="hr-copy">{escape(pickup_sublabel)}</div>' if pickup_sublabel else ""
    destination_sub = (
        f'<div class="hr-copy">{escape(destination_sublabel)}</div>' if destination_sublabel else ""
    )
    st.markdown(
        f"""
        <div class="hr-card hr-card-neutral">
          <div class="hr-route-row">
            <div class="hr-route-marker">
              <span class="hr-route-dot"></span>
              <span class="hr-route-line"></span>
            </div>
            <div class="hr-route-copy">
              <div class="hr-eyebrow">Pickup</div>
              <div class="hr-card-title">{escape(pickup)}</div>
              {pickup_sub}
            </div>
          </div>
          <div class="hr-route-row">
            <div class="hr-route-marker hr-route-marker-end">
              <span class="hr-route-square"></span>
            </div>
            <div class="hr-route-copy">
              <div class="hr-eyebrow">Destination</div>
              <div class="hr-card-title">{escape(destination)}</div>
              {destination_sub}
            </div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_labeled_list(eyebrow: str, title: str, items: list[dict]) -> None:
    rows = []
    for item in items:
        caption = f'<div class="hr-list-pill">{escape(item["caption"])}</div>' if item["caption"] else ""
        rows.append(
            f"""
            <div class="hr-list-row">
              <div class="hr-list-main">
                <div class="hr-list-title">{escape(item['title'])}</div>
                <div class="hr-copy hr-list-subtitle">{escape(item['subtitle'])}</div>
              </div>
              <div class="hr-list-side">
                {caption}
                <div class="hr-list-number">{escape(item['value'])}</div>
              </div>
            </div>
            """
        )

    st.markdown(
        f"""
        <div class="hr-card hr-card-neutral hr-list-section">
          <div class="hr-list-header">
            <div>
              <div class="hr-eyebrow">{escape(eyebrow)}</div>
              <div class="hr-card-title">{escape(title)}</div>
            </div>
            <div class="hr-list-count">{len(items)} items</div>
          </div>
          <div class="hr-stacked-list">
            {''.join(rows)}
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_pwt_gauge(value: int, label: str, status: str) -> None:
    st.markdown(
        f"""
        <div class="hr-gauge-wrap">
          <div class="hr-gauge">
            <div class="hr-gauge-value">{value}</div>
            <div class="hr-eyebrow">{escape(label)}</div>
          </div>
          <div class="hr-gauge-status">{escape(status)}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_status_strip(items: list[tuple[str, bool]]) -> None:
    blocks = "".join(
        f"""
        <div class="hr-status-step">
          <div class="hr-status-bullet {'is-done' if done else ''}">{'OK' if done else '...'}</div>
          <div class="hr-status-label">{label}</div>
        </div>
        """
        for label, done in items
    )
    st.markdown(f'<div class="hr-status-strip">{blocks}</div>', unsafe_allow_html=True)


def render_timer_ring(total_seconds: int, started_at: float | None) -> int:
    if started_at is None:
        started_at = time.time()
        st.session_state.driver_job_started_at = started_at
    remaining = max(0, total_seconds - int(time.time() - started_at))
    progress = int((remaining / total_seconds) * 360) if total_seconds else 0
    st.markdown(
        f"""
        <div class="hr-timer-shell">
          <div class="hr-timer-ring" style="background: conic-gradient(#0c7d35 {progress}deg, #e5e7eb 0deg);">
            <div class="hr-timer-core">
              <div class="hr-timer-value">{remaining}</div>
              <div class="hr-eyebrow">Secs</div>
            </div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    return remaining
