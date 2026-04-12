import streamlit as st


def apply_global_styles() -> None:
    st.markdown(
        """
        <style>
        :root {
          --hr-bg: #f6fbf7;
          --hr-surface: rgba(255, 255, 255, 0.96);
          --hr-card: #ffffff;
          --hr-foreground: #0f172a;
          --hr-muted: #64748b;
          --hr-border: #d9e4ee;
          --hr-primary: #00b14f;
          --hr-primary-deep: #0c7d35;
          --hr-secondary: #154aa8;
          --hr-danger: #b91c1c;
          --hr-danger-deep: #991b1b;
          --hr-info: #2d6bff;
        }

        .stApp,
        .stAppViewContainer,
        [data-testid="stAppViewContainer"],
        .main {
          background:
            radial-gradient(circle at top, rgba(0, 177, 79, 0.12), transparent 28%),
            linear-gradient(180deg, #edf5f0 0%, #e2ecf8 100%) !important;
          color: var(--hr-foreground);
        }

        [data-testid="stSidebarNav"] {
          display: none;
        }

        [data-testid="stSidebar"] {
          background: linear-gradient(180deg, #f3f8f4 0%, #edf3fb 100%);
          border-right: 1px solid rgba(217, 228, 238, 0.8);
        }

        .hr-sidebar-brand {
          padding: 0.2rem 0 1rem 0;
        }

        .hr-sidebar-title {
          font-size: 1.7rem;
          font-weight: 800;
          color: var(--hr-primary);
          letter-spacing: -0.03em;
        }

        .hr-sidebar-copy {
          color: var(--hr-muted);
          line-height: 1.5;
          margin-top: 0.3rem;
        }

        .block-container {
          padding-top: 2rem;
          padding-bottom: 3rem;
        }

        .hr-hero,
        .hr-card,
        .hr-phone-shell {
          border: 1px solid rgba(196, 214, 230, 0.9);
          background: var(--hr-surface);
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(16px);
        }

        .hr-hero {
          border-radius: 2rem;
          padding: 2rem 2.2rem;
          min-height: 100%;
        }

        .hr-card {
          border-radius: 1.5rem;
          padding: 1rem 1.1rem;
          margin-bottom: 0.9rem;
        }

        .hr-card-neutral {
          background: rgba(255, 255, 255, 0.88);
        }

        .hr-card-passenger,
        .hr-card-passenger-soft {
          background: linear-gradient(180deg, rgba(232, 255, 233, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%);
        }

        .hr-card-driver,
        .hr-card-driver-dark {
          background: linear-gradient(135deg, #0c7d35 0%, #067c37 100%);
          color: white;
        }

        .hr-card-driver-soft {
          background: linear-gradient(180deg, #f0fff4 0%, #e7f7eb 100%);
        }

        .hr-card-ops,
        .hr-card-info {
          background: linear-gradient(180deg, #eef3ff 0%, #f8fbff 100%);
        }

        .hr-card-danger {
          background: linear-gradient(180deg, #c10d17 0%, #990c13 100%);
          color: white;
        }

        .hr-card-ops-dark {
          background: linear-gradient(180deg, rgba(20,57,74,0.96), rgba(14,33,49,0.94));
          color: white;
        }

        .hr-badge,
        .hr-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.22em;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .hr-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.38rem 0.8rem;
          color: var(--hr-primary);
          background: rgba(0, 177, 79, 0.1);
          margin-bottom: 1rem;
        }

        .hr-eyebrow {
          color: #475569;
          margin-bottom: 0.35rem;
        }

        .hr-hero-title,
        .hr-page-title {
          margin: 0;
          font-size: clamp(2.5rem, 4vw, 4.8rem);
          line-height: 0.98;
          letter-spacing: -0.05em;
          font-weight: 800;
        }

        .hr-page-title {
          font-size: clamp(2rem, 3vw, 3.2rem);
        }

        .hr-card-title,
        .hr-section-title,
        .hr-mobile-title {
          font-size: 1.5rem;
          line-height: 1.08;
          letter-spacing: -0.04em;
          font-weight: 800;
          color: inherit;
        }

        .hr-section-title {
          font-size: 1.45rem;
        }

        .hr-mobile-title {
          font-size: 1.35rem;
          color: var(--hr-primary);
        }

        .hr-copy,
        .hr-inline-note,
        .hr-mobile-side {
          color: var(--hr-muted);
          line-height: 1.65;
        }

        .hr-card-driver .hr-copy,
        .hr-card-danger .hr-copy,
        .hr-card-driver-dark .hr-copy,
        .hr-card-ops-dark .hr-copy,
        .hr-card-driver .hr-card-title,
        .hr-card-driver-dark .hr-card-title,
        .hr-card-danger .hr-card-title,
        .hr-card-ops-dark .hr-card-title {
          color: white;
        }

        .hr-card-driver .hr-eyebrow,
        .hr-card-driver-dark .hr-eyebrow,
        .hr-card-danger .hr-eyebrow,
        .hr-card-ops-dark .hr-eyebrow {
          color: rgba(255, 255, 255, 0.72);
        }

        .hr-card-row,
        .hr-list-item {
          display: flex;
          justify-content: space-between;
          gap: 0.9rem;
          align-items: flex-start;
        }

        .hr-list-item {
          align-items: center;
        }

        .hr-list-title {
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .hr-list-value {
          text-align: right;
          flex-shrink: 0;
        }

        .hr-metric-value {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: var(--hr-foreground);
        }

        .hr-card-danger .hr-metric-value,
        .hr-card-driver .hr-metric-value,
        .hr-card-driver-dark .hr-metric-value,
        .hr-card-ops-dark .hr-metric-value {
          color: white;
        }

        .hr-inline-value {
          font-size: 1.2rem;
          white-space: nowrap;
        }

        .hr-metric-delta {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--hr-muted);
          padding-top: 0.65rem;
        }

        .hr-advisory {
          margin-top: 1rem;
          padding: 0.9rem;
          border-radius: 1.2rem;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.12);
        }

        .hr-advisory-copy {
          color: white;
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.6;
        }

        .hr-page-header {
          margin-bottom: 1rem;
        }

        .hr-section {
          margin: 1.1rem 0 0.6rem;
        }

        .hr-inline-note {
          margin: 1rem 0 1.2rem;
          padding: 0.2rem 0.15rem;
          font-size: 0.98rem;
        }

        .hr-phone-shell {
          max-width: 30rem;
          border-radius: 2rem;
          padding: 1rem;
          margin: 0 auto;
        }

        .hr-passenger-shell {
          background:
            radial-gradient(circle at top, rgba(0, 177, 79, 0.18), transparent 34%),
            linear-gradient(180deg, #f6fff9 0%, #edf4ff 100%);
        }

        .hr-driver-shell {
          background:
            radial-gradient(circle at top, rgba(8, 255, 130, 0.18), transparent 34%),
            linear-gradient(180deg, #f4f8ef 0%, #f5f7ef 100%);
        }

        .hr-mobile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.2rem 0.15rem 0.8rem;
        }

        .hr-mobile-side {
          min-width: 4rem;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .hr-mobile-side-right {
          text-align: right;
        }

        .hr-route-row {
          display: flex;
          gap: 1rem;
          align-items: stretch;
        }

        .hr-route-row + .hr-route-row {
          margin-top: 0.35rem;
        }

        .hr-route-marker {
          width: 0.8rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }

        .hr-route-dot {
          height: 0.75rem;
          width: 0.75rem;
          border-radius: 999px;
          border: 2px solid var(--hr-primary);
          margin-top: 0.25rem;
        }

        .hr-route-line {
          width: 1px;
          flex: 1;
          background: var(--hr-border);
          margin: 0.2rem 0;
        }

        .hr-route-square {
          height: 0.75rem;
          width: 0.75rem;
          border-radius: 0.2rem;
          background: var(--hr-danger);
          margin-top: 0.25rem;
        }

        .hr-route-copy {
          min-width: 0;
          padding-bottom: 0.5rem;
        }

        .hr-counter {
          text-align: center;
          padding-top: 0.1rem;
        }

        .hr-counter-value {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: var(--hr-foreground);
        }

        .hr-gauge-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 0.4rem 0 1rem;
        }

        .hr-gauge {
          height: 13rem;
          width: 13rem;
          border-radius: 999px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 14px solid #f1d6d7;
          border-right-color: #a30c12;
          border-bottom-color: #a30c12;
          background: #fff8f8;
        }

        .hr-gauge-value {
          font-size: 3rem;
          font-weight: 800;
          color: var(--hr-danger-deep);
          line-height: 1;
        }

        .hr-gauge-status {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.4rem 0.8rem;
          color: var(--hr-danger);
          background: #fee2e2;
          font-size: 0.82rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .hr-status-strip {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.5rem;
          padding: 1rem;
          border-radius: 1.4rem;
          background: #ecebe7;
          margin-bottom: 1rem;
        }

        .hr-status-step {
          text-align: center;
        }

        .hr-status-bullet {
          height: 2.2rem;
          width: 2.2rem;
          margin: 0 auto;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #dbdad5;
          color: #94a3b8;
          font-size: 0.68rem;
          font-weight: 700;
        }

        .hr-status-bullet.is-done {
          background: var(--hr-primary);
          color: white;
        }

        .hr-status-label {
          margin-top: 0.45rem;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--hr-muted);
          font-weight: 700;
        }

        .hr-timer-shell {
          display: flex;
          justify-content: center;
          margin: 1rem 0 1.4rem;
        }

        .hr-timer-ring {
          height: 11rem;
          width: 11rem;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hr-timer-core {
          height: calc(100% - 1.1rem);
          width: calc(100% - 1.1rem);
          border-radius: 999px;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .hr-timer-value {
          font-size: 3rem;
          font-weight: 800;
          line-height: 1;
        }

        .hr-forecast-bar {
          text-align: center;
        }

        .hr-forecast-label {
          height: 1.2rem;
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--hr-muted);
          font-weight: 700;
        }

        .hr-forecast-column {
          width: 100%;
          border-radius: 0.45rem 0.45rem 0 0;
          margin-top: 0.3rem;
        }

        .hr-forecast-normal {
          background: #c8e6d4;
        }

        .hr-forecast-surge {
          background: #f59e0b;
        }

        .hr-forecast-peak {
          background: #d54b72;
        }

        .hr-forecast-time {
          font-size: 0.7rem;
          color: var(--hr-muted);
          margin-top: 0.35rem;
          font-weight: 600;
        }

        .hr-reference-block {
          margin-top: 1.6rem;
        }

        .hr-reference-list {
          margin: 0.75rem 0 0 1.1rem;
          color: var(--hr-muted);
          line-height: 1.7;
        }

        .hr-danger-copy {
          color: var(--hr-danger);
        }

        .hr-list-section {
          height: 100%;
          padding: 1.2rem;
        }

        .hr-list-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .hr-list-count {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 0.32rem 0.72rem;
          background: #eef3ff;
          color: var(--hr-secondary);
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .hr-stacked-list {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }

        .hr-list-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding: 0.95rem 1rem;
          border-radius: 1rem;
          background: #f8fafc;
          border: 1px solid rgba(217, 228, 238, 0.75);
        }

        .hr-list-main {
          min-width: 0;
        }

        .hr-list-subtitle {
          margin-top: 0.25rem;
        }

        .hr-list-side {
          min-width: 5.4rem;
          text-align: right;
          flex-shrink: 0;
        }

        .hr-list-number {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--hr-foreground);
          white-space: nowrap;
        }

        .hr-list-pill {
          display: inline-flex;
          justify-content: center;
          margin-bottom: 0.28rem;
          border-radius: 999px;
          padding: 0.24rem 0.55rem;
          background: white;
          color: var(--hr-muted);
          font-size: 0.66rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .stButton > button,
        .stDownloadButton > button,
        [data-testid="stBaseButton-secondary"],
        [data-testid="stBaseButton-primary"] {
          border-radius: 1rem;
          min-height: 2.8rem;
          font-weight: 700;
          border: 1px solid transparent;
        }

        .stButton > button[kind="secondary"] {
          border: 1px solid var(--hr-border);
          background: rgba(255, 255, 255, 0.75);
          color: var(--hr-foreground);
        }

        .stTextInput input,
        .stTextArea textarea,
        .stNumberInput input {
          border-radius: 1rem;
          border: 1px solid var(--hr-border);
          background: rgba(255, 255, 255, 0.82);
        }

        .stToggle label,
        .stRadio label {
          font-weight: 600;
        }

        /* Force the page_link element and all its wrappers to be full-width */
        [data-testid="stPageLink"],
        [data-testid="stPageLink"] > div {
          display: block;
          width: 100%;
        }

        [data-testid="stPageLink"] a {
          display: flex !important;
          align-items: center;
          justify-content: center;
          width: 100%;
          box-sizing: border-box;
          background: #0a9e48;
          color: #ffffff !important;
          padding: 0.9rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.92rem;
          letter-spacing: 0.02em;
          text-decoration: none !important;
          transition: background 0.16s ease, box-shadow 0.16s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 3px 10px rgba(10, 125, 57, 0.22);
          min-height: 3rem;
        }

        [data-testid="stPageLink"] a p,
        [data-testid="stPageLink"] a span {
          color: #ffffff !important;
          margin: 0;
        }

        [data-testid="stPageLink"] a:hover {
          background: var(--hr-primary-deep);
          box-shadow: 0 4px 16px rgba(10, 125, 57, 0.3);
          text-decoration: none !important;
        }

        [data-testid="stPageLink"] a svg {
          display: none;
        }

        .hr-section-gap {
          height: 2rem;
        }

        .hr-step-card {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(217, 228, 238, 0.7);
          border-radius: 1.2rem;
          padding: 1.2rem 1.4rem 1.4rem;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .hr-step-body {
          flex: 1;
          margin: 0;
        }

        /* ── Equal-height card rows (Overview page) ──────────────────────────── */

        [data-testid="stHorizontalBlock"]:has(.hr-step-card) {
          align-items: stretch;
        }
        [data-testid="stHorizontalBlock"]:has(.hr-step-card) > [data-testid="column"] {
          display: flex;
          flex-direction: column;
        }
        [data-testid="stHorizontalBlock"]:has(.hr-step-card) > [data-testid="column"] > [data-testid="stVerticalBlock"] {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        [data-testid="stHorizontalBlock"]:has(.hr-step-card) > [data-testid="column"] > [data-testid="stVerticalBlock"] > div {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        [data-testid="stHorizontalBlock"]:has(.hr-module-card) {
          align-items: stretch;
        }
        [data-testid="stHorizontalBlock"]:has(.hr-module-card) > [data-testid="column"] {
          display: flex;
          flex-direction: column;
        }
        [data-testid="stHorizontalBlock"]:has(.hr-module-card) > [data-testid="column"] > [data-testid="stVerticalBlock"] {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        [data-testid="stHorizontalBlock"]:has(.hr-module-card) > [data-testid="column"] > [data-testid="stVerticalBlock"] > [data-testid="stMarkdown"] {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        [data-testid="stHorizontalBlock"]:has(.hr-module-card) > [data-testid="column"] > [data-testid="stVerticalBlock"] > [data-testid="stMarkdown"] > div {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .hr-module-card {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .hr-module-card .hr-copy {
          flex: 1;
        }

        .hr-step-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.8rem;
          height: 1.8rem;
          border-radius: 999px;
          background: var(--hr-primary);
          color: #ffffff;
          font-weight: 800;
          font-size: 0.8rem;
          margin-bottom: 0.7rem;
        }

        .hr-step-title {
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--hr-foreground);
          line-height: 1.2;
          margin-bottom: 0.4rem;
        }

        .hr-hero-body-constrained {
          max-width: 44rem;
          margin-top: 0.7rem;
        }

        /* ── Streamlit bordered containers → visible card surface ──────────── */

        [data-testid="stVerticalBlockBorderWrapper"] {
          background: rgba(255, 255, 255, 0.98) !important;
          border: 1px solid rgba(148, 163, 184, 0.35) !important;
          border-radius: 16px !important;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04) !important;
        }

        @media (max-width: 1024px) {
          .block-container {
            padding-top: 1.4rem;
          }

          .hr-hero {
            padding: 1.5rem;
          }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )
