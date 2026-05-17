import { useState } from "react";
import { PASSENGER, RIDES, PAYMENT_OPTIONS, TIP_OPTIONS, DESTINATION_PRESETS } from "../data/mockPassenger.js";
import PassengerSupportChat from "../components/passenger/PassengerSupportChat.jsx";

// ── Step Indicator ────────────────────────────────────────────────────────

const STEPS = [
  { id: "home", label: "Trip details" },
  { id: "carType", label: "Choose ride" },
  { id: "ride", label: "Confirmed" },
  { id: "review", label: "Review" },
];

function StepIndicator({ current }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center gap-1.5 ${i <= idx ? "text-slate-900" : "text-muted"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-all ${
              i < idx ? "bg-brand text-white" : i === idx ? "bg-brand text-white ring-4 ring-brand/20" : "bg-slate-200 text-slate-400"
            }`}>
              {i < idx ? "✓" : i + 1}
            </div>
            <span className="text-xs font-medium hidden sm:block">{step.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 mx-1.5 rounded-full transition-colors ${i < idx ? "bg-brand/40" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Shared Mobile Header ──────────────────────────────────────────────────

function MobileHeader({ title, backLabel, onBack, rightLabel, showAvatar }) {
  const isBrand = title === "Hello Ride";
  return (
    <div className="flex items-center justify-between py-3 mb-4">
      <div className="w-16">
        {onBack && (
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-[#f6f3f2] flex items-center justify-center hover:bg-[#ede9e8] transition-colors">
            <span className="material-symbols-outlined text-[#006e2e] text-xl">arrow_back</span>
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
      <div className="w-16 flex justify-end">
        {showAvatar && (
          <div className="w-8 h-8 rounded-full bg-[#006e2e]/15 border border-[#006e2e]/25 flex items-center justify-center text-xs font-bold text-[#006e2e]">
            NT
          </div>
        )}
        {rightLabel && <p className="text-xs text-muted">{rightLabel}</p>}
      </div>
    </div>
  );
}

// ── Route Summary Card ─────────────────────────────────────────────────────

function RouteSummary({ pickup, destination }) {
  return (
    <div className="bg-[#f6f3f2] rounded-2xl p-3.5 flex items-stretch gap-3">
      <div className="flex flex-col items-center gap-1 pt-1">
        <div className="w-3 h-3 rounded-full bg-[#006e2e]" />
        <div className="w-0.5 flex-1 bg-[#c8c5c4]" />
        <div className="w-3 h-3 rounded bg-[#d54b72]" />
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="bg-white rounded-xl px-3 py-2.5">
          <p className="text-xs text-muted mb-0.5">Pickup</p>
          <p className="text-sm font-medium text-slate-800">Suvarnabhumi Airport, Terminal 1</p>
        </div>
        <div className="bg-white rounded-xl px-3 py-2.5">
          <p className="text-xs text-muted mb-0.5">Destination</p>
          <p className={`text-sm font-medium ${destination ? "text-slate-900" : "text-slate-400"}`}>
            {destination || "Where to?"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Counter ────────────────────────────────────────────────────────────────

function Counter({ label, subtitle, value, onChange, min = 0, max = 10, icon }) {
  return (
    <div className="bg-[#f6f3f2] p-3.5 rounded-2xl flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon && <span className="material-symbols-outlined text-[#006e2e] text-xl">{icon}</span>}
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-full bg-[#e5e2e1] flex items-center justify-center font-bold text-slate-700 hover:bg-[#d5d2d1] transition-colors"
        >
          −
        </button>
        <span className="text-slate-900 font-bold w-8 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-7 h-7 rounded-full bg-[#00b14f]/20 text-[#006e2e] flex items-center justify-center font-bold hover:bg-[#00b14f]/30 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── Home Screen ────────────────────────────────────────────────────────────

function HomeScreen({ onNext }) {
  const [dest, setDest] = useState("");
  const [destInput, setDestInput] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [specialAssistance, setSpecialAssistance] = useState(false);
  const [notes, setNotes] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = DESTINATION_PRESETS.filter((p) =>
    p.toLowerCase().includes(destInput.toLowerCase())
  ).slice(0, 8);

  const isValid = dest && passengers >= 1;

  return (
    <div className="flex flex-col gap-4">
      <MobileHeader title="Hello Ride" showAvatar />

      {/* Destination input */}
      <div>
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">Destination</p>
        <div className="relative">
          <input
            type="text"
            value={destInput}
            onChange={(e) => {
              setDestInput(e.target.value);
              setDest("");
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search Bangkok destination"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all shadow-sm"
          />
          {showSuggestions && destInput && filtered.length > 0 && !dest && (
            <div className="absolute z-10 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
              {filtered.map((s) => (
                <button
                  key={s}
                  onClick={() => { setDest(s); setDestInput(s); setShowSuggestions(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        {!destInput && (
          <div className="flex flex-wrap gap-2 mt-2">
            {DESTINATION_PRESETS.slice(0, 6).map((s) => (
              <button
                key={s}
                onClick={() => { setDest(s); setDestInput(s); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Route summary */}
      <RouteSummary pickup={PASSENGER.route.pickup} destination={dest} />

      {/* Trip details */}
      <div>
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">Trip details</p>
        <p className="text-sm text-muted mb-3">Configure your ride</p>
        <div className="flex flex-col gap-2">
          <Counter
            label="Passengers"
            subtitle="How many travelers are riding"
            value={passengers}
            onChange={setPassengers}
            min={1}
            max={10}
            icon="person"
          />
          <Counter
            label="Luggage"
            subtitle="Bags or suitcases to carry"
            value={luggage}
            onChange={setLuggage}
            min={0}
            max={8}
            icon="luggage"
          />
        </div>
        <p className="text-xs text-muted mt-2">
          Adjust the party size and luggage count before confirming your airport pickup.
        </p>
      </div>

      {/* Special assistance */}
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
        <p className="text-sm text-slate-900">Special Assistance</p>
        <button
          onClick={() => setSpecialAssistance((v) => !v)}
          className={`w-11 h-6 rounded-full transition-colors relative ${specialAssistance ? "bg-brand" : "bg-slate-200"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${specialAssistance ? "translate-x-5.5 left-0.5" : "left-0.5"}`} />
        </button>
      </div>

      {/* Additional notes */}
      <div>
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">Additional Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. In front of the building"
          rows={2}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-none shadow-sm"
        />
      </div>

      <button
        onClick={() => isValid && onNext({ dest, passengers, luggage, specialAssistance, notes })}
        disabled={!isValid}
        className="w-full py-5 rounded-full bg-gradient-to-br from-[#006e2e] to-[#00b14f] text-white font-headline font-extrabold text-lg shadow-[0_12px_28px_rgba(0,110,46,0.3)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform flex items-center justify-center gap-2"
      >
        Confirm Pick-up
        <span className="material-symbols-outlined text-[20px]">bolt</span>
      </button>
    </div>
  );
}

// ── Car Type Screen ────────────────────────────────────────────────────────

const RIDE_BADGES = {
  "hello-taxi": { label: "Cheapest", cls: "bg-[#003a15] text-white" },
  "hello-car":  { label: "Popular",  cls: "bg-[#006e2e]/15 text-[#006e2e]" },
  "hello-suv":  { label: "Most Space", cls: "bg-slate-200 text-slate-600" },
};

const RIDE_ICONS = {
  "hello-taxi": "local_taxi",
  "hello-car":  "directions_car",
  "hello-suv":  "airport_shuttle",
};

function CarTypeScreen({ passengers, luggage, onBack, onNext }) {
  const [selectedRide, setSelectedRide] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);

  function isEligible(ride) {
    return passengers <= ride.maxPassengers && luggage <= ride.maxLuggage;
  }

  const activePay = PAYMENT_OPTIONS.find((p) => p.id === selectedPayment);

  return (
    <div className="flex flex-col gap-5">
      <MobileHeader title="Hello Ride" backLabel="Back" onBack={onBack} />

      {/* Current journey card */}
      <RouteSummary destination="Asok BTS Station" />

      {/* Ride selection */}
      <div>
        <p className="text-xl font-extrabold font-headline text-slate-900 leading-tight">Select ride</p>
        <p className="text-xs text-muted mt-0.5 mb-4">Estimated arrival: 4 mins</p>
        <div className="flex flex-col gap-3">
          {RIDES.map((ride) => {
            const eligible = isEligible(ride);
            const selected = selectedRide === ride.id;
            const badge = RIDE_BADGES[ride.id];
            const icon = RIDE_ICONS[ride.id] ?? "local_taxi";
            return (
              <button
                key={ride.id}
                onClick={() => eligible && setSelectedRide(ride.id)}
                disabled={!eligible}
                className={`w-full text-left rounded-[1.5rem] p-5 flex items-center gap-4 transition-all duration-200 ${
                  !eligible
                    ? "bg-slate-50 opacity-40 cursor-not-allowed"
                    : selected
                    ? "bg-[#71fe91] shadow-[0_6px_24px_rgba(0,177,79,0.22)]"
                    : "bg-[#f6f3f2] hover:bg-[#ede9e8] hover:shadow-md"
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                  selected ? "bg-white/50" : "bg-[#e5e2e1]"
                }`}>
                  <span className={`material-symbols-outlined text-4xl ${selected ? "text-[#003a15]" : "text-[#006e2e]"}`}>{icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className={`text-base font-bold ${selected ? "text-[#002109]" : "text-slate-900"}`}>{ride.label}</p>
                    {badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${selected ? "text-[#005321]" : "text-muted"}`}>
                    {ride.description}
                    {!eligible && ` · Max ${ride.maxPassengers} pax, ${ride.maxLuggage} bags`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-black font-headline ${selected ? "text-[#003a15]" : "text-slate-900"}`}>{ride.price}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment — wallet card style */}
      <div>
        <p className="text-base font-extrabold font-headline text-slate-900 mb-3">Payment</p>
        {activePay && !showPaymentPicker ? (
          <div className="flex items-center justify-between bg-white border-2 border-[#006e2e]/10 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#003a15] rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  {activePay.id === "card" ? "credit_card" : "account_balance_wallet"}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{activePay.detail}</p>
                <p className="text-xs text-muted">{activePay.value}</p>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentPicker(true)}
              className="text-[#006e2e] font-bold text-sm px-4 py-1.5 hover:bg-[#006e2e]/8 rounded-full transition-colors"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {PAYMENT_OPTIONS.map((pay) => (
              <button
                key={pay.id}
                onClick={() => { setSelectedPayment(pay.id); setShowPaymentPicker(false); }}
                className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 hover:border-[#006e2e]/40 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 bg-[#003a15] rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    {pay.id === "card" ? "credit_card" : "account_balance_wallet"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{pay.detail}</p>
                  <p className="text-xs text-muted">{pay.value}</p>
                </div>
                <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => selectedRide && selectedPayment && onNext({ selectedRide, selectedPayment })}
        disabled={!selectedRide || !selectedPayment}
        className="w-full py-5 rounded-full bg-gradient-to-br from-[#006e2e] to-[#00b14f] text-white font-headline font-extrabold text-lg shadow-[0_12px_28px_rgba(0,110,46,0.3)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform flex items-center justify-center gap-2"
      >
        Book ride
        <span className="material-symbols-outlined text-[20px]">bolt</span>
      </button>
    </div>
  );
}

// ── Ride Confirmation Screen ───────────────────────────────────────────────

function RideScreen({ dest, passengers, luggage, selectedRide, selectedPayment, specialAssistance, notes, onBack, onNext }) {
  const ride = RIDES.find((r) => r.id === selectedRide);
  const payment = PAYMENT_OPTIONS.find((p) => p.id === selectedPayment);
  const driver = PASSENGER.tracking;

  return (
    <div className="flex flex-col gap-4">
      <MobileHeader title="Hello Ride" backLabel="Back" onBack={onBack} showAvatar />

      {/* Trip complete */}
      <div className="bg-brand/10 border border-brand/25 rounded-2xl p-5">
        <p className="text-xs text-brand-deep uppercase tracking-widest font-medium">Trip complete</p>
        <h2 className="text-xl font-bold text-slate-900 mt-1">Arrived at {dest}</h2>
        <p className="text-sm text-slate-600 mt-1">
          {PASSENGER.route.pickup} → {dest}
        </p>
        <p className="text-sm text-slate-600">Driver {driver.driver}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand/15">
          <p className="text-xs text-muted">Fare</p>
          <p className="text-xl font-bold text-slate-900">{ride?.price}</p>
        </div>
      </div>

      {/* Trip summary */}
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5">
        <p className="text-sm font-bold text-slate-900 mb-4">Trip summary</p>
        {[
          ["Route", `${PASSENGER.route.pickup} → ${dest}`],
          ["Party", `${passengers} passengers · ${luggage} luggage`],
          ["Ride", `${ride?.label} · ${ride?.description}`],
          ...(specialAssistance ? [["Support", "Special assistance requested"]] : []),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-100">
            <p className="text-xs text-muted">{label}</p>
            <p className="text-sm text-slate-900 text-right">{value}</p>
          </div>
        ))}
        {notes && (
          <div className="flex justify-between gap-4 py-2">
            <p className="text-xs text-muted">Notes</p>
            <p className="text-xs text-muted text-right">{notes}</p>
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5">
        <p className="text-sm font-bold text-slate-900 mb-4">Payment</p>
        <div className="flex justify-between py-2 border-b border-slate-100">
          <p className="text-xs text-muted">Method</p>
          <p className="text-sm text-slate-900">{payment?.label} · {payment?.detail}</p>
        </div>
        <div className="flex justify-between py-2">
          <p className="text-xs text-muted">Total</p>
          <p className="text-lg font-bold text-slate-900">{ride?.price}</p>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 rounded-full bg-gradient-to-br from-[#006e2e] to-[#00b14f] text-white font-headline font-extrabold text-lg shadow-[0_8px_24px_rgba(0,110,46,0.25)] active:scale-95 transition-transform"
      >
        Leave a Review →
      </button>

      <button
        onClick={onBack}
        className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:border-slate-400 hover:text-slate-700 transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// ── Review Screen ──────────────────────────────────────────────────────────

function ReviewScreen({ onBack, onHome }) {
  const [rating, setRating] = useState(5);
  const [tip, setTip] = useState("฿50");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const driver = PASSENGER.tracking;
  const driverFirst = driver.driver.split(" ")[0];

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <MobileHeader title="Hello Ride" backLabel="Close" onBack={onBack} />
        <div className="bg-brand/10 border border-brand/25 rounded-2xl p-6 text-center">
          <p className="text-xs text-brand-deep uppercase tracking-widest font-medium mb-2">Review submitted!</p>
          <p className="text-xl font-bold text-slate-900">Thanks for your feedback</p>
          <p className="text-sm text-muted mt-2">Thank you for your feedback, {driverFirst}.</p>
        </div>
        <button
          onClick={onHome}
          className="w-full py-4 rounded-full bg-gradient-to-br from-[#006e2e] to-[#00b14f] text-white font-headline font-extrabold text-lg shadow-[0_8px_24px_rgba(0,110,46,0.25)] active:scale-95 transition-transform"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MobileHeader title="How was your ride?" backLabel="Close" onBack={onBack} rightLabel="Hello Ride" />

      {/* Driver card */}
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5">
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">Driver</p>
        <p className="text-base font-bold text-slate-900">{driver.driver}</p>
        <p className="text-xs text-muted">{driver.vehicle} · {driver.plate}</p>
      </div>

      {/* Star rating */}
      <div>
        <p className="text-sm font-bold text-slate-900 mb-1">Tap to rate</p>
        <p className="text-xs text-muted mb-3">Choose a star rating</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`flex-1 py-3 rounded-xl text-lg transition-all ${
                star <= rating ? "bg-brand/20 text-brand-deep" : "bg-slate-100 text-slate-400"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-900">Add a tip for {driverFirst}?</p>
          <p className="text-xs text-muted">Optional</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {TIP_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setTip(tip === t ? null : t)}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tip === t ? "bg-brand text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div>
        <p className="text-sm font-bold text-slate-900 mb-2">Leave a comment</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (e.g. 'Great driver, clean car!')"
          rows={3}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-none shadow-sm"
        />
      </div>

      <button
        onClick={() => setSubmitted(true)}
        className="w-full py-4 rounded-full bg-gradient-to-br from-[#006e2e] to-[#00b14f] text-white font-headline font-extrabold text-lg shadow-[0_8px_24px_rgba(0,110,46,0.25)] active:scale-95 transition-transform"
      >
        Submit Review →
      </button>
    </div>
  );
}

// ── Main Passenger Portal ──────────────────────────────────────────────────

export default function PassengerPortal() {
  const [step, setStep] = useState("home");
  const [tripData, setTripData] = useState({});

  function handleHomeNext(data) {
    setTripData(data);
    setStep("carType");
  }

  function handleCarTypeNext(data) {
    setTripData((prev) => ({ ...prev, ...data }));
    setStep("ride");
  }

  function handleRideNext() {
    setStep("review");
  }

  function handleHome() {
    setStep("home");
    setTripData({});
  }

  return (
    // Phone shell — relative + overflow-hidden scopes the absolute FAB/sheet/backdrop
    <div className="relative max-w-md mx-auto overflow-hidden h-[calc(100vh-52px)]">
      {/* Scrollable content — pb-28 keeps content clear of the FAB */}
      <div className="overflow-y-auto h-full px-6 py-6 pb-28">
        {step !== "home" && (
          <div className="mb-4">
            <StepIndicator current={step} />
          </div>
        )}

        {step === "home" && <HomeScreen onNext={handleHomeNext} />}
        {step === "carType" && (
          <CarTypeScreen
            passengers={tripData.passengers}
            luggage={tripData.luggage}
            onBack={() => setStep("home")}
            onNext={handleCarTypeNext}
          />
        )}
        {step === "ride" && (
          <RideScreen
            dest={tripData.dest}
            passengers={tripData.passengers}
            luggage={tripData.luggage}
            selectedRide={tripData.selectedRide}
            selectedPayment={tripData.selectedPayment}
            specialAssistance={tripData.specialAssistance}
            notes={tripData.notes}
            onBack={() => setStep("carType")}
            onNext={handleRideNext}
          />
        )}
        {step === "review" && (
          <ReviewScreen
            onBack={() => setStep("ride")}
            onHome={handleHome}
          />
        )}
      </div>

      {/* Support chat rendered as a direct child of the shell so it positions
          relative to the phone container, not the browser viewport */}
      <PassengerSupportChat />
    </div>
  );
}
