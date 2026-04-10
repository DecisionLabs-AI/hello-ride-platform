import streamlit as st


def render_sidebar(active: str) -> None:
    with st.sidebar:
        st.markdown(
            """
            <div class="hr-sidebar-brand">
              <div class="hr-sidebar-title">Hello Ride</div>
              <div class="hr-sidebar-copy">Proactive taxi dispatch for Suvarnabhumi Airport</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        links = [
            ("overview", "Overview", "app.py"),
            ("ops", "OPS", "pages/1_ops_dashboard.py"),
            ("driver", "Driver", "pages/2_driver_flow.py"),
            ("passenger", "Passenger", "pages/3_passenger_flow.py"),
        ]
        for key, label, path in links:
            if st.button(
                label,
                key=f"nav_{key}",
                width="stretch",
                type="primary" if key == active else "secondary",
                disabled=key == active,
            ):
                st.switch_page(path)
        st.divider()
        st.caption(f"Current surface: {active}")
        st.caption(
            f"Passenger step: {st.session_state.passenger_step} | Driver step: {st.session_state.driver_step}"
        )
