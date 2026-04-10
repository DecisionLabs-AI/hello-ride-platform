import streamlit as st
import altair as alt
import pandas as pd

from components.cards import render_info_card, render_metric_card
from components.header import render_mobile_header, render_page_header, render_section_heading
from components.navigation import render_sidebar
from components.status_blocks import render_route_timeline, render_status_strip, render_timer_ring
from data.mock_driver import DRIVER_EXPERIENCE, DRIVER_FORECAST_BARS
from utils.state import initialize_state, set_driver_step
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

        .driver-app-header {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.15rem 1rem;
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

        .driver-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.15rem;
          height: 2.15rem;
          border-radius: 999px;
          background: linear-gradient(135deg, #dff7e8 0%, #c7f1d6 100%);
          color: #067c37;
          font-size: 0.8rem;
          font-weight: 800;
          border: 1px solid rgba(0, 177, 79, 0.16);
          margin-left: auto;
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
    st.session_state.driver_in_queue = False
    set_driver_step("jobRequest")


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


def render_driver_app_header(show_avatar: bool = True) -> None:
    pill_class = "driver-status-pill is-online" if st.session_state.driver_online else "driver-status-pill"
    st.markdown(
        f"""
        <div class="driver-app-header">
          <div class="{pill_class}">
            <span class="driver-status-dot"></span>
            {driver_status_label()}
          </div>
          <div class="driver-brand-center">Hello Ride</div>
          <div class="driver-avatar">{DRIVER_EXPERIENCE['profile']['name'].split()[0][0]}J</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_driver_queue_pressure_chart() -> None:
    forecast_df = pd.DataFrame(
        [
            {
                "time": bar["time"],
                "pressure": bar["height"],
                "level": "Peak" if bar["type"] == "peak" else "High" if bar["type"] == "surge" else "Normal",
            }
            for bar in DRIVER_FORECAST_BARS
        ]
    )
    chart = (
        alt.Chart(forecast_df)
        .mark_bar(cornerRadiusTopLeft=6, cornerRadiusTopRight=6)
        .encode(
            x=alt.X("time:N", title=None, sort=list(forecast_df["time"])),
            y=alt.Y("pressure:Q", title=None, axis=None),
            color=alt.Color(
                "level:N",
                scale=alt.Scale(
                    domain=["Normal", "High", "Peak"],
                    range=["#cbd5e1", "#7dd3a8", "#00b14f"],
                ),
                legend=None,
            ),
            tooltip=["time", "level"],
        )
        .properties(height=220)
    )
    text = (
        alt.Chart(forecast_df)
        .mark_text(dy=-10, fontSize=11, fontWeight="bold", color="#0f172a")
        .encode(
            x=alt.X("time:N", sort=list(forecast_df["time"])),
            y="pressure:Q",
            text=alt.condition(
                alt.datum.level == "Normal",
                alt.value(""),
                "level:N",
            ),
        )
    )
    st.altair_chart(chart + text, width="stretch")
    st.markdown(
        "<div class='driver-forecast-note'>Best window: 18:00-20:00 for the strongest airport queue demand.</div>",
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
    render_mobile_header("Hello Ride", left_label="Back", right_label="Log In")
    render_info_card(
        eyebrow="New Driver Registration",
        title="Drive with Hello Ride.",
        body="Start your journey today. Complete your profile and documents to get verified.",
        tone="info",
    )
    render_section_heading("Join us", "Create Your Driver Account")
    with st.form("driver_registration_form", clear_on_submit=False):
        name_cols = st.columns(2, gap="small")
        with name_cols[0]:
            first_name = st.text_input(
                "First name",
                value=st.session_state.driver_registration["firstName"],
            )
        with name_cols[1]:
            last_name = st.text_input(
                "Last name",
                value=st.session_state.driver_registration["lastName"],
            )
        phone = st.text_input(
            "Mobile phone",
            value=st.session_state.driver_registration["phone"],
            placeholder="+66 081 234 5678",
        )
        submitted = st.form_submit_button("Submit Document", width="stretch")

    st.session_state.driver_registration = {
        "firstName": first_name,
        "lastName": last_name,
        "phone": phone,
    }

    render_section_heading("Qualify", "Are you eligible?")
    eligibility_cols = st.columns(2, gap="small")
    for column, item in zip(
        eligibility_cols * 2,
        [
            "Thai Nationality",
            "18-70 years old",
            "No criminal record",
            "Car under 9 years old",
        ],
    ):
        with column:
            render_metric_card("Eligibility", item)

    render_section_heading("Documents", "Checklist")
    for item in ["ID card", "Car registration", "Insurance/ACT", "Driver's License", "Bank book"]:
        render_info_card("Required", item, "Pending upload", tone="neutral")
    render_info_card("Support", "Need help with documents?", "Our support team is available 24/7 to guide you.", tone="info")

    if submitted:
        st.session_state.driver_registered = True
        set_driver_step("verification")


def render_driver_verification() -> None:
    render_mobile_header("Hello Ride", left_label="Back")
    render_page_header(
        eyebrow="Verification",
        title="Verify Your Identity",
        body="Please complete the face scan to verify your Hello Ride driver profile credentials.",
    )
    render_info_card(
        eyebrow="Face Scan",
        title="Position face within frame",
        body="Ensure your face is clearly visible in good lighting and remove sunglasses, hats, or masks before scanning.",
        tone="neutral",
    )
    tips = st.columns(2, gap="small")
    with tips[0]:
        render_info_card("Good Lighting", "Keep your face visible", "Avoid harsh shadows and backlight.", tone="info")
    with tips[1]:
        render_info_card("No Accessories", "Scan-ready posture", "Remove sunglasses, hats, or masks.", tone="info")

    action_cols = st.columns(2, gap="small")
    with action_cols[0]:
        if st.button("Start Face Scan", width="stretch"):
            st.session_state.driver_face_scan_started = True
            st.session_state.driver_verified = True
    with action_cols[1]:
        if st.button(
            "Done",
            width="stretch",
            disabled=not st.session_state.driver_face_scan_started,
        ):
            set_driver_step("applicationStatus")


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

            preview = DRIVER_EXPERIENCE["incomingJob"]
            render_info_card(
                "Next job preview",
                preview["pickup"],
                f"{preview['dropoff']} · {preview['payout']}",
                tone="driver-soft",
            )
            if st.button("Accept job", width="stretch", type="primary"):
                accept_next_queue_job()
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
    render_mobile_header("Hello Ride", right_label="Online")
    if st.session_state.driver_offer_expired:
        st.warning("The previous offer expired and the guide screen has been restored.")
        st.session_state.driver_offer_expired = False
    render_info_card("High Demand", "Hello Ride Plus", f"{DRIVER_EXPERIENCE['guideTrip']['distance']} ({DRIVER_EXPERIENCE['guideTrip']['eta']})", tone="driver")
    render_metric_card("Net Earnings", DRIVER_EXPERIENCE["guideTrip"]["payout"], tone="driver")
    render_driver_job_timer(DRIVER_EXPERIENCE["incomingJob"]["countdown"])
    render_route_timeline(
        pickup=DRIVER_EXPERIENCE["guideTrip"]["pickup"],
        pickup_sublabel=DRIVER_EXPERIENCE["guideTrip"]["pickupAddress"],
        destination=DRIVER_EXPERIENCE["guideTrip"]["dropoff"],
        destination_sublabel=DRIVER_EXPERIENCE["guideTrip"]["dropoffAddress"],
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
        if st.button("Accept Job", width="stretch"):
            set_driver_step("tripNavigation")
    with action_cols[1]:
        if st.button("Reject", width="stretch"):
            set_driver_step("guide")


def render_driver_trip_navigation() -> None:
    render_mobile_header("Hello Ride", right_label="Online")
    render_info_card(
        "Navigation",
        "Head north toward Robinson Rd / Marina Blvd",
        "200 m until next turn",
        tone="neutral",
    )
    action_cols = st.columns(2, gap="small")
    with action_cols[0]:
        st.button("Message", width="stretch", disabled=True)
    with action_cols[1]:
        st.button("Call", width="stretch", disabled=True)
    render_info_card(
        "Driver",
        DRIVER_EXPERIENCE["activeTrip"]["driver"],
        f"{DRIVER_EXPERIENCE['activeTrip']['service']} · {DRIVER_EXPERIENCE['activeTrip']['payout']}",
        tone="neutral",
    )
    render_route_timeline(
        pickup=DRIVER_EXPERIENCE["activeTrip"]["pickup"],
        destination=DRIVER_EXPERIENCE["activeTrip"]["dropoff"],
    )
    st.session_state.driver_trip_online_toggle = st.session_state.driver_online
    st.toggle("Online status", key="driver_trip_online_toggle")
    st.session_state.driver_online = st.session_state.driver_trip_online_toggle
    if st.button("Arrived at Pick-up", width="stretch"):
        set_driver_step("paymentComplete")


def render_driver_payment_complete() -> None:
    render_mobile_header("Hello Ride", left_label="Guide", right_label="Trip Ended")
    render_info_card(
        "Journey Complete",
        "Arrived at destination",
        "You have successfully dropped off the passenger.",
        tone="driver",
    )
    render_metric_card("Total Fare", DRIVER_EXPERIENCE["activeTrip"]["payout"], tone="driver")
    for label, value in [
        (
            f"Distance ({DRIVER_EXPERIENCE['activeTrip']['fareBreakdown']['distanceKm']} km)",
            DRIVER_EXPERIENCE["activeTrip"]["fareBreakdown"]["distanceFare"],
        ),
        (
            f"Time ({DRIVER_EXPERIENCE['activeTrip']['fareBreakdown']['durationMin']} mins)",
            DRIVER_EXPERIENCE["activeTrip"]["fareBreakdown"]["durationFare"],
        ),
        ("Booking Fee", DRIVER_EXPERIENCE["activeTrip"]["fareBreakdown"]["bookingFee"]),
    ]:
        render_metric_card(label, value)
    if st.button("Confirm Payment Received", width="stretch"):
        st.session_state.driver_online = True
        set_driver_step("guide")


SCREENS = {
    "home": render_driver_login,
    "login": render_driver_login,
    "registration": render_driver_registration,
    "verification": render_driver_verification,
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
