import altair as alt
import pandas as pd
import streamlit as st
from datetime import datetime
from html import escape

from components.cards import render_alert_card, render_info_card, render_metric_card
from components.header import render_page_header, render_section_heading
from components.navigation import render_sidebar
from components.status_blocks import render_pwt_gauge
from data.mock_ops import get_ops_experience
from utils.state import initialize_state
from utils.styles import apply_global_styles


st.set_page_config(
    page_title="Hello Ride | OPS",
    page_icon="H",
    layout="wide",
    initial_sidebar_state="expanded",
)


def apply_ops_typography_styles() -> None:
    st.markdown(
        """
        <style>
        .ops-section-eyebrow {
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #64748b;
          line-height: 1.2;
          margin-bottom: 0.35rem;
        }

        .ops-section-title {
          font-size: 1.02rem;
          font-weight: 700;
          line-height: 1.3;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin-bottom: 0;
          text-wrap: balance;
        }

        .ops-item-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.24rem 0.52rem;
          border-radius: 999px;
          background: #eef3ff;
          font-size: 0.62rem;
          font-weight: 700;
          color: #4b6487;
          text-align: center;
          line-height: 1;
          white-space: nowrap;
          letter-spacing: 0.03em;
        }

        .ops-control-shell {
          padding: 0.15rem 0.1rem 0;
        }

        .ops-control-note {
          font-size: 0.76rem;
          color: #64748b;
          line-height: 1.4;
          margin-top: 0.2rem;
        }

        .ops-card-title {
          font-size: 0.93rem;
          font-weight: 600;
          line-height: 1.34;
          letter-spacing: -0.01em;
          color: #0f172a;
          margin-bottom: 0.16rem;
        }

        .ops-card-subtitle {
          font-size: 0.78rem;
          font-weight: 400;
          line-height: 1.45;
          color: #64748b;
        }

        .ops-card-caption {
          font-size: 0.58rem;
          font-weight: 600;
          line-height: 1.2;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          text-align: right;
          white-space: nowrap;
          margin-bottom: 0.24rem;
        }

        .ops-card-value {
          font-size: 1.02rem;
          font-weight: 700;
          line-height: 1.18;
          letter-spacing: -0.01em;
          color: #0f172a;
          text-align: right;
          white-space: nowrap;
        }

        .ops-card-value-compact {
          font-size: 0.94rem;
          line-height: 1.14;
        }

        .ops-card-caption-soft {
          font-size: 0.56rem;
          letter-spacing: 0.02em;
        }

        .ops-section-shell {
          padding: 0.08rem;
        }

        .ops-section-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: start;
          gap: 0.7rem;
          padding: 0.12rem 0.18rem 0.95rem;
        }

        .ops-section-head-main {
          min-width: 0;
          max-width: 18.2rem;
        }

        .ops-section-head-side {
          align-self: start;
          justify-self: end;
          padding-top: 0.04rem;
        }

        .ops-list-stack {
          display: flex;
          flex-direction: column;
          gap: 0.78rem;
        }

        .ops-list-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 7.35rem;
          align-items: start;
          gap: 0.9rem;
          padding: 0.96rem 1.02rem;
          border: 1px solid #dfe8f2;
          border-radius: 1rem;
          background: #ffffff;
        }

        .ops-card-main {
          min-width: 0;
          padding-right: 0.08rem;
        }

        .ops-card-side {
          width: 7.35rem;
          text-align: right;
          padding-right: 0.08rem;
          padding-top: 0.06rem;
        }

        .ops-card-main .ops-card-title,
        .ops-card-main .ops-card-subtitle {
          overflow-wrap: anywhere;
        }

        .ops-context-card {
          padding: 0.25rem 0 0.1rem;
        }

        .ops-context-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #64748b;
          line-height: 1.2;
        }

        .ops-context-value {
          font-size: 1.1rem;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin-top: 0.22rem;
          white-space: nowrap;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def build_forecast_chart(series: list[dict], critical_window: dict) -> alt.Chart:
    frame = pd.DataFrame(series)
    melted = frame.melt("time", var_name="metric", value_name="count")
    time_order = list(frame["time"])

    critical_window_frame = pd.DataFrame(
        [{"start": critical_window["start"], "end": critical_window["end"], "label": "Critical deficit window"}]
    )

    times_before = [t for t in time_order if t < critical_window["start"]]
    times_during = [t for t in time_order if critical_window["start"] <= t <= critical_window["end"]]
    times_after = [t for t in time_order if t > critical_window["end"]]

    def mid_slot(slots: list[str]) -> str | None:
        return slots[len(slots) // 2] if slots else None

    y_max = max(p["demand"] for p in series) if series else 100
    label_y = y_max * 1.12

    base = alt.Chart(melted).encode(
        x=alt.X("time:N", title="", sort=time_order),
        y=alt.Y("count:Q", title="Forecast riders / taxis"),
        color=alt.Color(
            "metric:N",
            title="",
            scale=alt.Scale(
                domain=["demand", "supply"],
                range=["#154AA8", "#CBD5E1"],
            ),
        ),
    )

    lines = base.mark_line(point=True, strokeWidth=4).properties(height=280)
    deficit_band = (
        alt.Chart(critical_window_frame)
        .mark_rect(opacity=0.12, color="#A51C30")
        .encode(x="start:N", x2="end:N")
    )

    phase_layers = []
    for slot, text, color in [
        (mid_slot(times_before), "Rising Demand", "#64748b"),
        (mid_slot(times_during), "Peak Arrival", "#A51C30"),
        (mid_slot(times_after), "Recovery", "#0c7d35"),
    ]:
        if slot:
            ann = pd.DataFrame([{"time": slot, "label": text, "y": label_y}])
            phase_layers.append(
                alt.Chart(ann)
                .mark_text(
                    color=color,
                    align="center",
                    baseline="bottom",
                    fontSize=11,
                    fontWeight=600,
                    dy=-4,
                )
                .encode(
                    x=alt.X("time:N", sort=time_order),
                    y=alt.Y("y:Q"),
                    text=alt.Text("label:N"),
                )
            )

    return alt.layer(deficit_band, lines, *phase_layers)


def with_fallback(items: list[dict], fallback: list[dict]) -> list[dict]:
    return items if items else fallback


def render_ops_detail_section(
    eyebrow: str,
    title: str,
    items: list[dict],
    fallback_items: list[dict],
    row_widths: tuple[float, float] = (3.9, 1.35),
    compact_metric: bool = False,
) -> None:
    resolved_items = with_fallback(items, fallback_items)

    with st.container(border=True):
        header_left, header_right = st.columns([6.3, 0.7], gap="small")
        with header_left:
            st.markdown(
                f"""
                <div class="ops-section-eyebrow">{escape(eyebrow.upper())}</div>
                <div class="ops-section-title">{escape(title)}</div>
                """,
                unsafe_allow_html=True,
            )
        with header_right:
            st.markdown(
                f'<div class="ops-item-count">{len(resolved_items)} items</div>',
                unsafe_allow_html=True,
            )

        for item in resolved_items:
            try:
                with st.container(border=True):
                    row_left, row_right = st.columns(list(row_widths), gap="medium")
                    with row_left:
                        st.markdown(
                            f'<div class="ops-card-title">{escape(str(item.get("title", "Untitled")))}</div>',
                            unsafe_allow_html=True,
                        )
                        if item.get("subtitle"):
                            st.markdown(
                                f'<div class="ops-card-subtitle">{escape(str(item["subtitle"]))}</div>',
                                unsafe_allow_html=True,
                            )
                    with row_right:
                        if item.get("caption"):
                            caption_class = "ops-card-caption ops-card-caption-soft" if compact_metric else "ops-card-caption"
                            st.markdown(
                                f'<div class="{caption_class}">{escape(str(item["caption"]))}</div>',
                                unsafe_allow_html=True,
                            )
                        value_class = "ops-card-value ops-card-value-compact" if compact_metric else "ops-card-value"
                        st.markdown(
                            f'<div class="{value_class}">{escape(str(item.get("value", "-")))}</div>',
                            unsafe_allow_html=True,
                        )
            except Exception:
                with st.container(border=True):
                    st.write(item.get("title", "Untitled"))
                    if item.get("subtitle"):
                        st.caption(item["subtitle"])
                    label = f"{item.get('caption', '')} " if item.get("caption") else ""
                    st.write(f"{label}{item.get('value', '-')}")


def ensure_ops_ai_state() -> None:
    if "ops_ai_chat_history" not in st.session_state:
        st.session_state.ops_ai_chat_history = [
            {
                "role": "assistant",
                "content": "Hello Ride AI Advisory is ready. Ask about deficit risk, arrival waves, capacity actions, or the next 15 minutes of ops decisions.",
            }
        ]


def add_ai_message(user_message: str, ops_view: dict) -> None:
    st.session_state.ops_ai_chat_history.append({"role": "user", "content": user_message})
    st.session_state.ops_ai_chat_history.append(
        {
            "role": "assistant",
            "content": get_mock_advisory_response(
                user_message=user_message,
                terminal_context=st.session_state.ops_terminal,
                ops_metrics=ops_view,
            ),
        }
    )


def get_mock_advisory_response(user_message: str, terminal_context: str, ops_metrics: dict) -> str:
    prompt = user_message.lower()
    top_flight = max(ops_metrics["flights"], key=lambda item: item["demand"]) if ops_metrics["flights"] else None
    peak_slot = max(ops_metrics["forecast"], key=lambda item: item["demand"] - item["supply"]) if ops_metrics["forecast"] else None
    deficit_gap = peak_slot["demand"] - peak_slot["supply"] if peak_slot else 0

    if "causing the projected deficit" in prompt or "arrival wave risk" in prompt:
        if top_flight and peak_slot:
            return (
                f"{terminal_context} is under pressure because demand peaks around {peak_slot['time']}, where forecast demand exceeds supply by about {deficit_gap}. "
                f"The largest arrival driver is {top_flight['code']} from {top_flight['origin']} with {top_flight['demand']} forecast passengers, and current PWT is {ops_metrics['pwt']} minutes."
            )

    if "overflow capacity" in prompt or "activate overflow" in prompt:
        if ops_metrics["pwt"] > st.session_state.ops_guardrail_min or ops_metrics["projectedDeficit"] >= 25:
            return (
                f"Yes for {terminal_context}: projected deficit is {ops_metrics['projectedDeficit']}% and PWT is {ops_metrics['pwt']} minutes, above the {st.session_state.ops_guardrail_min}-minute guardrail. "
                "Ops should prepare overflow handling now and pair it with an immediate driver broadcast."
            )
        return (
            f"Not yet for {terminal_context}. PWT is {ops_metrics['pwt']} minutes and projected deficit is {ops_metrics['projectedDeficit']}%, so I would hold overflow capacity in reserve and keep monitoring the next arrival pulse."
        )

    if "summarize terminal 1 status" in prompt or "summarize" in prompt:
        return (
            f"{terminal_context} summary: PWT is {ops_metrics['pwt']} minutes, projected deficit is {ops_metrics['projectedDeficit']}%, waiting passengers are {ops_metrics['waitingPassengers']}, and holding taxis are {ops_metrics['holdingTaxis']}. "
            f"Lane load is {ops_metrics['laneLoad']}% and fleet readiness is {ops_metrics['fleetReadiness']}%."
        )

    if "next 15 minutes" in prompt:
        return (
            f"For the next 15 minutes in {terminal_context}, focus on three actions: keep driver messaging active, protect holding supply around the {ops_metrics['criticalWindow']['start']} to {ops_metrics['criticalWindow']['end']} risk window, and watch whether waiting passengers stay above {ops_metrics['waitingPassengers']} with no improvement in PWT."
        )

    if "drivers sufficient" in prompt or "drivers" in prompt:
        sufficiency = "not sufficient" if ops_metrics["holdingTaxis"] < ops_metrics["waitingPassengers"] else "currently sufficient"
        return (
            f"Driver supply in {terminal_context} is {sufficiency}. There are {ops_metrics['holdingTaxis']} holding taxis against {ops_metrics['waitingPassengers']} waiting passengers, and the projected deficit is {ops_metrics['projectedDeficit']}%."
        )

    return (
        f"For {terminal_context}, the live picture is PWT {ops_metrics['pwt']} minutes, projected deficit {ops_metrics['projectedDeficit']}%, waiting passengers {ops_metrics['waitingPassengers']}, and holding taxis {ops_metrics['holdingTaxis']}. "
        "I can help explain risk, recommend next actions, or summarize terminal status."
    )


def render_ai_context_summary(ops_view: dict) -> None:
    with st.container(border=True):
        st.markdown("#### Advisory context")
        st.caption("Live OPS context used by the assistant")
        metric_cols = st.columns(5, gap="small")
        metrics = [
            ("Current terminal", st.session_state.ops_terminal),
            ("PWT", f"{ops_view['pwt']} min"),
            ("Projected deficit", f"{ops_view['projectedDeficit']}%"),
            ("Waiting pax", str(ops_view["waitingPassengers"])),
            ("Holding taxis", str(ops_view["holdingTaxis"])),
        ]
        for column, (label, value) in zip(metric_cols, metrics):
            with column:
                st.markdown(
                    f"""
                    <div class="ops-context-card">
                      <div class="ops-context-label">{label}</div>
                      <div class="ops-context-value">{value}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )


def render_ai_advisory(ops_view: dict) -> None:
    ensure_ops_ai_state()
    render_ai_context_summary(ops_view)

    with st.container(border=True):
        st.caption("Quick prompts")
        prompt_rows = [
            [
                "What is causing the projected deficit?",
                "Should we activate overflow capacity now?",
                "Summarize Terminal 1 status",
            ],
            [
                "What should ops do in the next 15 minutes?",
                "Explain the arrival wave risk",
                "Are drivers sufficient for current demand?",
            ],
        ]
        for row in prompt_rows:
            prompt_cols = st.columns(3, gap="small")
            for column, prompt in zip(prompt_cols, row):
                with column:
                    if st.button(prompt, width="stretch", key=f"ops_prompt_{prompt}"):
                        add_ai_message(prompt, ops_view)

    with st.container(border=True):
        st.caption("Advisory chat")
        for message in st.session_state.ops_ai_chat_history:
            with st.chat_message(message["role"]):
                st.write(message["content"])

        with st.form("ops_ai_chat_form", clear_on_submit=True):
            user_question = st.text_input(
                "Ask the assistant",
                placeholder="Ask about deficits, arrivals, supply, or next actions",
                label_visibility="collapsed",
            )
            submitted = st.form_submit_button("Send", width="stretch")

        if submitted and user_question.strip():
            add_ai_message(user_question.strip(), ops_view)
            st.rerun()


def render_critical_alert(ops_view: dict) -> None:
    if ops_view["pwt"] <= st.session_state.ops_guardrail_min:
        return
    render_alert_card(
        title=f"PWT Critical — {ops_view['pwt']} min (guardrail: {st.session_state.ops_guardrail_min} min)",
        body=(
            f"Arrival wave projected in T-15 minutes. Predicted passenger influx will "
            f"exceed current lane capacity by {ops_view['projectedDeficit']}%. "
            f"Critical window: {ops_view['criticalWindow']['start']} – {ops_view['criticalWindow']['end']}."
        ),
        advisory=ops_view["aiAdvice"],
    )


def render_ai_advisory_card(ops_view: dict) -> None:
    render_section_heading("AI Advisory", "Recommended Action")
    render_info_card(
        eyebrow=f"AI Advisory · {ops_view['title']}",
        title="Recommended next action",
        body=ops_view["aiAdvice"],
        tone="ops",
    )


def render_deficit_breakdown(ops_view: dict) -> None:
    breakdown = ops_view.get("deficitBreakdown", [])
    if not breakdown:
        return
    render_section_heading("Deficit Breakdown", "Why is there a projected gap?")
    demand_factors = [f for f in breakdown if f["type"] == "demand"]
    supply_factors = [f for f in breakdown if f["type"] == "supply"]
    with st.container(border=True):
        left_col, right_col = st.columns(2, gap="medium")
        with left_col:
            st.markdown('<div class="ops-section-eyebrow">DEMAND PRESSURE</div>', unsafe_allow_html=True)
            for item in demand_factors:
                st.markdown(
                    f'<div class="ops-list-card">'
                    f'<div class="ops-card-main"><div class="ops-card-title">{escape(item["factor"])}</div></div>'
                    f'<div class="ops-card-side">'
                    f'<div class="ops-card-caption">forecast pax</div>'
                    f'<div class="ops-card-value" style="color:#0c7d35;">&#8593; +{item["impact"]}</div>'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )
        with right_col:
            st.markdown('<div class="ops-section-eyebrow">SUPPLY CONSTRAINTS</div>', unsafe_allow_html=True)
            for item in supply_factors:
                st.markdown(
                    f'<div class="ops-list-card">'
                    f'<div class="ops-card-main"><div class="ops-card-title">{escape(item["factor"])}</div></div>'
                    f'<div class="ops-card-side">'
                    f'<div class="ops-card-caption">taxis short</div>'
                    f'<div class="ops-card-value" style="color:#b91c1c;">&#8595; -{abs(item["impact"])}</div>'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )


def render_impact_simulation(ops_view: dict) -> None:
    sim = ops_view.get("impactSimulation")
    if not sim:
        return
    render_section_heading("Impact Simulation", "If we act now — projected outcome")
    with st.container(border=True):
        st.markdown(
            f'<div class="ops-section-eyebrow">RECOMMENDED ACTION</div>'
            f'<div class="ops-section-title">{escape(sim["action"])}</div>',
            unsafe_allow_html=True,
        )
        st.markdown("<br>", unsafe_allow_html=True)
        before_col, arrow_col, after_col = st.columns([1, 0.18, 1], gap="small")
        with before_col:
            with st.container(border=True):
                st.markdown('<div class="ops-section-eyebrow">CURRENT STATE</div>', unsafe_allow_html=True)
                render_metric_card("PWT", f"{sim['current_pwt']} min", tone="danger")
                render_metric_card("Projected deficit", f"{sim['current_deficit']}%", tone="danger")
        with arrow_col:
            st.markdown(
                '<div style="text-align:center;font-size:1.4rem;padding-top:2.4rem;color:#64748b;">&#8594;</div>',
                unsafe_allow_html=True,
            )
        with after_col:
            with st.container(border=True):
                st.markdown('<div class="ops-section-eyebrow">AFTER ACTION</div>', unsafe_allow_html=True)
                render_metric_card("PWT", f"{sim['projected_pwt']} min", f"\u2212{sim['pwt_reduction_pct']}% reduction", tone="ops")
                render_metric_card("Projected deficit", f"{sim['projected_deficit']}%", f"\u2212{sim['queue_time_reduction']} min queue time", tone="ops")


def render_ops_control_actions() -> None:
    render_section_heading("OPS Control Actions", "Act now — these change live state")
    with st.container(border=True):
        st.markdown('<div class="ops-section-eyebrow">DISPATCH CONTROLS</div>', unsafe_allow_html=True)
        action_col1, action_col2, action_col3 = st.columns(3, gap="medium")

        with action_col1:
            with st.container(border=True):
                st.markdown(
                    '<div class="ops-card-title">Overflow Lane</div>'
                    '<div class="ops-card-subtitle">Activate high-capacity overflow routing for Terminal 1 pickup zone</div>',
                    unsafe_allow_html=True,
                )
                overflow_active = st.session_state.ops_extra_lane_active
                overflow_label = "Overflow Active \u2713" if overflow_active else "Activate Overflow Lane"
                overflow_type = "secondary" if overflow_active else "primary"
                if st.button(overflow_label, key="btn_overflow_lane", type=overflow_type, use_container_width=True):
                    st.session_state.ops_extra_lane_active = not overflow_active
                    st.rerun()

        with action_col2:
            with st.container(border=True):
                st.markdown(
                    '<div class="ops-card-title">Driver Broadcast</div>'
                    '<div class="ops-card-subtitle">Push a 6-minute head-start message to all holding and inbound drivers</div>',
                    unsafe_allow_html=True,
                )
                last_broadcast = st.session_state.ops_last_broadcast
                broadcast_label = f"Sent {last_broadcast} \u2713" if last_broadcast else "Broadcast to Drivers"
                broadcast_type = "secondary" if last_broadcast else "primary"
                if st.button(broadcast_label, key="btn_broadcast", type=broadcast_type, use_container_width=True):
                    st.session_state.ops_last_broadcast = datetime.now().strftime("%H:%M")
                    st.rerun()

        with action_col3:
            with st.container(border=True):
                st.markdown(
                    '<div class="ops-card-title">Lane 2</div>'
                    '<div class="ops-card-subtitle">Open secondary pickup lane to relieve primary lane congestion</div>',
                    unsafe_allow_html=True,
                )
                lane2_active = st.session_state.ops_lane2_active
                lane2_label = "Lane 2 Open \u2713" if lane2_active else "Open Lane 2"
                lane2_type = "secondary" if lane2_active else "primary"
                if st.button(lane2_label, key="btn_lane2", type=lane2_type, use_container_width=True):
                    st.session_state.ops_lane2_active = not lane2_active
                    st.rerun()


def render_live_monitoring(ops_view: dict) -> None:
    # Stage 1: Critical Alert (only when PWT exceeds guardrail)
    render_critical_alert(ops_view)

    # Stage 2: KPI Summary
    top_left, top_right = st.columns([2.6, 1], gap="large")
    with top_left:
        gauge_col, details_col = st.columns([1, 1.6], gap="large")
        with gauge_col:
            render_pwt_gauge(
                value=ops_view["pwt"],
                label="PWT",
                status="Critical delay"
                if ops_view["pwt"] > st.session_state.ops_guardrail_min
                else "Within guardrail",
            )
        with details_col:
            metric_cols = st.columns(2, gap="medium")
            with metric_cols[0]:
                render_metric_card(
                    "Waiting pax",
                    ops_view["waitingPassengers"],
                    ops_view["waitingTrend"],
                    tone="ops",
                )
            with metric_cols[1]:
                render_metric_card(
                    "Holding taxis",
                    ops_view["holdingTaxis"],
                    ops_view["taxiTrend"],
                )
            st.markdown(
                f'<div class="hr-card"><div class="hr-card-row"><div>'
                f'<div class="hr-eyebrow">Lane 1 high-capacity mode</div>'
                f'<div class="hr-copy">System load {ops_view["laneLoad"]}%</div>'
                f'</div></div></div>',
                unsafe_allow_html=True,
            )
            st.progress(ops_view["laneLoad"] / 100)
            tail_cols = st.columns(2, gap="medium")
            with tail_cols[0]:
                render_metric_card("Fleet readiness", f"{ops_view['fleetReadiness']}%")
            with tail_cols[1]:
                render_metric_card("Projected deficit", f"{ops_view['projectedDeficit']}%", tone="danger")

    with top_right:
        render_metric_card(
            "PWT guardrail",
            f"{st.session_state.ops_guardrail_min} min",
            f"{ops_view['title']} intervention threshold",
            tone="ops",
        )

    # Stage 3: AI Advisory
    render_ai_advisory_card(ops_view)

    # Stage 4: Deficit Breakdown — WHY
    render_deficit_breakdown(ops_view)

    # Stage 5: Impact Simulation — SO WHAT
    render_impact_simulation(ops_view)

    # Stage 6: OPS Control Actions — WHAT TO DO
    render_ops_control_actions()

    # Stage 7: Arrival Wave Chart (enhanced with phase labels)
    render_section_heading("Predictive forecast", "Arrival Wave Analysis")
    st.altair_chart(
        build_forecast_chart(ops_view["forecast"], ops_view["criticalWindow"]),
        use_container_width=True,
    )

    # Stage 8: Supporting data tables
    lower_cols = st.columns([1.06, 1.28, 1.06], gap="medium")
    with lower_cols[0]:
        render_ops_detail_section(
            eyebrow="Flight wave",
            title="Arrivals driving demand",
            items=[
                {
                    "title": f"{flight['code']} · {flight['origin']}",
                    "subtitle": f"{flight['status']} · {flight['terminal']} · ETA {flight['eta']}",
                    "value": str(flight["demand"]),
                    "caption": "forecast pax",
                }
                for flight in ops_view["flights"]
            ],
            fallback_items=[
                {
                    "title": "TG401 · Tokyo",
                    "subtitle": "Bags on belt · T1 · ETA 14:35",
                    "value": "84",
                    "caption": "forecast pax",
                }
            ],
        )
    with lower_cols[1]:
        render_ops_detail_section(
            eyebrow="Demand capture",
            title="QR scans in the last 20 minutes",
            items=[
                {
                    "title": signal["zone"],
                    "subtitle": signal["time"],
                    "value": f"{signal['parties']} parties",
                    "caption": f"{signal['luggage']} bags",
                }
                for signal in ops_view["demandSignals"]
            ],
            fallback_items=[
                {
                    "title": "Claim A",
                    "subtitle": "14:12",
                    "value": "4 parties",
                    "caption": "3 bags",
                }
            ],
            row_widths=(3.1, 1.9),
            compact_metric=True,
        )
    with lower_cols[2]:
        render_ops_detail_section(
            eyebrow="Supply telemetry",
            title="Driver response pulse",
            items=[
                {
                    "title": item["name"],
                    "subtitle": item["detail"],
                    "value": str(item["value"]),
                    "caption": "",
                }
                for item in ops_view["supply"]
            ],
            fallback_items=[
                {
                    "title": "Ready drivers",
                    "subtitle": "Holding lane and inbound availability",
                    "value": "128",
                    "caption": "",
                }
            ],
        )


initialize_state()
apply_global_styles()
apply_ops_typography_styles()
render_sidebar(active="ops")

if st.session_state.ops_terminal not in {"T1", "T2", "All"}:
    st.session_state.ops_terminal = "T1"

control_col, intro_col = st.columns([0.9, 4.2], gap="large")

with control_col:
    render_info_card(
        eyebrow=st.session_state.ops_terminal,
        title=get_ops_experience(st.session_state.ops_terminal)["title"],
        body="Terminal context stays visible here while live filters and workspace controls sit closer to the main dashboard area.",
        tone="neutral",
    )

ops_view = get_ops_experience(st.session_state.ops_terminal)

with intro_col:
    header_main, header_controls = st.columns([2.55, 1.45], gap="medium")
    with header_main:
        if st.session_state.ops_workspace == "AI Advisory":
            render_page_header(
                eyebrow="AI Advisory",
                title="Operations decision support",
                body=f"Ask the assistant about queue pressure, arrival-wave risk, supply sufficiency, and the next actions for {ops_view['title']}. Responses are grounded in the selected terminal context.",
            )
        else:
            render_page_header(
                eyebrow="Hello Ride Console",
                title="Suvarnabhumi Airport control tower",
                body=f"Recreated from the original ops dashboard with the same monitoring hierarchy: queue health first, then intervention controls, arrival wave analysis, and supply telemetry. Current view: {ops_view['title']}.",
            )
    with header_controls:
        with st.container(border=True):
            st.markdown('<div class="ops-control-shell">', unsafe_allow_html=True)
            st.caption("View controls")
            st.segmented_control(
                "Terminal view",
                options=["T1", "T2", "All"],
                key="ops_terminal",
                selection_mode="single",
            )
            st.radio(
                "Workspace",
                options=["Live Monitoring", "AI Advisory"],
                key="ops_workspace",
                label_visibility="collapsed",
            )
            st.markdown(
                '<div class="ops-control-note">Switch terminal context or move into AI Advisory without leaving the OPS surface.</div>',
                unsafe_allow_html=True,
            )
            st.markdown("</div>", unsafe_allow_html=True)

if st.session_state.ops_workspace == "AI Advisory":
    render_ai_advisory(ops_view)
else:
    render_live_monitoring(ops_view)
