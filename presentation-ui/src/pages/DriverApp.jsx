import { useState, useEffect } from "react";
import { DRIVER, DEFAULT_CREDENTIALS } from "../data/mockDriver.js";
import { HelloRideWordmark, MobileScrollArea, MobileShell } from "../components/shared/MobileShell.jsx";
import { useDemoMatching } from "../context/useDemoMatching.js";

const D = DRIVER;

function fareLabel(activeTrip) {
  return `THB ${activeTrip.fareTHB}`;
}

function fullPickup(activeTrip) {
  return `${activeTrip.pickupGate}, ${activeTrip.pickupTerminal}`;
}

function fullDestination(activeTrip) {
  return activeTrip.destinationName || activeTrip.selectedDestination || "Destination not selected";
}

// ── Shared ─────────────────────────────────────────────────────────────────

function AppHeader({ isOnline, onLogout }) {
  return (
    <header className="sticky top-0 z-50 flex items-center gap-3 px-5 py-3 bg-white/95 backdrop-blur border-b border-slate-100 -mx-5 mb-4">
      <span className="material-symbols-outlined text-slate-500 text-2xl">menu</span>
      <div className="flex-1">
        <HelloRideWordmark />
      </div>
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isOnline ? "bg-brand-mid/15 text-brand" : "bg-slate-100 text-slate-500"
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-brand-mid" : "bg-slate-400"}`} />
        {isOnline ? "Online" : "Offline"}
      </div>
      <button onClick={onLogout} className="flex items-center justify-center hover:opacity-70 transition-opacity">
        <span className="material-symbols-outlined text-slate-500 text-2xl">account_circle</span>
      </button>
    </header>
  );
}

function InfoCard({ eyebrow, title, body, tone = "default" }) {
  const cardStyle = {
    driver: { wrap: "bg-brand/5 border border-brand/10 shadow-sm", accent: "bg-brand-mid", body: "text-slate-700" },
    danger: { wrap: "bg-red-50 border border-red-200 shadow-sm", accent: "bg-danger", body: "text-red-800" },
    neutral: { wrap: "bg-slate-50 border border-slate-200 shadow-sm", accent: "bg-slate-300", body: "text-slate-600" },
    default: { wrap: "bg-white border border-slate-200 shadow-sm", accent: "bg-transparent", body: "text-slate-600" },
  }[tone] ?? { wrap: "bg-white border border-slate-200 shadow-sm", accent: "bg-transparent", body: "text-slate-600" };

  return (
    <div className={`${cardStyle.wrap} rounded-2xl overflow-hidden`}>
      <div className={`h-0.5 ${cardStyle.accent}`} />
      <div className="p-5">
        {eyebrow && <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-1">{eyebrow}</p>}
        {title && <p className="text-base font-bold text-slate-900">{title}</p>}
        {body && <p className={`text-sm mt-1 ${cardStyle.body}`}>{body}</p>}
      </div>
    </div>
  );
}

function RouteTimeline({ pickup, pickupAddress, dropoff, dropoffAddress }) {
  return (
    <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
      <div className="flex gap-3">
        <div className="flex flex-col items-center pt-1">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-brand" />
          <div className="w-px flex-1 bg-slate-300 my-1" />
          <div className="w-2.5 h-2.5 rounded-sm bg-danger" />
        </div>
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <p className="text-sm font-semibold text-slate-900">{pickup}</p>
            <p className="text-xs text-muted">{pickupAddress}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{dropoff}</p>
            <p className="text-xs text-muted">{dropoffAddress}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Status Strip (onboarding progress) ────────────────────────────────────

function StatusStrip({ steps }) {
  const completed = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done)?.label ?? "Active";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-muted">
        Application progress: {completed}/{steps.length} complete · Next: {next}
      </p>
    </div>
  );
}

// ── Login Screen ───────────────────────────────────────────────────────────

function LoginScreen({ onLogin, onRegister }) {
  const [username, setUsername] = useState(DEFAULT_CREDENTIALS.username);
  const [password, setPassword] = useState(DEFAULT_CREDENTIALS.password);
  const [error, setError] = useState("");

  function handleLogin() {
    if (!username || !password) {
      setError("Enter both username and password to continue.");
      return;
    }
    onLogin();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-center pt-4 pb-2">
        <HelloRideWordmark size="lg" />
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_14px_36px_rgba(21,74,168,0.08)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-brand flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-white text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}>local_taxi</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-brand uppercase tracking-widest">Driver partner sign in</span>
            <p className="text-lg font-bold text-slate-900 leading-tight mt-0.5">Welcome back, partner.</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Sign in to go online, accept the next airport queue, and track the best earning window.
        </p>
      </div>

      {/* Form inputs */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-bold mb-2">Username</p>
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            placeholder="somchai.driver"
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          />
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-bold mb-2">Password</p>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Enter password"
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          />
        </div>
      </div>

      {error && <p className="text-xs text-danger -mt-1">{error}</p>}

      <button
        onClick={handleLogin}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand to-brand-deep text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(21,74,168,0.28)] hover:shadow-[0_12px_28px_rgba(21,74,168,0.34)] active:scale-95 transition-all"
      >
        Log In
      </button>

      {/* Demo credentials — subtle badge */}
      <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-200 px-1.5 py-0.5 rounded">Demo</span>
        <span className="text-xs text-slate-500">driver_demo / 1234</span>
      </div>

      <button
        onClick={onRegister}
        className="w-full py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:border-brand/35 hover:text-brand hover:shadow-sm transition-all"
      >
        Create Partner Account
      </button>
    </div>
  );
}

// ── Registration Screen ─────────────────────────────────────────────────────

function RegistrationScreen({ onBack, onLogin }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);

  const eligibility = ["Thai nationality", "18–70 years old", "No criminal record", "Car under 9 years old"];
  const documents = ["National ID card", "Car registration", "Insurance / ACT", "Driver's license", "Bank book"];

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between py-3 mb-2">
          <button onClick={onLogin} className="text-sm text-slate-500 hover:text-slate-900">← Log In</button>
          <HelloRideWordmark size="sm" />
          <div className="w-16" />
        </div>
        <InfoCard eyebrow="Application Status" title="You're almost there, Partner." body="Complete your training to unlock the road." tone="driver" />
        <StatusStrip
          steps={[
            { label: "Submitted", done: true },
            { label: "Verifying", done: false },
            { label: "Training", done: false },
            { label: "Background", done: false },
            { label: "Active", done: false },
          ]}
        />
        <InfoCard eyebrow="Document Check" title="Verification review" body="Estimated completion: 3-7 days" />
        <InfoCard eyebrow="Academy Learning" title="Training progress" body="2/5 lessons completed" />
        <button onClick={onLogin} className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand to-brand-deep text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(21,74,168,0.28)] active:scale-95 transition-all">
          Back to Log In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between py-3 mb-2">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900">← Back</button>
        <HelloRideWordmark size="sm" />
        <button onClick={onLogin} className="text-sm text-slate-500 hover:text-slate-900">Log In</button>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900">Drive with Hello Ride</h2>
        <p className="text-sm text-muted mt-1">
          Join BKK Airport's proactive taxi dispatch network. Complete your details to begin the onboarding process.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {[
          { key: "firstName", label: "First name", placeholder: "Somchai" },
          { key: "lastName", label: "Last name", placeholder: "Jaidee" },
          { key: "phone", label: "Mobile phone", placeholder: "+66 081 234 5678" },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">{label}</p>
            <input
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all shadow-sm"
            />
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">Eligibility criteria</p>
        <div className="grid grid-cols-2 gap-1.5">
          {eligibility.map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="text-brand">✓</span> {item}
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">Documents required</p>
        <div className="flex flex-col gap-1.5">
          {documents.map((doc) => (
            <div key={doc} className="flex justify-between text-xs">
              <span className="text-slate-700">{doc}</span>
              <span className="text-muted">Pending upload</span>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => setSubmitted(true)}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand to-brand-deep text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(21,74,168,0.28)] active:scale-95 transition-all"
      >
        Continue Registration
      </button>
      <p className="text-xs text-muted text-center">Need help? Chat with us 24/7 or call during business hours.</p>
    </div>
  );
}

// ── Forecast Bars ──────────────────────────────────────────────────────────

function ForecastBars({ bars }) {
  const colors = { normal: "bg-brand/50", surge: "bg-amber-400", peak: "bg-danger" };
  return (
    <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
      <div className="h-0.5 bg-brand" />
      <div className="p-5">
        <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-0.5">Today's Demand Forecast</p>
        <p className="text-sm text-slate-600 mb-4">Expected queue pressure</p>
        {/* Surge/Peak labels above bars */}
        <div className="flex gap-1 px-3 mb-1">
          {bars.map((bar, i) => (
            <div key={i} className="flex-1 flex justify-center h-4">
              {bar.label && <span className="text-xs text-amber-600 font-semibold leading-none">{bar.label}</span>}
            </div>
          ))}
        </div>
        {/* Bar area — fixed height so height:X% resolves correctly */}
        <div className="flex items-end gap-1 px-3 bg-slate-50 rounded-xl" style={{ height: '88px' }}>
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-lg ${colors[bar.type]}`}
              style={{ height: `${bar.height}%` }}
            />
          ))}
        </div>
        {/* Time labels below bars */}
        <div className="flex gap-1 px-3 mt-1">
          {bars.map((bar, i) => (
            <div key={i} className="flex-1 flex justify-center">
              <span className="text-xs text-muted">{bar.time}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">Best window: 18:00–20:00 for the strongest airport queue demand.</p>
      </div>
    </div>
  );
}

// ── Driver Workspace ───────────────────────────────────────────────────────

function DriverMetric({ label, value, tone = "default" }) {
  const toneClass = tone === "brand" ? "text-brand" : tone === "danger" ? "text-danger" : "text-[#1a2b5e]";

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 text-xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-gradient-to-r from-brand to-brand-deep py-4 text-base font-black text-white shadow-[0_10px_24px_rgba(21,74,168,0.28)] transition-all active:scale-95 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 active:scale-95"
    >
      {children}
    </button>
  );
}

function StatusToggle({ isOnline, onToggle }) {
  const firstName = D.profile.name.split(" ")[0];

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Driver status</p>
          <p className="mt-0.5 text-xl font-black text-slate-900">{isOnline ? `Online, ${firstName}` : "You are offline"}</p>
          <p className="mt-1 text-xs text-muted">Identity verified · Airport queue eligible</p>
        </div>
        <button
          onClick={onToggle}
          className={`relative h-10 w-[68px] shrink-0 rounded-full transition-colors ${isOnline ? "bg-brand-mid" : "bg-slate-200"}`}
          aria-label={isOnline ? "Go offline" : "Go online"}
        >
          <span className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition-all ${isOnline ? "left-[32px]" : "left-1"}`} />
        </button>
      </div>
    </div>
  );
}

function DemandTeasers() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-[#154aa8]/10 bg-[#e8f0fe] p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#154aa8]">Demand</p>
        <p className="mt-1 text-sm font-bold text-slate-900">50+ cars needed</p>
        <p className="mt-0.5 text-xs text-muted">Terminal 1 pickup zone</p>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-brand">Bonus</p>
        <p className="mt-1 text-sm font-bold text-slate-900">THB 450 available</p>
        <p className="mt-0.5 text-xs text-muted">Airport queue window</p>
      </div>
    </div>
  );
}

function QueueHome({ isOnline, onOnlineToggle, inQueue, onJoinQueue, onAcceptNext }) {
  return (
    <div className="flex flex-col gap-4">
      <StatusToggle isOnline={isOnline} onToggle={onOnlineToggle} />

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Airport queue</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <DriverMetric label={inQueue ? "Queue position" : "Queue status"} value={inQueue ? `#${D.queue.position}` : "--"} />
          <DriverMetric label="Expected wait" value={inQueue ? `${D.queue.waitMin} min` : "--"} />
        </div>
        <div className="mt-4">
          {!inQueue ? (
            <PrimaryButton onClick={onJoinQueue} disabled={!isOnline}>Join Airport Queue</PrimaryButton>
          ) : (
            <PrimaryButton onClick={onAcceptNext}>Accept next airport job</PrimaryButton>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          {isOnline
            ? inQueue ? "Stay near Terminal 1. Your next airport dispatch appears here." : "Join queue to receive airport pickup offers."
            : "Go online to join the airport queue."}
        </p>
      </div>

      <DemandTeasers />
    </div>
  );
}

// ── Countdown Timer Ring ───────────────────────────────────────────────────

function TimerRing({ seconds, total = 12 }) {
  const progress = seconds / total;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const progressLen = circ * progress;
  const isLow = seconds <= 3;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={isLow ? "#dc2626" : "#00a36c"} strokeWidth="8"
          strokeDasharray={`${progressLen} ${circ - progressLen}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
        />
        <text x="55" y="51" textAnchor="middle" fontSize="26" fontWeight="bold"
          fill={isLow ? "#dc2626" : "#0f172a"} fontFamily="system-ui">
          {seconds}
        </text>
        <text x="55" y="67" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">
          seconds
        </text>
      </svg>
      <p className="text-xs text-muted">Offer expires soon</p>
    </div>
  );
}

// ── Job Request Screen ─────────────────────────────────────────────────────

function JobOfferHome({ activeTrip, onAccept, onReject }) {
  const [seconds, setSeconds] = useState(12);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-brand/10 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-brand">New job offer</p>
            <p className="font-headline font-black text-3xl text-brand">{fareLabel(activeTrip)}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{activeTrip.passengerName}</p>
            <p className="text-xs text-muted">{activeTrip.vehicleType} · Priority airport dispatch</p>
          </div>
          <TimerRing seconds={seconds} total={12} />
        </div>

        <RouteTimeline
          pickup={fullPickup(activeTrip)}
          pickupAddress={activeTrip.pickupAddress}
          dropoff={fullDestination(activeTrip)}
          dropoffAddress={activeTrip.destinationArea}
        />

        <div className="mt-4 grid grid-cols-3 gap-2">
          <DriverMetric label="ETA" value={`${activeTrip.etaMin} min`} />
          <DriverMetric label="Pax" value={activeTrip.passengerCount} />
          <DriverMetric label="Bags" value={activeTrip.luggageCount} />
        </div>
        <p className="mt-4 rounded-2xl bg-brand/5 p-3 text-xs leading-relaxed text-slate-600">{activeTrip.matchingReason}</p>
        <div className="mt-5 flex flex-col gap-2">
          <PrimaryButton onClick={onAccept}>ACCEPT JOB</PrimaryButton>
          <SecondaryButton onClick={onReject}>Reject</SecondaryButton>
        </div>
      </div>
    </div>
  );
}

function NavigationHome({ activeTrip, onArrived }) {
  return (
    <div className="-mx-5 -mb-4 -mt-4 flex min-h-[calc(100vh-164px)] flex-col">

      {/* ── Airport schematic map ── */}
      <div className="relative overflow-hidden" style={{ height: "232px" }}>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 390 232"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern id="nav-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#d8e1ea" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Base layer */}
          <rect width="390" height="232" fill="#edf1f5" />
          <rect width="390" height="232" fill="url(#nav-grid)" />

          {/* Main approach road */}
          <rect x="0" y="180" width="390" height="24" fill="#e2e8ef" />
          <line x1="0" y1="192" x2="390" y2="192" stroke="white" strokeWidth="1" strokeDasharray="22 14" opacity="0.7" />

          {/* Terminal access road (vertical) */}
          <rect x="137" y="97" width="26" height="83" fill="#e2e8ef" />

          {/* Terminal 1 building block */}
          <rect x="22" y="18" width="258" height="54" rx="5" fill="white" stroke="#cdd5de" strokeWidth="1" />
          <text x="151" y="44" textAnchor="middle" fontSize="9" fill="#90a0b0" fontFamily="system-ui,sans-serif" fontWeight="700" letterSpacing="2">TERMINAL 1</text>
          <text x="151" y="60" textAnchor="middle" fontSize="8" fill="#b8c8d4" fontFamily="system-ui,sans-serif">Suvarnabhumi Airport · BKK</text>

          {/* Pickup zone strip */}
          <rect x="88" y="77" width="126" height="20" rx="3" fill="#dbeafe" stroke="#93c5fd" strokeWidth="0.75" />
          <text x="151" y="91" textAnchor="middle" fontSize="8" fill="#3b82f6" fontFamily="system-ui,sans-serif" fontWeight="600" letterSpacing="0.5">PICKUP ZONE</text>

          {/* Route: driver position → left along road → up access road → pickup zone */}
          <path
            d="M 298 192 L 150 192 L 150 97"
            fill="none"
            stroke="#93c5fd"
            strokeWidth="3"
            strokeDasharray="6 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Driver position dot */}
          <circle cx="298" cy="192" r="9" fill="#154aa8" />
          <circle cx="298" cy="192" r="15" fill="none" stroke="#154aa8" strokeWidth="1.5" opacity="0.18" />
          <text x="298" y="196" textAnchor="middle" fontSize="9" fill="white" fontFamily="system-ui,sans-serif" fontWeight="bold">▲</text>

          {/* Destination pin at pickup zone */}
          <circle cx="150" cy="88" r="6" fill="white" stroke="#154aa8" strokeWidth="2" />
          <circle cx="150" cy="88" r="2.5" fill="#154aa8" />
        </svg>

        {/* ETA pill — compact two-line overlay */}
        <div className="absolute top-3 left-3 rounded-xl bg-white/97 px-3.5 py-2.5 shadow-md border border-slate-200/60 backdrop-blur-sm">
          <p className="text-sm font-black text-slate-900 leading-none">{activeTrip.etaMin} min · 200 m</p>
          <p className="mt-1 text-xs text-slate-500 leading-none">to {activeTrip.pickupGate}</p>
        </div>
      </div>

      {/* ── Bottom sheet ── */}
      <div className="relative -mt-5 flex-1 rounded-t-[2rem] bg-white px-5 pb-6 pt-4 shadow-[0_-10px_28px_rgba(15,35,68,0.10)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-mid" />
          <p className="text-xs font-extrabold uppercase tracking-widest text-brand">En route to pickup</p>
        </div>
        <h2 className="text-xl font-black text-slate-900 leading-snug">Head to pickup zone</h2>

        {/* Compact route card */}
        <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-1">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-brand flex-shrink-0" />
              <div className="w-px flex-1 bg-slate-200 my-1.5" />
              <div className="w-2.5 h-2.5 rounded-sm bg-danger flex-shrink-0" />
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Pickup</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{activeTrip.pickupGate}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Destination</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{fullDestination(activeTrip)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Passenger strip */}
        <div className="mt-2.5 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-slate-400 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{activeTrip.passengerName}</p>
            <p className="text-xs text-muted">{activeTrip.passengerCount} pax · {activeTrip.luggageCount} bags</p>
          </div>
        </div>

        {/* Message / Call */}
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <button className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined text-[17px]">chat</span>
            Message
          </button>
          <button className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined text-[17px]">call</span>
            Call
          </button>
        </div>

        <div className="mt-3">
          <PrimaryButton onClick={onArrived}>Arrived at Pick-up</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function TripInProgressHome({ activeTrip, onComplete }) {
  return (
    <div className="flex flex-col gap-4">
      <InfoCard
        eyebrow="Trip in progress"
        title={`Drive to ${fullDestination(activeTrip)}`}
        body={`${activeTrip.distanceKM} km · ${activeTrip.tripTimeMin} mins estimated`}
        tone="driver"
      />
      <RouteTimeline
        pickup={fullPickup(activeTrip)}
        pickupAddress={activeTrip.pickupAddress}
        dropoff={fullDestination(activeTrip)}
        dropoffAddress={activeTrip.destinationArea}
      />
      <InfoCard
        eyebrow="Passenger"
        title={activeTrip.passengerName}
        body={`${activeTrip.passengerCount} passengers · ${activeTrip.luggageCount} luggage`}
        tone="neutral"
      />
      <PrimaryButton onClick={onComplete}>Confirm Drop-off</PrimaryButton>
    </div>
  );
}

function CompletedTripHome({ activeTrip, onConfirmPayment }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-brand px-5 py-7 text-center text-white shadow-lg">
        <span className="material-symbols-outlined mb-2 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        <p className="font-headline text-2xl font-black">Trip Complete</p>
        <p className="mt-1 text-sm text-white/80">{activeTrip.paymentStatus}</p>
      </div>
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">Fare summary</p>
        {[
          ["Total fare", fareLabel(activeTrip), true],
          [`Distance (${activeTrip.distanceKM} km)`, "Included"],
          [`Time (${activeTrip.tripTimeMin} mins)`, "Included"],
          ["Booking fee", `THB ${activeTrip.bookingFeeTHB}`],
          ["Destination", fullDestination(activeTrip)],
          ["Vehicle", activeTrip.vehicleType],
        ].map(([label, value, isTotal]) => (
          <div key={label} className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
            <p className={isTotal ? "text-sm font-bold text-slate-900" : "text-sm text-muted"}>{label}</p>
            <p className={isTotal ? "font-headline text-xl font-black text-brand" : "text-sm font-semibold text-slate-700"}>{value}</p>
          </div>
        ))}
      </div>
      <PrimaryButton onClick={onConfirmPayment}>Confirm Payment Received</PrimaryButton>
    </div>
  );
}

function DriverHome({ activeTrip, isOnline, onOnlineToggle, inQueue, onJoinQueue, onAcceptNext, onAccept, onReject, onArrived, onComplete, onConfirmPayment }) {
  if (activeTrip.status === "assigned") {
    return <JobOfferHome activeTrip={activeTrip} onAccept={onAccept} onReject={onReject} />;
  }

  if (activeTrip.status === "accepted") {
    return <NavigationHome activeTrip={activeTrip} onArrived={onArrived} />;
  }

  if (activeTrip.status === "arrived") {
    return <TripInProgressHome activeTrip={activeTrip} onComplete={onComplete} />;
  }

  if (activeTrip.status === "completed") {
    return <CompletedTripHome activeTrip={activeTrip} onConfirmPayment={onConfirmPayment} />;
  }

  return (
    <QueueHome
      isOnline={isOnline}
      onOnlineToggle={onOnlineToggle}
      inQueue={inQueue}
      onJoinQueue={onJoinQueue}
      onAcceptNext={onAcceptNext}
    />
  );
}

function DemandTab() {
  return (
    <div className="flex flex-col gap-4">
      <DemandTeasers />
      <InfoCard
        eyebrow="Recommended hotspot"
        title="Terminal 1 pickup zone"
        body={D.incentive}
        tone="driver"
      />
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Demand action</p>
        <p className="mt-1 text-lg font-black text-slate-900">Stay near lane entry</p>
        <p className="mt-1 text-sm text-muted">Best window: 18:00-20:00 for airport queue demand.</p>
      </div>
      <ForecastBars bars={D.forecastBars} />
    </div>
  );
}

function TripsTab({ activeTrip }) {
  const hasTrip = activeTrip.status !== "idle";
  const timeline = ["assigned", "accepted", "arrived", "completed"];
  const currentIndex = timeline.indexOf(activeTrip.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Current trip</p>
        {hasTrip ? (
          <>
            <p className="mt-1 text-lg font-black text-slate-900">{activeTrip.passengerName} to {fullDestination(activeTrip)}</p>
            <p className="mt-1 text-sm text-muted">{fareLabel(activeTrip)} · {activeTrip.vehicleType} · {activeTrip.status}</p>
            <div className="mt-4 flex items-center gap-2">
              {timeline.map((item, index) => (
                <div key={item} className="flex flex-1 items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${index <= currentIndex ? "bg-brand" : "bg-slate-200"}`} />
                  {index < timeline.length - 1 && <div className={`h-px flex-1 ${index < currentIndex ? "bg-brand" : "bg-slate-200"}`} />}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">No active airport trip.</p>
        )}
      </div>
      {[
        ["T1 to Siam", "THB 420 · Completed 13:20"],
        ["T2 to Sathorn", "THB 360 · Completed 11:45"],
        ["T1 to Ari", "THB 310 · Completed 09:10"],
      ].map(([title, body]) => (
        <InfoCard key={title} eyebrow="Recent trip" title={title} body={body} tone="neutral" />
      ))}
    </div>
  );
}

function WalletTab({ activeTrip }) {
  const today = activeTrip.fareTHB + 760;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-brand p-5 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">Today's earnings</p>
        <p className="mt-1 font-headline text-4xl font-black">THB {today}</p>
        <p className="mt-1 text-sm text-white/75">Includes airport trip and demand bonus</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DriverMetric label="Bonus" value="THB 450" tone="brand" />
        <DriverMetric label="Cash" value={fareLabel(activeTrip)} />
      </div>
      <InfoCard eyebrow="Payout summary" title="Next payout: Friday" body="Card and wallet trips settle automatically. Cash trips remain in driver balance." tone="neutral" />
    </div>
  );
}

function ProfileTab({ isOnline, onOnlineToggle, onLogout }) {
  return (
    <div className="flex flex-col gap-4">
      <StatusToggle isOnline={isOnline} onToggle={onOnlineToggle} />
      <InfoCard eyebrow="Driver" title={D.profile.name} body={`${D.profile.score} · Identity verified`} tone="driver" />
      <InfoCard eyebrow="Vehicle" title={D.profile.vehicle} body="Airport pickup eligible · Hello Ride partner" tone="neutral" />
      <div className="rounded-3xl border border-slate-100 bg-white p-2 shadow-sm">
        {["Account settings", "Support center", "Training documents"].map((item) => (
          <button key={item} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
            {item}
            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
          </button>
        ))}
      </div>
      <SecondaryButton onClick={onLogout}>Sign out</SecondaryButton>
    </div>
  );
}

const DRIVER_TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "demand", label: "Demand", icon: "local_fire_department" },
  { id: "trips", label: "Trips", icon: "route" },
  { id: "wallet", label: "Wallet", icon: "account_balance_wallet" },
  { id: "profile", label: "Profile", icon: "person" },
];

function DriverBottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-2 pt-1.5 backdrop-blur">
      <div className="grid grid-cols-5 gap-1">
        {DRIVER_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition-colors ${
                active ? "bg-brand/10 text-brand" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              <span className="material-symbols-outlined text-[22px] leading-none">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function DriverWorkspace({
  activeTrip,
  activeTab,
  setActiveTab,
  isOnline,
  onOnlineToggle,
  inQueue,
  onJoinQueue,
  onAcceptNext,
  onAccept,
  onReject,
  onArrived,
  onComplete,
  onConfirmPayment,
  onLogout,
}) {
  return (
    <>
      <MobileScrollArea className="pb-24">
        <AppHeader isOnline={isOnline} onLogout={onLogout} />
        {activeTab === "home" && (
          <DriverHome
            activeTrip={activeTrip}
            isOnline={isOnline}
            onOnlineToggle={onOnlineToggle}
            inQueue={inQueue}
            onJoinQueue={onJoinQueue}
            onAcceptNext={onAcceptNext}
            onAccept={onAccept}
            onReject={onReject}
            onArrived={onArrived}
            onComplete={onComplete}
            onConfirmPayment={onConfirmPayment}
          />
        )}
        {activeTab === "demand" && <DemandTab />}
        {activeTab === "trips" && <TripsTab activeTrip={activeTrip} />}
        {activeTab === "wallet" && <WalletTab activeTrip={activeTrip} />}
        {activeTab === "profile" && <ProfileTab isOnline={isOnline} onOnlineToggle={onOnlineToggle} onLogout={onLogout} />}
      </MobileScrollArea>
      <DriverBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

// ── Main Driver App ────────────────────────────────────────────────────────

export default function DriverApp() {
  const [step, setStep] = useState("login");
  const [activeTab, setActiveTab] = useState("home");
  const [isOnline, setIsOnline] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const { activeTrip, assignMatch, acceptMatch, markArrived, completeMatch, resetMatch } = useDemoMatching();

  function handleLogout() {
    setStep("login");
    setActiveTab("home");
    setIsOnline(false);
    setInQueue(false);
  }

  function handleJoinQueue() {
    setInQueue(true);
  }

  function handleAcceptNext() {
    assignMatch();
    setActiveTab("home");
  }

  function handleReject() {
    resetMatch();
    setInQueue(false);
    setActiveTab("home");
  }

  function handleConfirmPayment() {
    resetMatch();
    setInQueue(false);
    setActiveTab("home");
  }

  const shouldShowWorkspace = step === "app" || ["assigned", "accepted", "arrived", "completed"].includes(activeTrip.status);

  return (
    <MobileShell>
      {shouldShowWorkspace ? (
        <DriverWorkspace
          activeTrip={activeTrip}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOnline={isOnline || activeTrip.status !== "idle"}
          onOnlineToggle={() => setIsOnline((v) => !v)}
          inQueue={inQueue}
          onJoinQueue={handleJoinQueue}
          onAcceptNext={handleAcceptNext}
          onAccept={acceptMatch}
          onReject={handleReject}
          onArrived={markArrived}
          onComplete={completeMatch}
          onConfirmPayment={handleConfirmPayment}
          onLogout={handleLogout}
        />
      ) : (
        <MobileScrollArea className="pb-8">
          {step === "login" && (
            <LoginScreen
              onLogin={() => setStep("app")}
              onRegister={() => setStep("registration")}
            />
          )}
          {step === "registration" && (
            <RegistrationScreen
              onBack={() => setStep("login")}
              onLogin={() => setStep("login")}
            />
          )}
        </MobileScrollArea>
      )}
    </MobileShell>
  );
}
