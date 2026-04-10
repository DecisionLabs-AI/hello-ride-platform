import streamlit as st

from components.cards import render_info_card
from components.header import render_hero
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

NAVIGATION_CARDS = [
    {
        "path": "pages/3_passenger_flow.py",
        "label": "Passenger Portal",
        "title": "Capture demand before passengers hit the curb",
        "description": "QR-triggered early demand, assisted ride selection, and live pickup orchestration for arriving travelers.",
        "tone": "passenger",
    },
    {
        "path": "pages/2_driver_flow.py",
        "label": "Driver View",
        "title": "Turn supply into a ready, signal-driven fleet",
        "description": "Dispatch offers, readiness checks, and actionable ops guidance for airport drivers.",
        "tone": "driver",
    },
    {
        "path": "pages/1_ops_dashboard.py",
        "label": "Ops Control Tower",
        "title": "See passenger waves before queues break",
        "description": "PWT, flight bunching, demand forecasts, supply telemetry, and AI-backed intervention controls.",
        "tone": "ops",
    },
]


initialize_state()
apply_global_styles()
render_sidebar(active="overview")

render_hero(
    badge="Hello Ride prototype",
    title="Predictive Dispatching + Signaling for Proactive Taxi Operations in BKK Airport",
    body="A Streamlit adaptation of the original prototype, preserving the same three operating surfaces: passenger demand capture, driver dispatch readiness, and the ops control tower.",
    aside_title="Design intent",
    aside_body="Shift the airport queue from reactive dispatching to a signal-driven system that mobilizes supply before passengers reach the pickup curb.",
)

card_columns = st.columns(3, gap="large")
for column, card in zip(card_columns, NAVIGATION_CARDS):
    with column:
        render_info_card(
            eyebrow=card["label"],
            title=card["title"],
            body=card["description"],
            tone=card["tone"],
        )
        st.page_link(card["path"], label=f"Open {card['label']}", width="stretch")

st.markdown(
    """
    <div class="hr-inline-note">
      Built for the next step: connect data, dispatch logic, and AI agents without changing the shell.
    </div>
    """,
    unsafe_allow_html=True,
)
