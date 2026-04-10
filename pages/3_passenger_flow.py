import streamlit as st
from html import escape

from components.cards import render_info_card
from components.header import render_section_heading
from components.navigation import render_sidebar
from data.mock_passenger import PASSENGER_EXPERIENCE, PAYMENT_OPTIONS, TIP_OPTIONS
from utils.state import initialize_state, reset_passenger_flow
from utils.styles import apply_global_styles


st.set_page_config(
    page_title="Hello Ride | Passenger",
    page_icon="H",
    layout="wide",
    initial_sidebar_state="expanded",
)


def apply_passenger_styles() -> None:
    st.markdown(
        """
        <style>
        .passenger-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.1rem 0.15rem 0.8rem;
        }

        .passenger-brand {
          font-size: 0.82rem;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(0, 177, 79, 0.74);
        }

        .passenger-brand-title {
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #00b14f;
          text-align: center;
        }

        .passenger-user {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          min-width: 0;
        }

        .passenger-user-name {
          font-size: 0.92rem;
          font-weight: 700;
          color: #475569;
          white-space: nowrap;
        }

        .passenger-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 999px;
          background: linear-gradient(135deg, #dff7e8 0%, #c7f1d6 100%);
          color: #067c37;
          font-size: 0.78rem;
          font-weight: 800;
          border: 1px solid rgba(0, 177, 79, 0.16);
          flex-shrink: 0;
        }

        .passenger-config-shell {
          border: 1px solid rgba(217, 228, 238, 0.78);
          border-radius: 1.35rem;
          background: rgba(255, 255, 255, 0.78);
          padding: 1rem;
          margin-bottom: 0.9rem;
        }

        .passenger-counter-card {
          border: 1px solid rgba(217, 228, 238, 0.78);
          border-radius: 1.15rem;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          padding: 0.95rem 0.85rem;
          min-height: 8.7rem;
        }

        .passenger-counter-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #64748b;
          text-align: center;
          white-space: nowrap;
        }

        .passenger-counter-subtitle {
          margin-top: 0.28rem;
          font-size: 0.76rem;
          line-height: 1.35;
          color: #64748b;
          text-align: center;
        }

        .passenger-counter-value {
          margin-top: 0.85rem;
          font-size: 2.1rem;
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 800;
          color: #0f172a;
          text-align: center;
        }

        .passenger-counter-actions {
          margin-top: 0.85rem;
        }

        .passenger-counter-note {
          font-size: 0.78rem;
          line-height: 1.45;
          color: #64748b;
        }

        .passenger-summary-shell {
          border: 1px solid rgba(217, 228, 238, 0.82);
          border-radius: 1.35rem;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          padding: 1rem 1rem 0.95rem;
          margin-bottom: 0.95rem;
        }

        .passenger-summary-row {
          display: flex;
          align-items: flex-start;
          gap: 0.8rem;
        }

        .passenger-summary-marker {
          width: 1rem;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 0.2rem;
        }

        .passenger-summary-dot {
          width: 0.72rem;
          height: 0.72rem;
          border-radius: 999px;
          background: #00b14f;
          box-shadow: 0 0 0 4px rgba(0, 177, 79, 0.14);
        }

        .passenger-summary-line {
          width: 2px;
          min-height: 2rem;
          background: linear-gradient(180deg, rgba(0, 177, 79, 0.32) 0%, rgba(148, 163, 184, 0.14) 100%);
          margin: 0.35rem 0;
          border-radius: 999px;
        }

        .passenger-summary-square {
          width: 0.72rem;
          height: 0.72rem;
          border-radius: 0.18rem;
          background: #0f172a;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
        }

        .passenger-summary-copy {
          min-width: 0;
          flex: 1;
          padding-bottom: 0.8rem;
        }

        .passenger-summary-copy:last-child {
          padding-bottom: 0;
        }

        .passenger-summary-eyebrow {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 0.22rem;
        }

        .passenger-summary-title {
          font-size: 1rem;
          line-height: 1.3;
          font-weight: 700;
          color: #0f172a;
        }

        .passenger-summary-subtitle {
          margin-top: 0.16rem;
          font-size: 0.83rem;
          line-height: 1.42;
          color: #64748b;
        }

        .passenger-choice-icon {
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 177, 79, 0.1);
          color: #067c37;
          font-size: 0.82rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .passenger-card-eyebrow {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 0.2rem;
        }

        .passenger-card-title {
          font-size: 1rem;
          line-height: 1.25;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.15rem;
        }

        .passenger-card-copy {
          font-size: 0.84rem;
          line-height: 1.4;
          color: #64748b;
        }

        .passenger-validation-error {
          margin-top: 0.32rem;
          font-size: 0.8rem;
          line-height: 1.35;
          color: #b91c1c;
          font-weight: 600;
        }

        .passenger-selection-hint {
          margin-top: -0.15rem;
          margin-bottom: 0.45rem;
          font-size: 0.78rem;
          line-height: 1.35;
          color: #64748b;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def passenger_destination() -> str:
    return (st.session_state.get("passenger_destination", "") or "").strip()


def adjust_passenger_counter(key: str, delta: int, minimum: int, maximum: int) -> None:
    current = int(st.session_state.get(key, minimum))
    st.session_state[key] = max(minimum, min(maximum, current + delta))


def set_passenger_step(step: str) -> None:
    st.session_state.passenger_step = step


def set_passenger_destination() -> None:
    st.session_state.passenger_destination = (
        st.session_state.get("passenger_destination_input", "") or ""
    ).strip()


def set_passenger_ride(ride_id: str) -> None:
    st.session_state.passenger_selected_ride = ride_id


def set_passenger_payment(payment_id: str) -> None:
    st.session_state.passenger_payment = payment_id


def passenger_confirm_errors() -> list[str]:
    errors: list[str] = []
    if not passenger_destination():
        errors.append("Please enter your destination")
    if int(st.session_state.get("passenger_count", 1)) < 1:
        errors.append("At least 1 passenger is required")
    return errors


def ensure_destination_input_state() -> None:
    if (
        not st.session_state.get("passenger_destination_input")
        and st.session_state.get("passenger_destination")
    ):
        st.session_state.passenger_destination_input = st.session_state.passenger_destination


def confirm_passenger_pickup() -> None:
    set_passenger_destination()
    st.session_state.passenger_step = "carType"


def render_passenger_home_header() -> None:
    left, middle, right = st.columns([1.15, 3.7, 1.15], gap="small")
    with left:
        st.write("")
    with middle:
        st.markdown("<div class='passenger-brand-title'>Hello Ride</div>", unsafe_allow_html=True)
    with right:
        st.markdown("<div class='passenger-avatar' style='margin-left:auto;'>NT</div>", unsafe_allow_html=True)


def render_passenger_step_header(
    title: str,
    back_target: str | None = None,
    back_label: str = "Back",
    show_avatar: bool = False,
    right_label: str = "",
    key_prefix: str = "passenger",
) -> None:
    left, middle, right = st.columns([1.15, 3.7, 1.15], gap="small")
    with left:
        if back_target:
            st.button(
                back_label,
                key=f"{key_prefix}_back",
                type="tertiary",
                width="stretch",
                on_click=set_passenger_step,
                args=(back_target,),
            )
    with middle:
        st.markdown(f"<div class='passenger-brand-title'>{escape(title)}</div>", unsafe_allow_html=True)
    with right:
        if show_avatar:
            st.markdown("<div class='passenger-avatar' style='margin-left:auto;'>NT</div>", unsafe_allow_html=True)
        elif right_label:
            st.caption(right_label)


def render_passenger_route_summary(
    pickup: str,
    pickup_sublabel: str,
    destination: str,
    destination_sublabel: str = "",
) -> None:
    with st.container(border=True):
        first_cols = st.columns([0.22, 4.78], gap="small")
        with first_cols[0]:
            st.markdown("●")
            st.caption("│")
        with first_cols[1]:
            st.caption("Pickup")
            st.markdown(f"**{escape(pickup)}**")
            if pickup_sublabel:
                st.caption(pickup_sublabel)

        second_cols = st.columns([0.22, 4.78], gap="small")
        with second_cols[0]:
            st.markdown("■")
        with second_cols[1]:
            st.caption("Destination")
            st.markdown(f"**{escape(destination)}**")
            if destination_sublabel:
                st.caption(destination_sublabel)


def render_passenger_counter_card(label: str, subtitle: str, key: str, minimum: int, maximum: int) -> None:
    st.markdown(
        f"""
        <div class="passenger-counter-card">
          <div class="passenger-counter-label">{escape(label)}</div>
          <div class="passenger-counter-subtitle">{escape(subtitle)}</div>
          <div class="passenger-counter-value">{st.session_state[key]}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    action_cols = st.columns([1, 1], gap="small")
    with action_cols[0]:
        st.button(
            "−",
            key=f"{key}_decrement",
            width="stretch",
            on_click=adjust_passenger_counter,
            args=(key, -1, minimum, maximum),
        )
    with action_cols[1]:
        st.button(
            "+",
            key=f"{key}_increment",
            width="stretch",
            on_click=adjust_passenger_counter,
            args=(key, 1, minimum, maximum),
        )


def render_ride_configuration() -> None:
    with st.container(border=True):
        render_section_heading("Trip details", "Configure your ride")
        metric_cols = st.columns(2, gap="medium")
        with metric_cols[0]:
            render_passenger_counter_card(
                "Passengers",
                "How many travelers are riding",
                "passenger_count",
                minimum=1,
                maximum=10,
            )
        with metric_cols[1]:
            render_passenger_counter_card(
                "Luggage",
                "Bags or suitcases to carry",
                "passenger_luggage",
                minimum=0,
                maximum=8,
            )
        st.markdown(
            '<div class="passenger-counter-note">Adjust the party size and luggage count before confirming your airport pickup.</div>',
            unsafe_allow_html=True,
        )


def parsed_ride_details(description: str) -> tuple[str, str]:
    if "·" in description:
        descriptor, eta = [part.strip() for part in description.split("·", 1)]
        return descriptor, eta
    return description, ""


def render_passenger_route_card(destination: str) -> None:
    with st.container(border=True):
        st.caption("Current Journey")
        render_passenger_route_summary(
            pickup=PASSENGER_EXPERIENCE["route"]["pickup"],
            pickup_sublabel="Suntec Convention Centre, Lobby A",
            destination=destination or "Enter destination",
        )


def render_passenger_ride_options(ride_options: list[dict]) -> None:
    render_section_heading("Select ride", "Estimated arrival: 4 mins")
    st.markdown(
        "<div class='passenger-selection-hint'>Tap one option to select your ride.</div>",
        unsafe_allow_html=True,
    )
    for ride in ride_options:
        descriptor, eta = parsed_ride_details(ride["description"])
        is_selected = st.session_state.passenger_selected_ride == ride["id"]
        eta_line = f"ETA {eta}" if eta else ""
        detail_line = f"{descriptor} · {eta_line}" if eta_line else descriptor
        selected_prefix = "✓ " if is_selected else ""
        unavailable_suffix = " · Unavailable" if not ride["isEligible"] else ""
        label = (
            f"{selected_prefix}**{ride['label']}**  \n"
            f"{detail_line}  \n"
            f"**{ride['price']}**{unavailable_suffix}"
        )

        st.button(
            label,
            key=f"ride_select_{ride['id']}",
            width="stretch",
            type="primary" if is_selected else "secondary",
            disabled=not ride["isEligible"],
            on_click=set_passenger_ride,
            args=(ride["id"],),
        )
        if not ride["isEligible"]:
            st.caption(ride["reason"])


def render_passenger_payment_options() -> None:
    render_section_heading("Payment", "Choose how to pay")
    st.markdown(
        "<div class='passenger-selection-hint'>Choose one payment method for this booking.</div>",
        unsafe_allow_html=True,
    )
    for payment in PAYMENT_OPTIONS:
        is_selected = st.session_state.passenger_payment == payment["id"]
        selected_prefix = "✓ " if is_selected else ""
        label = f"{selected_prefix}**{payment['label']}**  \n{payment['detail']}  \n{payment['value']}"
        st.button(
            label,
            key=f"payment_select_{payment['id']}",
            width="stretch",
            type="primary" if is_selected else "secondary",
            on_click=set_passenger_payment,
            args=(payment["id"],),
        )


def evaluated_ride_options() -> list[dict]:
    rides = []
    for ride in PASSENGER_EXPERIENCE["rides"]:
        is_eligible = (
            st.session_state.passenger_count <= ride["maxPassengers"]
            and st.session_state.passenger_luggage <= ride["maxLuggage"]
        )
        rides.append(
            {
                **ride,
                "isEligible": is_eligible,
                "reason": ""
                if is_eligible
                else f"Supports up to {ride['maxPassengers']} passengers and {ride['maxLuggage']} luggage",
            }
        )
    return rides


def selected_ride() -> dict | None:
    return next(
        (
            ride
            for ride in evaluated_ride_options()
            if ride["id"] == st.session_state.passenger_selected_ride
        ),
        None,
    )


def selected_payment() -> dict | None:
    return next(
        (
            payment
            for payment in PAYMENT_OPTIONS
            if payment["id"] == st.session_state.passenger_payment
        ),
        None,
    )


def render_passenger_home() -> None:
    render_passenger_home_header()
    ensure_destination_input_state()
    st.text_input(
        "Destination",
        key="passenger_destination_input",
        on_change=set_passenger_destination,
    )
    set_passenger_destination()
    destination = passenger_destination()
    if not destination:
        st.markdown(
            "<div class='passenger-validation-error'>Please enter your destination</div>",
            unsafe_allow_html=True,
        )
    render_passenger_route_summary(
        pickup=PASSENGER_EXPERIENCE["route"]["pickup"],
        pickup_sublabel="Suntec Convention Centre, Lobby A",
        destination=destination or "Enter destination",
    )
    render_ride_configuration()
    if int(st.session_state.get("passenger_count", 1)) < 1:
        st.markdown(
            "<div class='passenger-validation-error'>At least 1 passenger is required</div>",
            unsafe_allow_html=True,
        )
    st.toggle("Special Assistance", key="passenger_special_assistance")
    st.text_area(
        "Additional Notes",
        key="passenger_notes",
        placeholder="e.g. In front of the building",
    )
    confirm_errors = passenger_confirm_errors()
    st.button(
        "Confirm Pick-up",
        key="confirm_pickup",
        width="stretch",
        type="primary",
        disabled=bool(confirm_errors),
        on_click=confirm_passenger_pickup,
    )


def render_passenger_car_type() -> None:
    render_passenger_step_header(
        "Hello Ride",
        back_target="home",
        back_label="Back",
        key_prefix="passenger_car_type",
    )
    destination = passenger_destination()
    render_passenger_route_card(destination)
    ride_options = evaluated_ride_options()
    if st.session_state.passenger_selected_ride:
        chosen = selected_ride()
        if not chosen or not chosen["isEligible"]:
            st.session_state.passenger_selected_ride = ""

    render_passenger_ride_options(ride_options)
    render_passenger_payment_options()

    ride = selected_ride()
    payment = selected_payment()
    can_book = bool(passenger_destination() and ride and ride["isEligible"] and payment)
    st.button(
        "Book ride",
        key="passenger_book_selected_ride",
        width="stretch",
        type="primary",
        disabled=not can_book,
        on_click=set_passenger_step,
        args=("ride",),
    )


def render_passenger_ride() -> None:
    render_passenger_step_header(
        "Hello Ride",
        back_target="carType",
        back_label="Back",
        show_avatar=True,
        key_prefix="passenger_ride",
    )
    ride = selected_ride() or PASSENGER_EXPERIENCE["rides"][0]
    payment = selected_payment() or PAYMENT_OPTIONS[0]
    destination = passenger_destination() or PASSENGER_EXPERIENCE["route"]["dropoff"]
    pickup = PASSENGER_EXPERIENCE["route"]["pickup"]
    driver = PASSENGER_EXPERIENCE["tracking"]["driver"]

    with st.container(border=True):
        st.caption("Trip complete")
        st.markdown(f"## Arrived at {destination}")
        top_cols = st.columns([3.3, 1.2], gap="small")
        with top_cols[0]:
            st.markdown(f"**{pickup} -> {destination}**")
            st.caption(f"Driver {driver}")
        with top_cols[1]:
            st.caption("Fare")
            st.markdown(f"**{ride['price']}**")

    with st.container(border=True):
        st.markdown("**Trip summary**")
        route_cols = st.columns([1.05, 2.95], gap="small")
        with route_cols[0]:
            st.caption("Route")
        with route_cols[1]:
            st.markdown(f"**{pickup} -> {destination}**")

        party_cols = st.columns([1.05, 2.95], gap="small")
        with party_cols[0]:
            st.caption("Party")
        with party_cols[1]:
            st.markdown(f"**{st.session_state.passenger_count} passengers · {st.session_state.passenger_luggage} luggage**")

        ride_cols = st.columns([1.05, 2.95], gap="small")
        with ride_cols[0]:
            st.caption("Ride")
        with ride_cols[1]:
            st.markdown(f"**{ride['label']}**")
            descriptor, eta = parsed_ride_details(ride["description"])
            detail_line = descriptor if not eta else f"{descriptor} · ETA {eta}"
            st.caption(detail_line)

        if st.session_state.passenger_special_assistance:
            assist_cols = st.columns([1.05, 2.95], gap="small")
            with assist_cols[0]:
                st.caption("Support")
            with assist_cols[1]:
                st.markdown("**Special assistance requested**")

    with st.container(border=True):
        st.markdown("**Payment**")
        payment_cols = st.columns([1.05, 2.95], gap="small")
        with payment_cols[0]:
            st.caption("Method")
        with payment_cols[1]:
            st.markdown(f"**{payment['label']}**")
            st.caption(payment["detail"])

        total_cols = st.columns([1.05, 2.95], gap="small")
        with total_cols[0]:
            st.caption("Total")
        with total_cols[1]:
            st.markdown(f"**{ride['price']}**")

        if st.session_state.passenger_notes:
            note_cols = st.columns([1.05, 2.95], gap="small")
            with note_cols[0]:
                st.caption("Notes")
            with note_cols[1]:
                st.caption(st.session_state.passenger_notes)

        st.button(
            "Done",
            key="passenger_done",
            width="stretch",
            type="primary",
            on_click=reset_passenger_flow,
        )


def render_passenger_review() -> None:
    render_passenger_step_header(
        "How was your ride?",
        back_target="ride",
        back_label="Close",
        right_label="Hello Ride",
        key_prefix="passenger_review",
    )
    if st.session_state.passenger_review_submitted:
        render_info_card(
            eyebrow="Review submitted!",
            title="Thanks for your feedback",
            body=f"Thank you for your feedback, {PASSENGER_EXPERIENCE['tracking']['driver'].split(' ')[0]}.",
            tone="passenger-soft",
        )
        if st.button("Back to Home", width="stretch"):
            reset_passenger_flow()
        return

    render_info_card(
        eyebrow="Driver",
        title=PASSENGER_EXPERIENCE["tracking"]["driver"],
        body=f"{PASSENGER_EXPERIENCE['tracking']['vehicle']} · {PASSENGER_EXPERIENCE['tracking']['plate']}",
        tone="passenger-soft",
    )
    render_section_heading("Tap to rate", "Choose a star rating")
    rating_cols = st.columns(5, gap="small")
    for rating, column in enumerate(rating_cols, start=1):
        with column:
            selected = rating <= st.session_state.passenger_rating
            if st.button(
                f"{rating}★",
                key=f"rating_{rating}",
                width="stretch",
                type="primary" if selected else "secondary",
            ):
                st.session_state.passenger_rating = rating
    render_section_heading("Add a tip", f"Optional tip for {PASSENGER_EXPERIENCE['tracking']['driver'].split(' ')[0]}")
    tip_cols = st.columns(len(TIP_OPTIONS), gap="small")
    for tip, column in zip(TIP_OPTIONS, tip_cols):
        with column:
            if st.button(
                tip,
                key=f"tip_{tip}",
                width="stretch",
                type="primary" if st.session_state.passenger_tip == tip else "secondary",
            ):
                st.session_state.passenger_tip = tip
    st.text_area(
        "Leave a comment",
        key="passenger_comment",
        placeholder="Share your experience (e.g. 'Great driver, clean car!')",
    )
    if st.button("Submit Review", width="stretch"):
        st.session_state.passenger_review_submitted = True


SCREEN_MAP = {
    "home": render_passenger_home,
    "carType": render_passenger_car_type,
    "ride": render_passenger_ride,
    "review": render_passenger_review,
}


initialize_state()
apply_global_styles()
apply_passenger_styles()
render_sidebar(active="passenger")

left, middle, right = st.columns([1, 1.2, 1], gap="large")
with middle:
    SCREEN_MAP[st.session_state.passenger_step]()
