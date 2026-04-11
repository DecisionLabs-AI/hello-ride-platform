import streamlit as st

from components.cards import render_info_card, render_metric_card
from components.header import render_mobile_header, render_page_header, render_section_heading
from components.navigation import render_sidebar
from components.status_blocks import render_route_timeline, render_status_strip, render_timer_ring
from data.mock_driver import DRIVER_EXPERIENCE, DRIVER_FORECAST_BARS
from utils.state import initialize_state, set_driver_step, driver_logout
from utils.styles import apply_global_styles


st.set_page_config(
    page_title="Hello Ride | Driver",
    page_icon="H",
    layout="wide",
    initial_sidebar_state="expanded",
)


def apply_driver_styles() -> None:
    st.markdown(
        """
        <style>
        .hr-mobile-header {
          padding-top: 0.55rem;
          padding-bottom: 1rem;
          min-height: 3.3rem;
          overflow: visible;
        }

        .hr-mobile-title {
          line-height: 1.16;
          padding-top: 0.06rem;
        }

        .hr-mobile-side:empty {
          min-width: 2.8rem;
        }

        .driver-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.42rem;
          padding: 0.45rem 0.75rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(217, 228, 238, 0.9);
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .driver-status-dot {
          width: 0.55rem;
          height: 0.55rem;
          border-radius: 999px;
          background: #94a3b8;
        }

        .driver-status-pill.is-online .driver-status-dot {
          background: #00b14f;
          box-shadow: 0 0 0 4px rgba(0, 177, 79, 0.12);
        }

        .driver-brand-center {
          text-align: center;
          font-size: 1.38rem;
          line-height: 1.12;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #00b14f;
        }

        .driver-subhead {
          margin: 0.1rem 0 0.95rem;
          text-align: center;
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.45;
        }

        .driver-cta-note {
          margin: 0.45rem 0 0.95rem;
          text-align: center;
          color: #475569;
          font-size: 0.86rem;
          line-height: 1.45;
        }

        .driver-queue-card {
          border: 1px solid rgba(217, 228, 238, 0.82);
          border-radius: 1.35rem;
          background: rgba(255, 255, 255, 0.86);
          padding: 1rem;
          margin-bottom: 0.95rem;
        }

        .driver-forecast-note {
          margin-top: 0.55rem;
          font-size: 0.82rem;
          line-height: 1.4;
          color: #475569;
          text-align: center;
          font-weight: 600;
        }

        /* ── Registration page ────────────────────────────────────────────── */

        .reg-intro {
          padding: 0.9rem 0 1.1rem;
          text-align: center;
        }

        .reg-intro-title {
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 0.4rem;
        }

        .reg-intro-body {
          font-size: 0.86rem;
          color: #64748b;
          line-height: 1.5;
          max-width: 24rem;
          margin: 0 auto;
        }

        [data-testid="stVerticalBlockBorderWrapper"]:has(.reg-form-shell-anchor) {
          border-radius: 1.15rem;
          border: 1px solid rgba(217, 228, 238, 0.82);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
        }

        .reg-eligibility {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(217, 228, 238, 0.7);
          border-radius: 1rem;
          padding: 0.9rem 1rem;
          margin-bottom: 0.85rem;
        }

        .reg-eligibility-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 0.65rem;
        }

        .reg-eligibility-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.45rem;
        }

        .reg-eligibility-item {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 0.65rem;
          background: rgba(0, 177, 79, 0.06);
          border: 1px solid rgba(0, 177, 79, 0.16);
          border-radius: 0.6rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #1a3a2a;
          line-height: 1.2;
        }

        .reg-check {
          color: #00b14f;
          font-size: 0.85rem;
          font-weight: 800;
          flex-shrink: 0;
        }

        .reg-doc-list {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(217, 228, 238, 0.7);
          border-radius: 1rem;
          overflow: hidden;
          margin-bottom: 0.85rem;
        }

        .reg-doc-list-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
          padding: 0.8rem 1rem 0.55rem;
          border-bottom: 1px solid rgba(217, 228, 238, 0.6);
        }

        .reg-doc-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.62rem 1rem;
          border-bottom: 1px solid rgba(217, 228, 238, 0.35);
        }

        .reg-doc-item:last-child {
          border-bottom: none;
        }

        .reg-doc-name {
          font-size: 0.83rem;
          font-weight: 600;
          color: #1e293b;
        }

        .reg-doc-status {
          font-size: 0.7rem;
          font-weight: 600;
          color: #94a3b8;
          background: rgba(148, 163, 184, 0.1);
          border: 1px solid rgba(148, 163, 184, 0.18);
          padding: 0.18rem 0.5rem;
          border-radius: 999px;
          white-space: nowrap;
        }

        .reg-support {
          text-align: center;
          font-size: 0.78rem;
          color: #64748b;
          line-height: 1.5;
          padding: 0.8rem 0.35rem 0.1rem;
        }

        [data-testid="stVerticalBlockBorderWrapper"]:has(.reg-cta-anchor) {
          margin-top: 1.45rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(217, 228, 238, 0.92);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(14px);
          position: sticky;
          bottom: 0.9rem;
          z-index: 12;
        }

        [data-testid="stVerticalBlockBorderWrapper"]:has(.reg-cta-anchor) .stButton > button,
        [data-testid="stVerticalBlockBorderWrapper"]:has(.reg-cta-anchor) [data-testid="stBaseButton-primary"] {
          min-height: 3.65rem;
          padding: 0.95rem 1.25rem;
          border-radius: 1.1rem;
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: #ffffff;
          border: 1px solid rgba(8, 119, 51, 0.96);
          background: linear-gradient(180deg, #0fd163 0%, #00b14f 60%, #0c9540 100%);
          box-shadow: 0 14px 30px rgba(0, 177, 79, 0.28), 0 4px 12px rgba(12, 125, 53, 0.16);
          transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
        }

        [data-testid="stVerticalBlockBorderWrapper"]:has(.reg-cta-anchor) .stButton > button:hover,
        [data-testid="stVerticalBlockBorderWrapper"]:has(.reg-cta-anchor) [data-testid="stBaseButton-primary"]:hover {
          transform: translateY(-1px);
          background: linear-gradient(180deg, #1ad56a 0%, #07b455 55%, #0c8740 100%);
          box-shadow: 0 18px 34px rgba(0, 177, 79, 0.34), 0 6px 14px rgba(12, 125, 53, 0.18);
        }

        [data-testid="stVerticalBlockBorderWrapper"]:has(.reg-cta-anchor) .stButton > button:focus,
        [data-testid="stVerticalBlockBorderWrapper"]:has(.reg-cta-anchor) [data-testid="stBaseButton-primary"]:focus {
          border-color: rgba(8, 119, 51, 0.96);
          box-shadow: 0 0 0 0.22rem rgba(0, 177, 79, 0.18), 0 14px 30px rgba(0, 177, 79, 0.28);
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def sync_driver_toggle(widget_key: str) -> None:
    st.session_state.driver_online = bool(st.session_state[widget_key])
    if not st.session_state.driver_online:
        st.session_state.driver_in_queue = False


def join_airport_queue() -> None:
    st.session_state.driver_in_queue = True
    st.session_state.driver_queue_position = 8
    st.session_state.driver_queue_wait_min = 12


def accept_next_queue_job() -> None:
    # Snapshot the previewed job into accepted_job before transitioning.
    # jobRequest, tripNavigation, and paymentComplete all read from this key.
    st.session_state.accepted_job = DRIVER_EXPERIENCE["guideTrip"]
    st.session_state.driver_in_queue = False
    set_driver_step("jobRequest")


# ---------------------------------------------------------------------------
# Navigation callbacks — used as on_click handlers so they fire reliably even
# when a @st.fragment timer is auto-running in the background.  With inline
# `if st.button():` blocks, a fragment auto-rerun can absorb the click before
# the outer script gets a chance to evaluate it, causing the apparent need for
# a second tap.  on_click callbacks are queued before the next full-page rerun
# and are guaranteed to execute exactly once per click.
# ---------------------------------------------------------------------------

def _cb_registration_back() -> None:
    set_driver_step("login")


def _cb_accept_job() -> None:
    set_driver_step("tripNavigation")


def _cb_reject_job() -> None:
    st.session_state.accepted_job = None
    set_driver_step("guide")


def _cb_arrived_at_pickup() -> None:
    set_driver_step("paymentComplete")


def _cb_confirm_payment() -> None:
    st.session_state.accepted_job = None
    st.session_state.driver_online = True
    set_driver_step("guide")


def _cb_logout() -> None:
    driver_logout()


@st.fragment(run_every="1s")
def render_driver_job_timer(total_seconds: int) -> None:
    remaining = render_timer_ring(
        total_seconds=total_seconds,
        started_at=st.session_state.driver_job_started_at,
    )
    if remaining <= 0:
        st.session_state.driver_offer_expired = True
        set_driver_step("guide")
        st.rerun()


def driver_status_label() -> str:
    return "Online" if st.session_state.driver_online else "Offline"


def render_driver_app_header() -> None:
    pill_class = "driver-status-pill is-online" if st.session_state.driver_online else "driver-status-pill"
    left_col, center_col, right_col = st.columns([3, 4, 2], vertical_alignment="center")
    with left_col:
        st.markdown(
            f'<div class="{pill_class}"><span class="driver-status-dot"></span>{driver_status_label()}</div>',
            unsafe_allow_html=True,
        )
    with center_col:
        st.markdown('<div class="driver-brand-center">Hello Ride</div>', unsafe_allow_html=True)
    with right_col:
        st.button("Logout", key="driver_logout_btn", on_click=_cb_logout, use_container_width=True)


def render_driver_queue_pressure_chart() -> None:
    _COLOR = {"peak": "#00b14f", "surge": "#7dd3a8", "normal": "#cbd5e1"}
    _LABEL = {"peak": "Peak", "surge": "High", "normal": ""}
    MAX_PX = 180
    max_h = max(b["height"] for b in DRIVER_FORECAST_BARS)

    bars_html = ""
    for bar in DRIVER_FORECAST_BARS:
        h = round(bar["height"] / max_h * MAX_PX)
        bars_html += (
            f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">'
            f'<span style="font-size:10px;font-weight:700;color:#0f172a;min-height:14px;">{_LABEL[bar["type"]]}</span>'
            f'<div style="width:100%;display:flex;align-items:flex-end;height:{MAX_PX}px;">'
            f'<div style="width:100%;height:{h}px;background:{_COLOR[bar["type"]]};border-radius:5px 5px 0 0;"></div>'
            f'</div>'
            f'<span style="font-size:11px;color:#64748b;">{bar["time"]}</span>'
            f'</div>'
        )

    st.markdown(
        f'<div style="display:flex;gap:8px;padding:0.5rem 0;">{bars_html}</div>',
        unsafe_allow_html=True,
    )
    st.markdown(
        "<div class='driver-forecast-note'>Best window: 18:00–20:00 for the strongest airport queue demand.</div>",
        unsafe_allow_html=True,
    )


def perform_driver_login() -> None:
    username = st.session_state.get("driver_login_username", "").strip()
    password = st.session_state.get("driver_login_password", "")
    if username and password:
        st.session_state.driver_registered = True
        st.session_state.driver_verified = True
        st.session_state.driver_approved = True
        st.session_state.driver_online = False
        set_driver_step("guide")


def submit_driver_registration() -> None:
    st.session_state.driver_registration = {
        "firstName": st.session_state.get("driver_registration_first_name", "").strip(),
        "lastName": st.session_state.get("driver_registration_last_name", "").strip(),
        "phone": st.session_state.get("driver_registration_phone", "").strip(),
    }
    st.session_state.driver_registered = True
    st.session_state.driver_verified = True
    st.session_state.driver_approved = True
    set_driver_step("guide")


def render_driver_login() -> None:
    render_mobile_header("Hello Ride")
    render_info_card(
        eyebrow="Driver Sign In",
        title="Welcome back, partner.",
        body="Sign in to go online, accept the next airport queue, and track the best earning window.",
        tone="driver-soft",
    )
    with st.form("driver_login_form", clear_on_submit=False):
        st.text_input("Username", key="driver_login_username", placeholder="somchai.driver")
        st.text_input("Password", key="driver_login_password", type="password", placeholder="Enter password")
        submitted = st.form_submit_button("Log In", width="stretch")
    st.caption("Demo credentials are prefilled for presentation: driver_demo / 1234")

    if submitted:
        perform_driver_login()

    if submitted and st.session_state.driver_step != "guide":
        st.error("Enter both username and password to continue.")

    if st.button("Create Partner Account", width="stretch"):
        set_driver_step("registration")


def render_driver_registration() -> None:
    registration = st.session_state.driver_registration
    if "driver_registration_first_name" not in st.session_state:
        st.session_state.driver_registration_first_name = registration["firstName"]
    if "driver_registration_last_name" not in st.session_state:
        st.session_state.driver_registration_last_name = registration["lastName"]
    if "driver_registration_phone" not in st.session_state:
        st.session_state.driver_registration_phone = registration["phone"]

    # ── Header: Back | Hello Ride | Log In ─────────────────────────────────────
    # Back and Log In are real Streamlit buttons with on_click callbacks so they
    # fire on the first tap, even during fragment reruns.  render_mobile_header
    # was removed here because it renders static HTML — not interactive.
    h_left, h_center, h_right = st.columns([2, 4, 2], vertical_alignment="center")
    with h_left:
        st.button("Back", key="reg_back_btn", on_click=_cb_registration_back)
    with h_center:
        st.markdown('<div class="driver-brand-center">Hello Ride</div>', unsafe_allow_html=True)
    with h_right:
        st.button("Log In", key="reg_login_btn", on_click=_cb_registration_back, use_container_width=True)

    # ── Intro ───────────────────────────────────────────────────────────────────
    st.markdown(
        """
        <div class="reg-intro">
          <div class="reg-intro-title">Drive with Hello Ride</div>
          <div class="reg-intro-body">Join BKK Airport's proactive taxi dispatch network. Complete your details to begin the onboarding process.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── Registration form ───────────────────────────────────────────────────────
    with st.container(border=True):
        st.markdown('<div class="reg-form-shell-anchor"></div>', unsafe_allow_html=True)
        name_cols = st.columns(2, gap="small")
        with name_cols[0]:
            st.text_input(
                "First name",
                key="driver_registration_first_name",
                placeholder="Somchai",
            )
        with name_cols[1]:
            st.text_input(
                "Last name",
                key="driver_registration_last_name",
                placeholder="Jaidee",
            )
        st.text_input(
            "Mobile phone",
            key="driver_registration_phone",
            placeholder="+66 081 234 5678",
        )

    st.session_state.driver_registration = {
        "firstName": st.session_state.get("driver_registration_first_name", "").strip(),
        "lastName": st.session_state.get("driver_registration_last_name", "").strip(),
        "phone": st.session_state.get("driver_registration_phone", "").strip(),
    }

    # ── Eligibility criteria ────────────────────────────────────────────────────
    st.markdown(
        """
        <div class="reg-eligibility">
          <div class="reg-eligibility-label">Eligibility criteria</div>
          <div class="reg-eligibility-grid">
            <div class="reg-eligibility-item"><span class="reg-check">&#10003;</span>Thai nationality</div>
            <div class="reg-eligibility-item"><span class="reg-check">&#10003;</span>18&ndash;70 years old</div>
            <div class="reg-eligibility-item"><span class="reg-check">&#10003;</span>No criminal record</div>
            <div class="reg-eligibility-item"><span class="reg-check">&#10003;</span>Car under 9 years old</div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── Document checklist ─────────────────────────────────────────────────────
    st.markdown(
        """
        <div class="reg-doc-list">
          <div class="reg-doc-list-label">Documents required</div>
          <div class="reg-doc-item">
            <span class="reg-doc-name">National ID card</span>
            <span class="reg-doc-status">Pending upload</span>
          </div>
          <div class="reg-doc-item">
            <span class="reg-doc-name">Car registration</span>
            <span class="reg-doc-status">Pending upload</span>
          </div>
          <div class="reg-doc-item">
            <span class="reg-doc-name">Insurance / ACT</span>
            <span class="reg-doc-status">Pending upload</span>
          </div>
          <div class="reg-doc-item">
            <span class="reg-doc-name">Driver&rsquo;s license</span>
            <span class="reg-doc-status">Pending upload</span>
          </div>
          <div class="reg-doc-item">
            <span class="reg-doc-name">Bank book</span>
            <span class="reg-doc-status">Pending upload</span>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── Support ─────────────────────────────────────────────────────────────────
    with st.container(border=True):
        st.markdown('<div class="reg-cta-anchor"></div>', unsafe_allow_html=True)
        st.button(
            "Continue Registration",
            key="driver_registration_continue",
            use_container_width=True,
            type="primary",
            on_click=submit_driver_registration,
        )
        st.markdown(
            '<div class="reg-support">Need help? Chat with us 24/7 or call during business hours.</div>',
            unsafe_allow_html=True,
        )



def render_driver_application_status() -> None:
    render_mobile_header("Hello Ride", right_label="Status")
    render_page_header(
        eyebrow="Application Status",
        title="You're almost there, Partner.",
        body="Complete your training to unlock the road.",
    )
    render_status_strip(
        [
            ("Submitted", True),
            ("Verifying", st.session_state.driver_verified),
            ("Training", True),
            ("Background", st.session_state.driver_approved),
            ("Active", st.session_state.driver_approved),
        ]
    )
    render_info_card(
        "Document Check",
        "Verification review",
        "Completed" if st.session_state.driver_approved else "Estimated completion: 3-7 days",
        tone="neutral",
    )
    render_info_card(
        "Academy Learning",
        "Training progress",
        "Completed" if st.session_state.driver_approved else "2/5 lessons completed",
        tone="neutral",
    )
    render_info_card(
        "Featured",
        "Passenger Safety & 5-Star Standards",
        "Tap to simulate lesson completion and unlock the final approval state.",
        tone="driver-dark",
    )
    if st.button("Complete Academy", width="stretch"):
        if st.session_state.driver_registered and st.session_state.driver_verified:
            st.session_state.driver_approved = True

    render_info_card(
        "Approval",
        "Approval Complete" if st.session_state.driver_approved else "Approval Pending",
        "Your account is approved and ready for activation."
        if st.session_state.driver_approved
        else "Your account is currently under review. Complete your lessons to expedite the process. Up to 3 business days.",
        tone="neutral",
    )
    if st.session_state.driver_approved and st.button("Ready to Go Online", width="stretch"):
        set_driver_step("guide")


def render_driver_guide() -> None:
    render_driver_app_header()
    st.markdown(
        f"<div class='driver-subhead'>Good morning, {DRIVER_EXPERIENCE['profile']['name'].split()[0]}. Stay ready for the next airport queue and peak-arrival bonus.</div>",
        unsafe_allow_html=True,
    )

    st.session_state.driver_online_toggle = st.session_state.driver_online
    st.toggle(
        "Go Online",
        key="driver_online_toggle",
        on_change=sync_driver_toggle,
        args=("driver_online_toggle",),
    )

    render_metric_card("Identity", "Verified", tone="driver-soft")

    render_info_card(
        "Active Incentive",
        "Sukhumvit zone bonus",
        "+THB 50 per trip during the current airport arrival wave.",
        tone="driver-soft",
    )
    render_info_card(
        "High Demand",
        "50+ cars needed in the next 45 minutes.",
        "Stay near Terminal 1 lane entry to catch the strongest wave.",
        tone="driver",
    )

    with st.container(border=True):
        render_section_heading("Airport Queue", "Get the next airport pickup")
        if st.session_state.driver_in_queue:
            queue_cols = st.columns(2, gap="small")
            with queue_cols[0]:
                st.markdown("**You are in queue**")
                st.caption(f"Position #{st.session_state.driver_queue_position}")
            with queue_cols[1]:
                st.markdown(f"**~{st.session_state.driver_queue_wait_min} min wait**")
                st.caption("Estimated until next dispatch")

            preview = DRIVER_EXPERIENCE["guideTrip"]
            render_info_card(
                "Next job preview",
                preview["pickup"],
                f"{preview['dropoff']} · {preview['payout']}",
                tone="driver-soft",
            )
            st.button("Accept job", width="stretch", type="primary", on_click=accept_next_queue_job)
        else:
            st.markdown(
                "<div class='driver-cta-note'>Join the airport queue to receive the next dispatch from the arrivals wave.</div>",
                unsafe_allow_html=True,
            )
            st.button(
                "Join Airport Queue",
                width="stretch",
                type="primary",
                disabled=not st.session_state.driver_online,
                on_click=join_airport_queue,
            )

    render_section_heading("Today's Demand Forecast", "Expected queue pressure")
    render_driver_queue_pressure_chart()


def render_driver_job_request() -> None:
    # Use accepted_job as the single source of truth.  Fall back to guideTrip
    # only if this screen is reached without going through the queue (e.g. dev
    # hot-reload).  Never read from a different mock object on this screen.
    job = st.session_state.accepted_job or DRIVER_EXPERIENCE["guideTrip"]

    render_driver_app_header()
    if st.session_state.driver_offer_expired:
        st.warning("The previous offer expired and the guide screen has been restored.")
        st.session_state.driver_offer_expired = False
    render_info_card("High Demand", "Hello Ride Plus", f"{job['distance']} ({job['eta']})", tone="driver")
    render_metric_card("Net Earnings", job["payout"], tone="driver")
    render_driver_job_timer(DRIVER_EXPERIENCE["incomingJob"]["countdown"])
    render_route_timeline(
        pickup=job["pickup"],
        pickup_sublabel=job["pickupAddress"],
        destination=job["dropoff"],
        destination_sublabel=job["dropoffAddress"],
    )
    with st.expander("More job details", expanded=False):
        details = DRIVER_EXPERIENCE["incomingJob"]
        render_info_card(
            "Trip context",
            f"{details['flightRef']} · {details['payment']}",
            f"{details['passengers']} passengers · {details['luggage']} luggage · {details['distance']}",
            tone="neutral",
        )
    action_cols = st.columns(2, gap="small")
    with action_cols[0]:
        st.button("Accept Job", width="stretch", on_click=_cb_accept_job)
    with action_cols[1]:
        st.button("Reject", width="stretch", on_click=_cb_reject_job)


def render_driver_trip_navigation() -> None:
    job = st.session_state.accepted_job or DRIVER_EXPERIENCE["guideTrip"]

    render_driver_app_header()
    render_info_card(
        "Navigation",
        "Head north toward the pickup zone",
        "200 m until next turn",
        tone="neutral",
    )
    action_cols = st.columns(2, gap="small")
    with action_cols[0]:
        st.button("Message", width="stretch", disabled=True)
    with action_cols[1]:
        st.button("Call", width="stretch", disabled=True)
    render_info_card(
        "Passenger",
        job["passengerName"],
        f"Hello Car · {job['payout']}",
        tone="neutral",
    )
    render_route_timeline(
        pickup=job["pickup"],
        pickup_sublabel=job.get("pickupAddress", ""),
        destination=job["dropoff"],
        destination_sublabel=job.get("dropoffAddress", ""),
    )
    st.button("Arrived at Pick-up", width="stretch", on_click=_cb_arrived_at_pickup)


def render_driver_payment_complete() -> None:
    job = st.session_state.accepted_job or DRIVER_EXPERIENCE["guideTrip"]
    fb = job["fareBreakdown"]

    render_mobile_header("Hello Ride", left_label="Guide", right_label="Trip Ended")
    render_info_card(
        "Journey Complete",
        "Arrived at destination",
        "You have successfully dropped off the passenger.",
        tone="driver",
    )
    render_metric_card("Total Fare", job["payout"], tone="driver")
    for label, value in [
        (f"Distance ({fb['distanceKm']} km)", fb["distanceFare"]),
        (f"Time ({fb['durationMin']} mins)", fb["durationFare"]),
        ("Booking Fee", fb["bookingFee"]),
    ]:
        render_metric_card(label, value)
    st.button("Confirm Payment Received", width="stretch", on_click=_cb_confirm_payment)


SCREENS = {
    "home": render_driver_login,
    "login": render_driver_login,
    "registration": render_driver_registration,
    "applicationStatus": render_driver_application_status,
    "guide": render_driver_guide,
    "jobRequest": render_driver_job_request,
    "tripNavigation": render_driver_trip_navigation,
    "paymentComplete": render_driver_payment_complete,
}


initialize_state()
apply_global_styles()
apply_driver_styles()
render_sidebar(active="driver")

outer_left, middle, outer_right = st.columns([1, 1.25, 1], gap="large")
with middle:
    SCREENS[st.session_state.driver_step]()
