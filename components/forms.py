import streamlit as st


def render_step_counter(label: str, key: str, minimum: int, maximum: int) -> None:
    cols = st.columns([1, 1.2, 1], gap="small")
    with cols[0]:
        if st.button("−", key=f"{key}_decrement", width="stretch"):
            st.session_state[key] = max(minimum, st.session_state[key] - 1)
    with cols[1]:
        st.markdown(
            f"""
            <div class="hr-counter">
              <div class="hr-eyebrow">{label}</div>
              <div class="hr-counter-value">{st.session_state[key]}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with cols[2]:
        if st.button("+", key=f"{key}_increment", width="stretch"):
            st.session_state[key] = min(maximum, st.session_state[key] + 1)


def render_option_cards(
    options: list[dict],
    selected_key: str,
    label_key: str,
    detail_key: str,
    value_key: str,
    disabled_key: str,
    disabled_inverted: bool = False,
) -> None:
    for option in options:
        enabled = option[disabled_key]
        if disabled_inverted:
            enabled = not enabled
        state_label = "Selected" if st.session_state[selected_key] == option["id"] else "Unavailable" if enabled else "Select"
        st.markdown(
            f"""
            <div class="hr-card {'hr-card-passenger-soft' if st.session_state[selected_key] == option['id'] else 'hr-card-neutral'}">
              <div class="hr-card-row">
                <div>
                  <div class="hr-card-title">{option[label_key]}</div>
                  <div class="hr-copy">{option[detail_key]}</div>
                  {f"<div class='hr-copy hr-danger-copy'>{option['reason']}</div>" if option.get('reason') else ""}
                </div>
                <div class="hr-metric-value hr-inline-value">{option[value_key]}</div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if st.button(
            state_label,
            key=f"{selected_key}_{option['id']}",
            width="stretch",
            disabled=enabled or st.session_state[selected_key] == option["id"],
        ):
            st.session_state[selected_key] = option["id"]
