from html import escape

import streamlit as st

from components.navigation import render_sidebar
from utils.state import initialize_state
from utils.styles import apply_global_styles


st.set_page_config(
    page_title="Hello Ride",
    page_icon="H",
    layout="wide",
    initial_sidebar_state="expanded",
)


# Migration note: the original React/Vite prototype (frontend/) was retired after full Streamlit migration.
# This app.py is now the sole entry point. Run with: streamlit run app.py

HOW_IT_WORKS = [
    {
        "number": "1",
        "title": "Scan at baggage claim",
        "body": "Passenger scans QR code. System captures party size, luggage, and destination — giving ops a 10–15 min head start before curb arrival.",
    },
    {
        "number": "2",
        "title": "Predict arrival waves",
        "body": "Flight data and QR signals feed the forecast engine. Deficit windows and PWT spikes are identified before they occur.",
    },
    {
        "number": "3",
        "title": "Act before congestion",
        "body": "OPS opens lanes and broadcasts to drivers. Supply is in position when the wave arrives — not after the queue forms.",
    },
]

NAVIGATION_CARDS = [
    {
        "path": "pages/3_passenger_flow.py",
        "button_label": "Open Passenger Portal",
        "eyebrow": "Module 1 · Passenger",
        "title": "Signal demand from baggage claim",
        "description": "Passengers scan a QR code at baggage claim. The system captures party size, luggage, and destination — giving ops a 10–15 min head start before the pickup rush begins.",
        "tone": "passenger",
    },
    {
        "path": "pages/2_driver_flow.py",
        "button_label": "Open Driver App",
        "eyebrow": "Module 2 · Driver",
        "title": "Receive dispatch signals before demand peaks",
        "description": "Drivers get proactive job offers with queue position and arrival-wave forecasts. Accept early, hold in position, and be ready when the passenger wave arrives.",
        "tone": "driver",
    },
    {
        "path": "pages/1_ops_dashboard.py",
        "button_label": "Open OPS Control Tower",
        "eyebrow": "Module 3 · OPS",
        "title": "Monitor waves, predict deficits, act early",
        "description": "Track PWT, incoming flights, and QR scan activity in real time. AI advisory spots deficit risk early — with one-tap controls to open lanes and broadcast to drivers.",
        "tone": "ops",
    },
]


initialize_state()
apply_global_styles()
render_sidebar(active="overview")

# ── Hero — full width ────────────────────────────────────────────────────────
st.markdown(
    """
    <div class="hr-hero">
      <div class="hr-badge">Hello Ride &middot; BKK Airport</div>
      <h1 class="hr-hero-title">Proactive Taxi Dispatch<br>for Airport Arrival Waves</h1>
      <p class="hr-copy hr-hero-body-constrained">Hello Ride captures demand signals at baggage claim, predicts passenger arrival waves, and synchronizes taxi supply &mdash; so the right drivers are in position before congestion starts.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown('<div class="hr-section-gap"></div>', unsafe_allow_html=True)

# ── How it works — 3-step horizontal flow ───────────────────────────────────
st.markdown(
    '<div class="hr-eyebrow" style="margin-bottom:0.6rem;">How it works</div>',
    unsafe_allow_html=True,
)

step_cols = st.columns(3, gap="large")
for col, step in zip(step_cols, HOW_IT_WORKS):
    with col:
        st.markdown(
            f"""
            <div class="hr-step-card">
              <div class="hr-step-number">{step["number"]}</div>
              <div class="hr-step-title">{step["title"]}</div>
              <p class="hr-copy hr-step-body">{step["body"]}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

st.markdown('<div class="hr-section-gap"></div>', unsafe_allow_html=True)

# ── Module cards + CTAs ──────────────────────────────────────────────────────
st.markdown(
    '<div class="hr-eyebrow" style="margin-bottom:0.6rem;">Platform modules</div>',
    unsafe_allow_html=True,
)

card_columns = st.columns(3, gap="large")
for column, card in zip(card_columns, NAVIGATION_CARDS):
    with column:
        st.markdown(
            f"""
            <div class="hr-card hr-card-{card['tone']} hr-module-card">
              <div class="hr-eyebrow">{escape(card['eyebrow'])}</div>
              <div class="hr-card-title">{escape(card['title'])}</div>
              <div class="hr-copy">{escape(card['description'])}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        st.page_link(card["path"], label=card["button_label"], use_container_width=True)

# ── Footnote ─────────────────────────────────────────────────────────────────
st.markdown(
    """
    <div class="hr-inline-note">
      Demand signals flow Passenger &rarr; Driver &rarr; OPS &mdash; turning reactive airport queues into a synchronized, proactive dispatch system.
    </div>
    """,
    unsafe_allow_html=True,
)
