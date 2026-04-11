from copy import deepcopy
import time

import streamlit as st

from data.mock_passenger import PASSENGER_EXPERIENCE


def initialize_state() -> None:
    defaults = {
        "passenger_step": "home",
        "passenger_destination": "",
        "passenger_destination_input": "",
        "passenger_count": 1,
        "passenger_luggage": PASSENGER_EXPERIENCE["signal"]["luggage"],
        "passenger_special_assistance": False,
        "passenger_notes": "",
        "passenger_selected_ride": "",
        "passenger_payment": "",
        "passenger_rating": 5,
        "passenger_tip": "฿50",
        "passenger_comment": "",
        "passenger_review_submitted": False,
        "driver_step": "login",
        "driver_registered": False,
        "driver_verified": False,
        "driver_approved": False,
        "driver_online": False,
        "driver_in_queue": False,
        "driver_queue_position": 8,
        "driver_queue_wait_min": 12,
        "driver_face_scan_started": False,
        "driver_login_username": "driver_demo",
        "driver_login_password": "1234",
        "driver_registration": {"firstName": "", "lastName": "", "phone": ""},
        "driver_job_started_at": None,
        "driver_offer_expired": False,
        # Stores the job dict at the moment the driver taps "Accept job" in the
        # queue.  tripNavigation and paymentComplete read only from this key.
        # Never falls back to a different mock once set.
        "accepted_job": None,
        "ops_terminal": "T1",
        "ops_workspace": "Live Monitoring",
        "ops_guardrail_min": 10,
        "ops_extra_lane_active": False,
        "ops_last_broadcast": "",
        "ops_lane2_active": False,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = deepcopy(value)


def driver_logout() -> None:
    """Reset all driver session state to pre-login defaults.

    Clears authenticated/queue/job state only.  Passenger and Ops state
    are untouched.  Demo credentials are restored so the login screen
    shows the prefilled values immediately after logout.
    """
    st.session_state.driver_step = "login"
    st.session_state.driver_registered = False
    st.session_state.driver_verified = False
    st.session_state.driver_approved = False
    st.session_state.driver_online = False
    st.session_state.driver_in_queue = False
    st.session_state.driver_queue_position = 8
    st.session_state.driver_queue_wait_min = 12
    st.session_state.driver_face_scan_started = False
    st.session_state.driver_job_started_at = None
    st.session_state.driver_offer_expired = False
    st.session_state.accepted_job = None
    # Restore demo credentials so the login form is prefilled after logout.
    st.session_state.driver_login_username = "driver_demo"
    st.session_state.driver_login_password = "1234"


def set_driver_step(step: str) -> None:
    st.session_state.driver_step = step
    if step == "jobRequest":
        st.session_state.driver_job_started_at = time.time()
    else:
        st.session_state.driver_job_started_at = None


def reset_passenger_flow() -> None:
    st.session_state.passenger_step = "home"
    st.session_state.passenger_destination = ""
    st.session_state.passenger_destination_input = ""
    st.session_state.passenger_count = 1
    st.session_state.passenger_luggage = PASSENGER_EXPERIENCE["signal"]["luggage"]
    st.session_state.passenger_special_assistance = False
    st.session_state.passenger_notes = ""
    st.session_state.passenger_selected_ride = ""
    st.session_state.passenger_payment = ""
    st.session_state.passenger_rating = 5
    st.session_state.passenger_tip = "฿50"
    st.session_state.passenger_comment = ""
    st.session_state.passenger_review_submitted = False
