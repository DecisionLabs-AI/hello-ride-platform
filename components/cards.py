from html import escape

import streamlit as st


def render_info_card(eyebrow: str, title: str, body: str, tone: str = "neutral") -> None:
    st.markdown(
        f"""
        <div class="hr-card hr-card-{tone}">
          <div class="hr-eyebrow">{escape(str(eyebrow))}</div>
          <div class="hr-card-title">{escape(str(title))}</div>
          <div class="hr-copy">{escape(str(body))}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_metric_card(label: str, value: str | int | float, delta: str = "", tone: str = "neutral") -> None:
    delta_html = f'<div class="hr-metric-delta">{escape(str(delta))}</div>' if delta else ""
    st.markdown(
        f"""
        <div class="hr-card hr-metric hr-card-{tone}">
          <div class="hr-eyebrow">{escape(str(label))}</div>
          <div class="hr-card-row">
            <div class="hr-metric-value">{escape(str(value))}</div>
            {delta_html}
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_alert_card(title: str, body: str, advisory: str) -> None:
    st.markdown(
        f"""
        <div class="hr-card hr-card-danger">
          <div class="hr-card-title">{escape(title)}</div>
          <div class="hr-copy">{escape(body)}</div>
          <div class="hr-advisory">
            <div class="hr-eyebrow">AI Advisory</div>
            <div class="hr-advisory-copy">{escape(advisory)}</div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_reference_list(title: str, body: str, items: list[str]) -> None:
    list_items = "".join(f"<li>{escape(item)}</li>" for item in items)
    st.markdown(
        f"""
        <div class="hr-card hr-reference-block">
          <div class="hr-card-title">{escape(title)}</div>
          <div class="hr-copy">{escape(body)}</div>
          <ul class="hr-reference-list">{list_items}</ul>
        </div>
        """,
        unsafe_allow_html=True,
    )
