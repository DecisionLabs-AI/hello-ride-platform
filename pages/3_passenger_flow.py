from html import escape
import json

import streamlit as st
import streamlit.components.v1 as components

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


PASSENGER_REQUEST_DRAFT_KEY = "passenger_request_draft"
DESTINATION_PRESETS = [
    "Sukhumvit",
    "Silom",
    "Siam",
    "Phaya Thai",
    "Chatuchak",
    "Don Mueang Airport",
    "ICONSIAM",
    "CentralWorld",
    "Victory Monument",
    "Asok",
    "Ekkamai",
    "Thonglor",
    "Rama 9",
    "Bang Na",
    "Ratchada",
    "Ari",
]
DESTINATION_PRESET_SET = set(DESTINATION_PRESETS)


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

        [data-testid="stTextInput"]:has(input[aria-label="Destination Mode"]) {
          display: none;
        }

        /* ── Mobile-first centering ─────────────────────────────────────── */
        [data-testid="stMainBlockContainer"].block-container {
          max-width: 420px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          padding-left: max(1rem, env(safe-area-inset-left)) !important;
          padding-right: max(1rem, env(safe-area-inset-right)) !important;
          padding-bottom: max(3rem, env(safe-area-inset-bottom)) !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        /* ── Touch-target upgrades ──────────────────────────────────────── */
        .stButton > button,
        [data-testid="stBaseButton-secondary"],
        [data-testid="stBaseButton-primary"] {
          min-height: 3.25rem !important;
          font-size: 0.97rem;
        }

        /* Counter +/- buttons inside passenger counter cards */
        [data-testid="stVerticalBlock"]:has(.passenger-counter-card) [data-testid="stHorizontalBlock"] .stButton > button {
          min-height: 3.5rem !important;
          font-size: 1.25rem !important;
          font-weight: 700;
        }

        /* Inputs: explicit height and readable font */
        .stTextInput input,
        .stTextArea textarea {
          min-height: 3rem !important;
          font-size: 1rem !important;
          padding-left: 0.9rem !important;
          padding-right: 0.9rem !important;
        }

        /* Toggle: wider tap zone */
        .stToggle {
          padding-top: 0.35rem;
          padding-bottom: 0.35rem;
        }

        /* Bordered containers: keep rounded-xl feel */
        [data-testid="stVerticalBlockBorderWrapper"] {
          border-radius: 1.35rem !important;
        }

        </style>
        """,
        unsafe_allow_html=True,
    )


def _coerce_passenger_int(value: object, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def _coerce_passenger_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def normalize_destination_value(value: object) -> dict[str, str] | None:
    if isinstance(value, dict):
        destination_value = str(value.get("value", value.get("label", "")) or "").strip()
        if not destination_value:
            return None
        raw_mode = str(value.get("mode", "") or "").strip()
        if not raw_mode:
            raw_mode = "selected" if destination_value in DESTINATION_PRESET_SET else "free_text"
        mode = "selected" if raw_mode == "selected" else "free_text"
        if mode == "selected" and destination_value not in DESTINATION_PRESET_SET:
            mode = "free_text"
        return {"mode": mode, "value": destination_value}

    destination_value = str(value or "").strip()
    if not destination_value:
        return None
    return {"mode": "free_text", "value": destination_value}


def passenger_destination_value() -> str:
    destination = normalize_destination_value(st.session_state.get("passenger_destination", ""))
    return destination["value"] if destination else ""


def passenger_destination_mode() -> str:
    destination = normalize_destination_value(st.session_state.get("passenger_destination", ""))
    return destination["mode"] if destination else "free_text"


def passenger_destination_is_valid() -> bool:
    destination = normalize_destination_value(st.session_state.get("passenger_destination", ""))
    if not destination:
        return False
    if destination["mode"] == "selected":
        return True
    return len(destination["value"]) >= 3


def build_passenger_request_draft() -> dict[str, object]:
    destination = normalize_destination_value(
        {
            "mode": st.session_state.get("passenger_destination_mode", "free_text"),
            "value": st.session_state.get("passenger_destination_input", ""),
        }
    )
    if not destination:
        destination = normalize_destination_value(st.session_state.get("passenger_destination", ""))
    return {
        "passenger_destination": destination or "",
        "passenger_destination_input": (
            destination["value"] if destination else str(st.session_state.get("passenger_destination_input", "") or "")
        ),
        "passenger_destination_mode": destination["mode"] if destination else "free_text",
        "passenger_count": _coerce_passenger_int(
            st.session_state.get("passenger_count", 1),
            default=1,
            minimum=1,
            maximum=10,
        ),
        "passenger_luggage": _coerce_passenger_int(
            st.session_state.get("passenger_luggage", 1),
            default=1,
            minimum=1,
            maximum=8,
        ),
        "passenger_special_assistance": _coerce_passenger_bool(
            st.session_state.get("passenger_special_assistance", False)
        ),
        "passenger_notes": str(st.session_state.get("passenger_notes", "") or ""),
    }


def apply_passenger_request_draft(draft: dict[str, object]) -> None:
    destination = normalize_destination_value(
        draft.get(
            "passenger_destination",
            {
                "mode": draft.get("passenger_destination_mode", "free_text"),
                "value": draft.get("passenger_destination_input", ""),
            },
        )
    )
    st.session_state.passenger_destination = destination or ""
    st.session_state.passenger_destination_input = destination["value"] if destination else ""
    st.session_state.passenger_destination_mode = (
        destination["mode"] if destination else "free_text"
    )
    st.session_state.passenger_count = _coerce_passenger_int(
        draft.get("passenger_count", 1),
        default=1,
        minimum=1,
        maximum=10,
    )
    st.session_state.passenger_luggage = _coerce_passenger_int(
        draft.get("passenger_luggage", 1),
        default=1,
        minimum=1,
        maximum=8,
    )
    st.session_state.passenger_special_assistance = _coerce_passenger_bool(
        draft.get("passenger_special_assistance", False)
    )
    st.session_state.passenger_notes = str(draft.get("passenger_notes", "") or "")


def get_query_param_value(key: str) -> str:
    query_params = getattr(st, "query_params", None)
    if query_params is not None:
        value = query_params.get(key, "")
        if isinstance(value, list):
            return str(value[0]) if value else ""
        return str(value or "")

    experimental_get_query_params = getattr(st, "experimental_get_query_params", None)
    if callable(experimental_get_query_params):
        value = experimental_get_query_params().get(key, [""])
        return str(value[0]) if value else ""

    return ""


def maybe_hydrate_passenger_request_draft() -> bool:
    if st.session_state.get("passenger_request_draft_query_checked", False):
        return False

    st.session_state.passenger_request_draft_query_checked = True
    raw_draft = get_query_param_value(PASSENGER_REQUEST_DRAFT_KEY)
    if not raw_draft:
        return False

    try:
        draft = json.loads(raw_draft)
    except json.JSONDecodeError:
        return False

    if not isinstance(draft, dict):
        return False

    apply_passenger_request_draft(draft)
    return True


def render_passenger_request_draft_bridge(prefer_stored_on_boot: bool) -> None:
    draft_json = json.dumps(build_passenger_request_draft(), separators=(",", ":"), sort_keys=True)
    components.html(
        f"""
        <script>
        (() => {{
          const storageKey = {json.dumps(PASSENGER_REQUEST_DRAFT_KEY)};
          const draftJson = {json.dumps(draft_json)};
          const preferStoredOnBoot = {json.dumps(prefer_stored_on_boot)};
          const topWindow = window.parent;

          const isValidDraft = (raw) => {{
            if (!raw) {{
              return false;
            }}
            try {{
              const parsed = JSON.parse(raw);
              return typeof parsed === "object" && parsed !== null;
            }} catch (error) {{
              return false;
            }}
          }};

          try {{
            const storedRaw = topWindow.localStorage.getItem(storageKey);
            const url = new URL(topWindow.location.href);
            const queryRaw = url.searchParams.get(storageKey);

            if (storedRaw && !isValidDraft(storedRaw)) {{
              topWindow.localStorage.removeItem(storageKey);
            }}

            if (preferStoredOnBoot && storedRaw && isValidDraft(storedRaw) && storedRaw !== queryRaw) {{
              url.searchParams.set(storageKey, storedRaw);
              topWindow.location.replace(url.toString());
              return;
            }}

            if (topWindow.localStorage.getItem(storageKey) !== draftJson) {{
              topWindow.localStorage.setItem(storageKey, draftJson);
            }}

            if (url.searchParams.get(storageKey) !== draftJson) {{
              url.searchParams.set(storageKey, draftJson);
              topWindow.history.replaceState({{}}, "", url.toString());
            }}
          }} catch (error) {{
            // Keep the Streamlit flow working even if browser storage is unavailable.
          }}
        }})();
        </script>
        """,
        height=0,
    )


def render_destination_autocomplete_bridge() -> None:
    components.html(
        f"""
        <script>
        (() => {{
          const topWindow = window.parent;
          const doc = topWindow.document;
          const presets = {json.dumps(DESTINATION_PRESETS)};
          const dropdownId = "passenger-destination-autocomplete";
          const inputLabel = "Destination";
          const modeLabel = "Destination Mode";
          const minimumLength = 3;

          const nativeSetter = Object.getOwnPropertyDescriptor(
            topWindow.HTMLInputElement.prototype,
            "value",
          )?.set;

          const setDomValue = (input, value) => {{
            if (!input || typeof nativeSetter !== "function") {{
              return;
            }}
            nativeSetter.call(input, value);
          }};

          const commitWidgetValue = (input, value) => {{
            if (!input || typeof nativeSetter !== "function") {{
              return;
            }}
            if (input.value !== value) {{
              nativeSetter.call(input, value);
            }}
            input.dispatchEvent(new Event("input", {{ bubbles: true }}));
            input.dispatchEvent(new Event("change", {{ bubbles: true }}));
          }};

          const findInput = (labelText) => {{
            const ariaMatch = doc.querySelector(`input[aria-label="${{labelText}}"]`);
            if (ariaMatch) {{
              return ariaMatch;
            }}
            const labels = Array.from(doc.querySelectorAll("label"));
            for (const label of labels) {{
              if (label.textContent.trim() !== labelText) {{
                continue;
              }}
              const inputId = label.getAttribute("for");
              if (inputId) {{
                const match = doc.getElementById(inputId);
                if (match) {{
                  return match;
                }}
              }}
            }}
            return null;
          }};

          const rankMatches = (term) => {{
            const query = term.trim().toLowerCase();
            if (!query) {{
              return [];
            }}
            return presets
              .filter((preset) => preset.toLowerCase().includes(query))
              .sort((left, right) => {{
                const leftStarts = left.toLowerCase().startsWith(query) ? 0 : 1;
                const rightStarts = right.toLowerCase().startsWith(query) ? 0 : 1;
                if (leftStarts !== rightStarts) {{
                  return leftStarts - rightStarts;
                }}
                return left.localeCompare(right);
              }})
              .slice(0, 8);
          }};

          const bind = (attempt = 0) => {{
            const input = findInput(inputLabel);
            const modeInput = findInput(modeLabel);
            if (!input || !modeInput) {{
              if (attempt < 20) {{
                topWindow.requestAnimationFrame(() => bind(attempt + 1));
              }}
              return;
            }}

            const textInputContainer = input.closest('[data-testid="stTextInput"]');
            const fieldWrapper = textInputContainer?.parentElement;
            const inputShell = textInputContainer?.querySelector('div[data-baseweb="input"]') || input.parentElement;
            if (!fieldWrapper || !inputShell) {{
              if (attempt < 20) {{
                topWindow.requestAnimationFrame(() => bind(attempt + 1));
              }}
              return;
            }}

            fieldWrapper.style.position = "relative";
            fieldWrapper.style.overflow = "visible";
            inputShell.style.position = "relative";
            inputShell.style.overflow = "visible";

            let dropdown = fieldWrapper.querySelector(`#${{dropdownId}}`);
            if (!dropdown) {{
              dropdown = doc.createElement("div");
              dropdown.id = dropdownId;
              dropdown.style.position = "absolute";
              dropdown.style.left = "0";
              dropdown.style.top = "calc(100% + 8px)";
              dropdown.style.width = "100%";
              dropdown.style.zIndex = "9999";
              dropdown.style.background = "#ffffff";
              dropdown.style.border = "1px solid rgba(217, 228, 238, 0.96)";
              dropdown.style.borderRadius = "1rem";
              dropdown.style.boxShadow = "0 18px 36px rgba(15, 23, 42, 0.12)";
              dropdown.style.padding = "0.35rem";
              dropdown.style.display = "none";
              dropdown.style.maxHeight = "16rem";
              dropdown.style.overflowY = "auto";
              dropdown.style.pointerEvents = "auto";
              fieldWrapper.appendChild(dropdown);
            }}

            let matches = [];
            let highlightedIndex = -1;
            let blurTimer = null;
            let isInteractingWithDropdown = false;

            const normalizedInputValue = () => (input.value || "").trim();

            if (!topWindow.__passengerDestEnterOnlyState) {{
              topWindow.__passengerDestEnterOnlyState = {{}};
            }}
            topWindow.__passengerDestEnterOnlyState.wrapper = fieldWrapper;
            topWindow.__passengerDestEnterOnlyState.closeDropdown = () => closeDropdown();

            const closeDropdown = () => {{
              isInteractingWithDropdown = false;
              dropdown.style.display = "none";
              dropdown.innerHTML = "";
              highlightedIndex = -1;
            }};

            const selectSuggestion = (match) => {{
              if (blurTimer) {{
                topWindow.clearTimeout(blurTimer);
              }}
              commitWidgetValue(modeInput, "selected");
              input.dataset.destinationMode = "selected";
              commitWidgetValue(input, match);
              closeDropdown();
              input.focus();
            }};

            const renderDropdown = () => {{
              dropdown.innerHTML = "";
              if (!matches.length) {{
                closeDropdown();
                return;
              }}

              matches.forEach((match, index) => {{
                const option = doc.createElement("button");
                option.type = "button";
                option.textContent = match;
                option.style.width = "100%";
                option.style.border = "none";
                option.style.borderRadius = "0.8rem";
                option.style.background = index === highlightedIndex ? "#e8fff1" : "transparent";
                option.style.color = "#0f172a";
                option.style.cursor = "pointer";
                option.style.fontSize = "0.94rem";
                option.style.fontWeight = index === highlightedIndex ? "700" : "600";
                option.style.lineHeight = "1.35";
                option.style.padding = "0.72rem 0.85rem";
                option.style.textAlign = "left";
                option.style.margin = "0";
                option.style.pointerEvents = "auto";
                option.onmouseenter = () => {{
                  highlightedIndex = index;
                  renderDropdown();
                }};
                option.onpointerdown = (event) => {{
                  event.preventDefault();
                  event.stopPropagation();
                  isInteractingWithDropdown = true;
                  selectSuggestion(match);
                }};
                option.onclick = (event) => {{
                  event.preventDefault();
                  event.stopPropagation();
                  selectSuggestion(match);
                }};
                dropdown.appendChild(option);
              }});
              dropdown.style.display = "block";
            }};

            const openDropdown = () => {{
              matches = rankMatches(input.value);
              highlightedIndex = -1;
              renderDropdown();
            }};

            const acceptFreeText = () => {{
              const nextValue = normalizedInputValue();
              commitWidgetValue(modeInput, "free_text");
              input.dataset.destinationMode = "free_text";
              commitWidgetValue(input, nextValue);
              closeDropdown();
            }};

            if (input.dataset.passengerAutocompleteBound === "true") {{
              input.dataset.destinationMode = modeInput.value === "selected" ? "selected" : "free_text";
              return;
            }}

            input.dataset.passengerAutocompleteBound = "true";
            input.dataset.destinationMode = modeInput.value === "selected" ? "selected" : "free_text";

            input.addEventListener("input", () => {{
              setDomValue(modeInput, "free_text");
              input.dataset.destinationMode = "free_text";
              if ((input.value || "").trim()) {{
                openDropdown();
              }} else {{
                closeDropdown();
              }}
            }});

            input.addEventListener("focus", () => {{
              if ((input.value || "").trim()) {{
                openDropdown();
              }}
            }});

            input.addEventListener("keydown", (event) => {{
              if (event.key === "ArrowDown" && matches.length) {{
                event.preventDefault();
                highlightedIndex = highlightedIndex < matches.length - 1 ? highlightedIndex + 1 : 0;
                renderDropdown();
                return;
              }}

              if (event.key === "ArrowUp" && matches.length) {{
                event.preventDefault();
                highlightedIndex = highlightedIndex > 0 ? highlightedIndex - 1 : matches.length - 1;
                renderDropdown();
                return;
              }}

              if (event.key === "Escape") {{
                event.preventDefault();
                closeDropdown();
                return;
              }}

              if (event.key === "Enter") {{
                if (matches.length && highlightedIndex >= 0) {{
                  event.preventDefault();
                  selectSuggestion(matches[highlightedIndex]);
                }} else {{
                  // Let Streamlit handle Enter naturally (fires on_change -> set_passenger_destination).
                  // Just close the dropdown so it doesn't linger after the rerun.
                  closeDropdown();
                }}
              }}
            }});

            input.addEventListener("blur", () => {{
              blurTimer = topWindow.setTimeout(() => {{
                if (isInteractingWithDropdown) {{
                  return;
                }}
                const activeElement = doc.activeElement;
                if (
                  activeElement
                  && (fieldWrapper.contains(activeElement) || dropdown.contains(activeElement))
                ) {{
                  return;
                }}
                closeDropdown();
              }}, 120);
            }});

            dropdown.addEventListener("mousedown", () => {{
              isInteractingWithDropdown = true;
              if (blurTimer) {{
                topWindow.clearTimeout(blurTimer);
              }}
            }});

            dropdown.addEventListener("mouseenter", () => {{
              isInteractingWithDropdown = true;
            }});

            dropdown.addEventListener("mouseleave", () => {{
              isInteractingWithDropdown = false;
            }});

            if (!topWindow.__passengerDestOutsideBound) {{
              topWindow.__passengerDestOutsideBound = true;
              doc.addEventListener("mousedown", (event) => {{
                const state = topWindow.__passengerDestEnterOnlyState || {{}};
                const target = event.target;
                if (state.wrapper && state.wrapper.contains(target)) {{
                  return;
                }}
                if (typeof state.closeDropdown === "function") {{
                  state.closeDropdown();
                }}
              }});
            }}
          }};

          bind();
        }})();
        </script>
        """,
        height=0,
    )


def passenger_destination() -> str:
    return passenger_destination_value()


def adjust_passenger_counter(key: str, delta: int, minimum: int, maximum: int) -> None:
    current = int(st.session_state.get(key, minimum))
    st.session_state[key] = max(minimum, min(maximum, current + delta))


def set_passenger_step(step: str) -> None:
    st.session_state.passenger_step = step


def set_passenger_destination() -> None:
    destination_value = str(st.session_state.get("passenger_destination_input", "") or "").strip()
    destination_mode = str(st.session_state.get("passenger_destination_mode", "free_text") or "free_text").strip()
    if destination_mode == "selected" and destination_value not in DESTINATION_PRESET_SET:
        destination_mode = "free_text"
    destination = normalize_destination_value(
        {"mode": destination_mode, "value": destination_value}
        if destination_value
        else ""
    )
    st.session_state.passenger_destination = destination or ""


def set_passenger_ride(ride_id: str) -> None:
    st.session_state.passenger_selected_ride = ride_id


def set_passenger_payment(payment_id: str) -> None:
    st.session_state.passenger_payment = payment_id


def passenger_confirm_errors() -> list[str]:
    errors: list[str] = []
    destination = normalize_destination_value(st.session_state.get("passenger_destination", ""))
    if not destination:
        errors.append("Please enter your destination")
    elif destination["mode"] != "selected" and len(destination["value"]) < 3:
        errors.append("Please enter at least 3 characters")
    if int(st.session_state.get("passenger_count", 1)) < 1:
        errors.append("At least 1 passenger is required")
    return errors


def ensure_destination_input_state() -> None:
    if "passenger_destination_mode" not in st.session_state:
        st.session_state.passenger_destination_mode = "free_text"

    current_destination = normalize_destination_value(st.session_state.get("passenger_destination", ""))
    if current_destination:
        if not st.session_state.get("passenger_destination_input"):
            st.session_state.passenger_destination_input = current_destination["value"]
        if not st.session_state.get("passenger_destination_mode"):
            st.session_state.passenger_destination_mode = current_destination["mode"]


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
                minimum=1,
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
        placeholder="Search Bangkok destination",
        on_change=set_passenger_destination,
    )
    st.text_input(
        "Destination Mode",
        key="passenger_destination_mode",
        label_visibility="collapsed",
    )
    render_destination_autocomplete_bridge()
    set_passenger_destination()
    destination = passenger_destination()
    if not passenger_destination_is_valid():
        st.markdown(
            (
                "<div class='passenger-validation-error'>Please enter your destination</div>"
                if not destination
                else "<div class='passenger-validation-error'>Please enter at least 3 characters</div>"
            ),
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


def render_support_chat() -> None:
    components.html(
        """<script>
(function () {
  'use strict';
  var win = window.parent;
  var doc = win.document;
  var FAB_ID = 'hr-support-fab';

  // Guard against double-init on Streamlit reruns
  if (doc.getElementById(FAB_ID)) return;

  // Persistent state survives reruns for this browser session
  if (!win.__hrSupportState) win.__hrSupportState = { messages: [] };
  var state = win.__hrSupportState;

  var CHIPS = [
    { label: 'Pickup point',       text: 'Where is my pickup zone?' },
    { label: 'Luggage support',    text: 'I have large luggage' },
    { label: 'Special assistance', text: 'I need special assistance' },
    { label: 'Change destination', text: 'I want to change my destination' },
    { label: 'Contact staff',      text: 'How do I contact airport staff?' }
  ];

  function getResponse(msg) {
    var m = msg.toLowerCase();
    if (m.indexOf('pickup') !== -1 || m.indexOf('zone') !== -1)
      return 'Your pickup point is Pickup Zone C2 at Suvarnabhumi Airport, Terminal 1. Follow the taxi pickup signs after baggage claim.';
    if (m.indexOf('luggage') !== -1 || m.indexOf('bag') !== -1)
      return 'For large luggage, please update your luggage count before confirming. The system will recommend a larger vehicle if needed.';
    if (m.indexOf('wheelchair') !== -1 || m.indexOf('assistance') !== -1 ||
        m.indexOf('help') !== -1 || m.indexOf('staff') !== -1 || m.indexOf('contact') !== -1)
      return 'We can flag your request for special assistance. Airport staff will be notified before pickup.';
    if (m.indexOf('destination') !== -1 || m.indexOf('change') !== -1)
      return 'You can update your destination before confirming pickup. After confirmation, please contact staff for changes.';
    return 'I can help with pickup point, luggage, special assistance, or destination changes.';
  }

  // ── Styles ─────────────────────────────────────────────────────────────
  var style = doc.createElement('style');
  style.id = 'hr-support-styles';
  style.textContent = [
    '.hr-fab{position:fixed;bottom:5.5rem;z-index:99990;width:3.4rem;height:3.4rem;border-radius:999px;background:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,177,79,.22),0 2px 8px rgba(0,0,0,.1);transition:transform .15s,box-shadow .15s}',
    '.hr-fab:hover{transform:scale(1.07);box-shadow:0 6px 28px rgba(0,177,79,.3),0 3px 12px rgba(0,0,0,.12)}',
    '.hr-fab:active{transform:scale(.94)}',
    '.hr-overlay{position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:99991;opacity:0;pointer-events:none;transition:opacity .25s}',
    '.hr-overlay.hr-open{opacity:1;pointer-events:auto}',
    '.hr-sheet{position:fixed;bottom:0;z-index:99992;background:#f8fafc;border-radius:1.5rem 1.5rem 0 0;box-shadow:0 -8px 40px rgba(15,23,42,.16);display:flex;flex-direction:column;max-height:80vh;transition:transform .3s cubic-bezier(.32,.72,0,1);transform:translateY(100%)}',
    '.hr-sheet.hr-open{transform:translateY(0)}',
    '.hr-sheet-hd{padding:1.1rem 1.1rem .75rem;border-bottom:1px solid rgba(217,228,238,.7);display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0}',
    '.hr-sheet-title{font-size:1.05rem;font-weight:800;color:#0f172a;line-height:1.25;font-family:inherit}',
    '.hr-sheet-sub{font-size:.78rem;color:#64748b;margin-top:.18rem;font-family:inherit}',
    '.hr-x{width:2rem;height:2rem;border-radius:999px;background:rgba(100,116,139,.1);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#475569;flex-shrink:0;font-size:1.15rem;line-height:1;transition:background .15s;font-family:inherit}',
    '.hr-x:hover{background:rgba(100,116,139,.2)}',
    '.hr-msgs{flex:1;overflow-y:auto;padding:.9rem 1rem;display:flex;flex-direction:column;gap:.65rem;min-height:7rem}',
    '.hr-msg{max-width:82%;display:flex;flex-direction:column}',
    '.hr-msg.u{align-self:flex-end;align-items:flex-end}',
    '.hr-msg.b{align-self:flex-start;align-items:flex-start}',
    '.hr-bub{padding:.62rem .88rem;border-radius:1.1rem;font-size:.88rem;line-height:1.45;font-weight:500;font-family:inherit}',
    '.hr-msg.u .hr-bub{background:#00b14f;color:#fff;border-bottom-right-radius:.3rem}',
    '.hr-msg.b .hr-bub{background:#fff;color:#0f172a;border:1px solid rgba(217,228,238,.8);border-bottom-left-radius:.3rem;box-shadow:0 1px 4px rgba(15,23,42,.06)}',
    '.hr-hint{font-size:.82rem;color:#94a3b8;text-align:center;margin:auto;padding:1rem 0;font-family:inherit}',
    '.hr-chips{padding:.55rem 1rem .4rem;display:flex;gap:.45rem;overflow-x:auto;flex-shrink:0;scrollbar-width:none}',
    '.hr-chips::-webkit-scrollbar{display:none}',
    '.hr-chip{flex-shrink:0;padding:.42rem .82rem;border-radius:999px;background:rgba(0,177,79,.09);border:1px solid rgba(0,177,79,.22);color:#067c37;font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .12s;font-family:inherit}',
    '.hr-chip:hover{background:rgba(0,177,79,.17)}',
    '.hr-irow{display:flex;gap:.5rem;align-items:center;padding:.65rem .85rem .9rem;border-top:1px solid rgba(217,228,238,.7);flex-shrink:0;background:#f8fafc}',
    '.hr-inp{flex:1;border:1px solid rgba(217,228,238,.9);border-radius:999px;padding:.58rem 1rem;font-size:.9rem;color:#0f172a;background:#fff;outline:none;font-family:inherit;transition:border-color .15s;min-height:unset!important;height:auto!important}',
    '.hr-inp:focus{border-color:rgba(0,177,79,.5)}',
    '.hr-send{width:2.6rem;height:2.6rem;border-radius:999px;background:#00b14f;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;min-height:unset!important}',
    '.hr-send:hover{background:#009942}',
    '.hr-send:active{transform:scale(.92)}'
  ].join('');
  doc.head.appendChild(style);

  // ── FAB ────────────────────────────────────────────────────────────────
  var fab = doc.createElement('button');
  fab.id = FAB_ID;
  fab.className = 'hr-fab';
  fab.setAttribute('aria-label', 'Open support chat');
  fab.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00b14f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>';
  doc.body.appendChild(fab);

  // ── Overlay ────────────────────────────────────────────────────────────
  var overlay = doc.createElement('div');
  overlay.id = 'hr-support-overlay';
  overlay.className = 'hr-overlay';
  doc.body.appendChild(overlay);

  // ── Bottom sheet ───────────────────────────────────────────────────────
  var sheet = doc.createElement('div');
  sheet.id = 'hr-support-sheet';
  sheet.className = 'hr-sheet';
  sheet.innerHTML =
    '<div class="hr-sheet-hd">' +
      '<div><div class="hr-sheet-title">Hello Ride Support</div>' +
      '<div class="hr-sheet-sub">Airport pickup assistance</div></div>' +
      '<button class="hr-x" id="hr-close-btn" aria-label="Close">×</button>' +
    '</div>' +
    '<div class="hr-msgs" id="hr-msgs"></div>' +
    '<div class="hr-chips" id="hr-chips"></div>' +
    '<div class="hr-irow">' +
      '<input class="hr-inp" id="hr-inp" type="text" placeholder="Type a message…" autocomplete="off" />' +
      '<button class="hr-send" id="hr-send-btn" aria-label="Send">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
      '</button>' +
    '</div>';
  doc.body.appendChild(sheet);

  var msgsEl = doc.getElementById('hr-msgs');
  var chipsEl = doc.getElementById('hr-chips');
  var inpEl = doc.getElementById('hr-inp');

  // ── Positioning (relative to the 420px mobile container) ───────────────
  function position(attempt) {
    var c = doc.querySelector('[data-testid="stMainBlockContainer"]');
    if (!c) {
      if ((attempt || 0) < 25) win.requestAnimationFrame(function () { position((attempt || 0) + 1); });
      return;
    }
    var r = c.getBoundingClientRect();
    sheet.style.left = r.left + 'px';
    sheet.style.width = r.width + 'px';
    fab.style.right = (win.innerWidth - r.right + 10) + 'px';
  }
  position(0);
  win.addEventListener('resize', function () { position(0); });

  // ── Render helpers ─────────────────────────────────────────────────────
  function renderMsgs() {
    msgsEl.innerHTML = '';
    if (!state.messages.length) {
      var hint = doc.createElement('div');
      hint.className = 'hr-hint';
      hint.textContent = 'Hi! How can we help with your airport pickup?';
      msgsEl.appendChild(hint);
      return;
    }
    state.messages.forEach(function (m) {
      var w = doc.createElement('div');
      w.className = 'hr-msg ' + (m.role === 'user' ? 'u' : 'b');
      var b = doc.createElement('div');
      b.className = 'hr-bub';
      b.textContent = m.text;
      w.appendChild(b);
      msgsEl.appendChild(w);
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function renderChips() {
    chipsEl.innerHTML = '';
    CHIPS.forEach(function (chip) {
      var btn = doc.createElement('button');
      btn.className = 'hr-chip';
      btn.textContent = chip.label;
      btn.addEventListener('click', function () { send(chip.text); });
      chipsEl.appendChild(btn);
    });
  }

  function addMsg(role, text) {
    state.messages.push({ role: role, text: text });
    renderMsgs();
  }

  function send(text) {
    var t = text.trim();
    if (!t) return;
    addMsg('user', t);
    if (inpEl.value === t) inpEl.value = '';
    win.setTimeout(function () { addMsg('bot', getResponse(t)); }, 400);
  }

  function openSheet() {
    position(0);
    overlay.classList.add('hr-open');
    sheet.classList.add('hr-open');
    fab.style.display = 'none';
    renderMsgs();
    renderChips();
    win.setTimeout(function () { inpEl.focus(); }, 320);
  }

  function closeSheet() {
    overlay.classList.remove('hr-open');
    sheet.classList.remove('hr-open');
    fab.style.display = '';
  }

  fab.addEventListener('click', openSheet);
  overlay.addEventListener('click', closeSheet);
  doc.getElementById('hr-close-btn').addEventListener('click', closeSheet);
  doc.getElementById('hr-send-btn').addEventListener('click', function () { send(inpEl.value); });
  inpEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(inpEl.value); }
  });
})();
</script>""",
        height=0,
    )


SCREEN_MAP = {
    "home": render_passenger_home,
    "carType": render_passenger_car_type,
    "ride": render_passenger_ride,
    "review": render_passenger_review,
}


initialize_state()
maybe_hydrate_passenger_request_draft()
prefer_stored_on_boot = not st.session_state.get("passenger_request_draft_browser_boot_checked", False)
st.session_state.passenger_request_draft_browser_boot_checked = True
apply_global_styles()
apply_passenger_styles()
render_sidebar(active="passenger")
render_passenger_request_draft_bridge(prefer_stored_on_boot=prefer_stored_on_boot)

SCREEN_MAP[st.session_state.passenger_step]()
render_support_chat()
