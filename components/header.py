from html import escape

import streamlit as st


def render_hero(
    badge: str,
    title: str,
    body: str,
    aside_title: str,
    aside_body: str,
) -> None:
    left, right = st.columns([2.3, 1], gap="large")
    with left:
        st.markdown(
            f"""
            <div class="hr-hero">
              <div class="hr-badge">{escape(badge)}</div>
              <h1 class="hr-hero-title">{escape(title)}</h1>
              <p class="hr-copy hr-hero-copy">{escape(body)}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with right:
        st.markdown(
            f"""
            <div class="hr-card hr-card-passenger-soft">
              <div class="hr-eyebrow">{escape(aside_title)}</div>
              <div class="hr-card-title">Hello Ride</div>
              <div class="hr-copy">{escape(aside_body)}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def render_page_header(eyebrow: str, title: str, body: str) -> None:
    st.markdown(
        f"""
        <div class="hr-page-header">
          <div class="hr-eyebrow">{escape(eyebrow)}</div>
          <h2 class="hr-page-title">{escape(title)}</h2>
          <p class="hr-copy">{escape(body)}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_section_heading(eyebrow: str, title: str) -> None:
    st.markdown(
        f"""
        <div class="hr-section">
          <div class="hr-eyebrow">{escape(eyebrow)}</div>
          <div class="hr-section-title">{escape(title)}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_mobile_header(title: str, left_label: str = "", right_label: str = "") -> None:
    st.markdown(
        f"""
        <div class="hr-mobile-header">
          <div class="hr-mobile-side">{escape(left_label)}</div>
          <div class="hr-mobile-title">{escape(title)}</div>
          <div class="hr-mobile-side hr-mobile-side-right">{escape(right_label)}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
