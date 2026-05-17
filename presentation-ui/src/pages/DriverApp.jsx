import { useState, useEffect } from "react";
import { DRIVER, DEFAULT_CREDENTIALS } from "../data/mockDriver.js";

const D = DRIVER;
const job = D.guideTrip;

// ── Shared ─────────────────────────────────────────────────────────────────

function AppHeader({ isOnline, onLogout }) {
  return (
    <header className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 -mx-6 mb-4">
      <span className="material-symbols-outlined text-slate-500 text-2xl">menu</span>
      <span className="flex-1 text-[#006e2e] font-headline font-bold text-lg">Hello Ride</span>
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isOnline ? "bg-[#00b14f]/20 text-[#006e2e]" : "bg-slate-100 text-slate-500"
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-[#00b14f]" : "bg-slate-400"}`} />
        {isOnline ? "Online" : "Offline"}
      </div>
      <button onClick={onLogout} className="flex items-center justify-center hover:opacity-70 transition-opacity">
        <span className="material-symbols-outlined text-slate-500 text-2xl">account_circle</span>
      </button>
    </header>
  );
}

function MobileHeader({ title, leftLabel, onLeft, rightLabel }) {
  const isBrand = title === "Hello Ride";
  return (
    <div className="flex items-center justify-between py-3 mb-4">
      <div className="w-20">
        {onLeft && (
          <button onClick={onLeft} className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#006e2e] transition-colors">
            <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
            {leftLabel}
          </button>
        )}
      </div>
      {isBrand ? (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#006e2e] to-[#00b14f] flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-[12px]">directions_car</span>
          </div>
          <p className="text-xl font-black text-[#006e2e] font-headline tracking-tight">Hello Ride</p>
        </div>
      ) : (
        <p className="text-base font-bold text-slate-900">{title}</p>
      )}
      <p className="text-xs text-muted w-20 text-right">{rightLabel}</p>
    </div>
  );
}

function InfoCard({ eyebrow, title, body, tone = "default" }) {
  const cardStyle = {
    driver: { wrap: "bg-emerald-50 border border-emerald-200 shadow-sm", accent: "bg-brand", body: "text-slate-700" },
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

function StatusStrip({ steps, currentStep }) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {steps.map(({ label, done }, i) => (
        <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${done ? "bg-brand" : "bg-slate-300"}`} />
          <span className={`text-xs truncate ${done ? "text-brand-deep" : "text-muted"}`}>{label}</span>
          {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-0.5" />}
        </div>
      ))}
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
      {/* Branded wordmark header */}
      <div className="flex items-center justify-center pt-4 pb-2">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-black text-[#006e2e] font-headline tracking-tight">Hello Ride</p>
          <span className="text-[10px] font-extrabold text-[#006e2e] bg-[#71fe91]/40 border border-[#00b14f]/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Driver
          </span>
        </div>
      </div>

      {/* Hero sign-in card — mint gradient */}
      <div className="bg-gradient-to-br from-[#e8f7ee] to-[#f0fbf4] border border-[#006e2e]/12 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,110,46,0.08)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#006e2e] flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-white text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}>local_taxi</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-[#006e2e] uppercase tracking-widest">Driver Partner Sign In</span>
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
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00b14f] focus:ring-2 focus:ring-[#00b14f]/15 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          />
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-bold mb-2">Password</p>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Enter password"
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00b14f] focus:ring-2 focus:ring-[#00b14f]/15 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          />
        </div>
      </div>

      {error && <p className="text-xs text-danger -mt-1">{error}</p>}

      {/* Primary CTA — saturated green gradient */}
      <button
        onClick={handleLogin}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#22c55e] to-[#00a344] text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(0,163,68,0.3)] hover:shadow-[0_12px_28px_rgba(0,163,68,0.38)] active:scale-95 transition-all"
      >
        Log In
      </button>

      {/* Demo credentials — subtle badge */}
      <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-200 px-1.5 py-0.5 rounded">Demo</span>
        <span className="text-xs text-slate-500">driver_demo / 1234</span>
      </div>

      {/* Secondary action — clean card button */}
      <button
        onClick={onRegister}
        className="w-full py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:border-[#006e2e]/35 hover:text-[#006e2e] hover:shadow-sm transition-all"
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
          <p className="text-base font-bold text-slate-900">Hello Ride</p>
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
        <button onClick={onLogin} className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#22c55e] to-[#00a344] text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(0,163,68,0.3)] active:scale-95 transition-all">
          Back to Log In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between py-3 mb-2">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900">← Back</button>
        <p className="text-base font-bold text-slate-900">Hello Ride</p>
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
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#22c55e] to-[#00a344] text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(0,163,68,0.3)] active:scale-95 transition-all"
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

// ── Guide Screen ───────────────────────────────────────────────────────────

function GuideScreen({ isOnline, onOnlineToggle, onJoinQueue, inQueue, onAcceptJob, onLogout }) {
  const firstName = D.profile.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-4">
      <AppHeader isOnline={isOnline} onLogout={onLogout} />

      <p className="text-sm text-muted">
        Good morning, {firstName}. Stay ready for the next airport queue and peak-arrival bonus.
      </p>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#006e2e] text-3xl">power_settings_new</span>
          <div>
            <p className="font-headline font-bold text-slate-900">Go Online</p>
            <p className="text-xs text-muted">Identity: Verified</p>
          </div>
        </div>
        <button
          onClick={onOnlineToggle}
          className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${isOnline ? "bg-[#00b14f]" : "bg-slate-200"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isOnline ? "left-[26px]" : "left-0.5"}`} />
        </button>
      </div>

      {isOnline && (
        <>
          <div className="bg-[#b7f5cf] rounded-3xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#006e2e] bg-white/50 px-2 py-0.5 rounded-full">LIVE NOW</span>
              <span className="font-headline font-bold text-[#006e2e]">฿450 bonus</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">Sukhumvit zone bonus</p>
            <p className="text-xs text-slate-600 mt-1">{D.incentive}</p>
            <div className="mt-3 h-2 bg-white/50 rounded-full overflow-hidden">
              <div className="h-full w-3/5 bg-[#006e2e] rounded-full" />
            </div>
          </div>
          <div className="bg-[#e8f0fe] rounded-3xl p-5">
            <p className="text-xs font-bold text-[#154aa8] uppercase tracking-wide mb-2">High Demand</p>
            <p className="text-sm font-semibold text-slate-800">50+ cars needed in the next 45 minutes.</p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="bg-white rounded-xl px-3 py-2 flex items-center justify-between">
                <p className="text-xs text-slate-700">Terminal 1 pickup zone</p>
                <span className="text-xs font-bold text-white bg-[#154aa8] rounded-full px-2 py-0.5">Hot</span>
              </div>
              <div className="bg-white rounded-xl px-3 py-2 flex items-center justify-between">
                <p className="text-xs text-slate-700">Stay near lane entry</p>
                <span className="text-xs font-bold text-white bg-[#154aa8] rounded-full px-2 py-0.5">Now</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Airport Queue */}
      <div>
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-1">Airport Queue</p>
        <p className="text-sm text-slate-600 mb-3">Get the next airport pickup</p>

        {!inQueue ? (
          <>
            <p className="text-xs text-muted mb-3">
              Join the airport queue to receive the next dispatch from the arrivals wave.
            </p>
            <button
              onClick={onJoinQueue}
              disabled={!isOnline}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#22c55e] to-[#00a344] text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(0,163,68,0.28)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              Join Airport Queue
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted">You are in queue</p>
                <p className="text-xl font-bold text-slate-900">Position #{D.queue.position}</p>
              </div>
              <div>
                <p className="text-xs text-muted">~{D.queue.waitMin} min wait</p>
                <p className="text-sm text-muted">Estimated until next dispatch</p>
              </div>
            </div>
            <InfoCard
              eyebrow="Next job preview"
              title={job.pickup}
              body={`${job.dropoff} · ${job.payout}`}
              tone="neutral"
            />
            <button
              onClick={onAcceptJob}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#22c55e] to-[#00a344] text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(0,163,68,0.28)] active:scale-95 transition-all"
            >
              Accept job
            </button>
          </div>
        )}
      </div>

      <ForecastBars bars={D.forecastBars} />
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
          stroke={isLow ? "#dc2626" : "#00b14f"} strokeWidth="8"
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

function JobRequestScreen({ isOnline, onAccept, onReject, onLogout }) {
  const [seconds, setSeconds] = useState(12);

  useEffect(() => {
    if (seconds <= 0) { onReject(); return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, onReject]);

  return (
    <div className="flex flex-col gap-4">
      <AppHeader isOnline={isOnline} onLogout={onLogout} />

      <div className="flex gap-2">
        <span className="bg-[#00b14f] text-white text-xs font-bold px-3 py-1 rounded-full">High Demand</span>
        <span className="bg-white text-[#006e2e] text-xs font-bold px-3 py-1 rounded-full border border-[#006e2e]">HelloPay</span>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-medium mb-1">Hello Ride Plus</p>
            <p className="font-headline font-black text-3xl text-[#006e2e]">{job.payout}</p>
            <p className="text-xs text-muted mt-1">{job.fareBreakdown.distanceKm} km · {job.eta}</p>
          </div>
          <TimerRing seconds={seconds} total={12} />
        </div>

        <RouteTimeline
          pickup={job.pickup}
          pickupAddress={job.pickupAddress}
          dropoff={job.dropoff}
          dropoffAddress={job.dropoffAddress}
        />

        <details className="mt-4">
          <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-900">
            More job details
          </summary>
          <div className="mt-3 text-xs text-muted">
            {job.flightRef} · {job.payment} · {job.passengers} passengers · {job.luggage} luggage
          </div>
        </details>

        <button
          onClick={onAccept}
          className="w-full mt-5 bg-gradient-to-r from-[#006e2e] to-[#00b14f] text-white font-headline font-black py-5 rounded-2xl active:scale-95 transition-transform"
        >
          ACCEPT JOB
        </button>
        <button
          onClick={onReject}
          className="w-full mt-2 bg-slate-100 text-slate-600 font-semibold py-3 rounded-2xl hover:bg-slate-200 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

// ── Trip Navigation Screen ─────────────────────────────────────────────────

function TripNavigationScreen({ isOnline, onArrived, onLogout }) {
  return (
    <div className="flex flex-col gap-4">
      <AppHeader isOnline={isOnline} onLogout={onLogout} />

      <InfoCard
        eyebrow="Navigation"
        title="Head north toward the pickup zone"
        body="200 m until next turn"
        tone="neutral"
      />

      <div className="grid grid-cols-2 gap-3">
        <button disabled className="py-2.5 rounded-xl border border-slate-200 text-slate-400 text-sm cursor-not-allowed">
          Message
        </button>
        <button disabled className="py-2.5 rounded-xl border border-slate-200 text-slate-400 text-sm cursor-not-allowed">
          Call
        </button>
      </div>

      <InfoCard
        eyebrow="Passenger"
        title={job.passengerName}
        body={`Hello Car · ${job.payout}`}
        tone="neutral"
      />

      <RouteTimeline
        pickup={job.pickup}
        pickupAddress={job.pickupAddress}
        dropoff={job.dropoff}
        dropoffAddress={job.dropoffAddress}
      />

      <button
        onClick={onArrived}
        className="w-full py-3.5 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-deep transition-colors active:scale-95"
      >
        Arrived at Pick-up
      </button>
    </div>
  );
}

// ── Payment Complete Screen ────────────────────────────────────────────────

function PaymentCompleteScreen({ onDone }) {
  const fb = job.fareBreakdown;
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#006e2e] text-white rounded-b-3xl px-6 py-10 text-center -mx-6 -mt-6">
        <span className="material-symbols-outlined text-5xl mb-3" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48" }}>check_circle</span>
        <p className="font-headline font-black text-2xl">Trip Complete!</p>
        <p className="text-[#b7f5cf] text-sm mt-1">Payment received</p>
      </div>

      <div className="bg-white rounded-3xl shadow-lg p-5 -mt-5">
        <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-4">Fare Breakdown</p>
        <div className="flex flex-col gap-3">
          {[
            ["Total Fare", job.payout, true],
            [`Distance (${fb.distanceKm} km)`, fb.distanceFare, false],
            [`Time (${fb.durationMin} mins)`, fb.durationFare, false],
            ["Booking Fee", fb.bookingFee, false],
          ].map(([label, value, isTotal]) => (
            <div key={label} className={`flex items-center justify-between py-2 border-b border-slate-50 last:border-0 ${isTotal ? "border-b-2 border-slate-100 mb-1" : ""}`}>
              <p className={`text-sm ${isTotal ? "font-bold text-slate-900" : "text-muted"}`}>{label}</p>
              <p className={isTotal ? "text-xl font-headline font-black text-[#006e2e]" : "text-sm font-semibold text-slate-700"}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onDone}
        className="w-full py-4 rounded-full bg-gradient-to-br from-[#006e2e] to-[#00b14f] text-white font-headline font-extrabold text-lg shadow-[0_8px_24px_rgba(0,110,46,0.25)] active:scale-95 transition-transform"
      >
        Confirm Payment Received
      </button>
    </div>
  );
}

// ── Main Driver App ────────────────────────────────────────────────────────

export default function DriverApp() {
  const [step, setStep] = useState("login");
  const [isOnline, setIsOnline] = useState(false);
  const [inQueue, setInQueue] = useState(false);

  function handleLogout() {
    setStep("login");
    setIsOnline(false);
    setInQueue(false);
  }

  return (
    <div className="max-w-md mx-auto px-6 py-6">
      {step === "login" && (
        <LoginScreen
          onLogin={() => setStep("guide")}
          onRegister={() => setStep("registration")}
        />
      )}
      {step === "registration" && (
        <RegistrationScreen
          onBack={() => setStep("login")}
          onLogin={() => setStep("login")}
        />
      )}
      {step === "guide" && (
        <GuideScreen
          isOnline={isOnline}
          onOnlineToggle={() => setIsOnline((v) => !v)}
          onJoinQueue={() => setInQueue(true)}
          inQueue={inQueue}
          onAcceptJob={() => setStep("jobRequest")}
          onLogout={handleLogout}
        />
      )}
      {step === "jobRequest" && (
        <JobRequestScreen
          isOnline={isOnline}
          onAccept={() => setStep("tripNavigation")}
          onReject={() => { setInQueue(false); setStep("guide"); }}
          onLogout={handleLogout}
        />
      )}
      {step === "tripNavigation" && (
        <TripNavigationScreen
          isOnline={isOnline}
          onArrived={() => setStep("paymentComplete")}
          onLogout={handleLogout}
        />
      )}
      {step === "paymentComplete" && (
        <PaymentCompleteScreen
          onDone={() => { setInQueue(false); setStep("guide"); }}
        />
      )}
    </div>
  );
}
