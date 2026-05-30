import { useEffect, useState } from "react";
import { RIDES, PAYMENT_OPTIONS, TIP_OPTIONS, DESTINATION_PRESETS } from "../data/mockPassenger.js";
import PassengerSupportChat from "../components/passenger/PassengerSupportChat.jsx";
import { HelloRideWordmark, MobileScrollArea, MobileShell } from "../components/shared/MobileShell.jsx";
import { useDemoMatching } from "../context/useDemoMatching.js";
import { useLanguage } from "../context/useLanguage.js";

function fareLabel(activeTrip) {
  return `THB ${activeTrip.fareTHB}`;
}

function destinationLabel(activeTrip) {
  return activeTrip.selectedDestination || activeTrip.destinationName || "";
}

function pickupLabel(activeTrip) {
  return `${activeTrip.pickupGate}, ${activeTrip.pickupTerminal}`;
}

function driverPlateNumber(activeTrip) {
  const plateByDriverId = {
    D101: "9กก 9867",
    D118: "2ขข 1188",
    D124: "3กท 1240",
    D205: "8กก 2055",
  };
  return plateByDriverId[activeTrip.driverId] ||
    activeTrip.assignedDriver?.plateNumber ||
    activeTrip.assignedDriver?.plate ||
    "Taxi plate pending";
}

function passengerVehicleLabel(activeTrip) {
  const plate = driverPlateNumber(activeTrip);
  return activeTrip.vehicleType ? `${plate} · ${activeTrip.vehicleType}` : plate;
}

function canShowPassengerReview(activeTrip) {
  return activeTrip.status === "completed" &&
    (activeTrip.driverPaymentConfirmed === true || activeTrip.passengerReviewPending === true);
}

function fareToNumber(price) {
  const parsed = Number(String(price || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

// ── Shared Mobile Header ──────────────────────────────────────────────────

function BrandHeader() {
  return <HelloRideWordmark />;
}

function MobileHeader({ title, backLabel, onBack, rightLabel }) {
  const isBrand = title === "Hello Ride";
  return (
    <div className="flex items-center justify-between py-2.5 mb-3">
      <div className="w-16">
        {onBack && (
          <button
            onClick={onBack}
            aria-label={backLabel || "Back"}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-brand text-xl">arrow_back</span>
          </button>
        )}
      </div>
      {isBrand ? (
        <BrandHeader />
      ) : (
        <p className="text-base font-bold text-[#1a2b5e]">{title}</p>
      )}
      <div className="w-16 flex justify-end">
        {rightLabel && <p className="text-xs text-muted">{rightLabel}</p>}
      </div>
    </div>
  );
}

// ── Route Summary Card ─────────────────────────────────────────────────────

function RouteSummary({ pickup, destination }) {
  const { t } = useLanguage();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-stretch gap-3">
      <div className="flex flex-col items-center gap-1 pt-1.5">
        <div className="w-2.5 h-2.5 rounded-full border-2 border-brand-mid bg-white" />
        <div className="w-px flex-1 bg-slate-300" />
        <div className="w-2.5 h-2.5 rounded-sm bg-[#154aa8]" />
      </div>
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-0.5">{t("passenger.from")}</p>
          <p className="text-sm font-bold text-[#1a2b5e]">Suvarnabhumi Airport, Terminal 1</p>
          {pickup && <p className="text-xs text-muted mt-0.5">{pickup}</p>}
        </div>
        <div className="pt-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-0.5">{t("passenger.to")}</p>
          <p className={`text-sm font-bold ${destination ? "text-slate-900" : "text-slate-400"}`}>
            {destination || t("passenger.whereTo")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Counter ────────────────────────────────────────────────────────────────

function Counter({ label, subtitle, value, onChange, min = 0, max = 10, icon }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm px-3.5 py-3 rounded-2xl flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <span className="w-8 h-8 rounded-xl bg-brand/5 border border-brand/10 text-brand flex items-center justify-center material-symbols-outlined text-lg shrink-0">
            {icon}
          </span>
        )}
        <div>
          <p className="text-sm font-bold text-slate-900">{label}</p>
          {subtitle && <p className="text-xs text-muted mt-0.5 leading-snug">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200 transition-colors"
        >
          −
        </button>
        <span className="text-slate-900 font-black w-7 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full bg-brand-mid text-white flex items-center justify-center font-bold hover:bg-[#008f5e] transition-colors shadow-sm"
        >
          +
        </button>
      </div>
    </div>
  );
}

function FlowSection({ title, children }) {
  return (
    <section className="flex flex-col gap-2.5">
      <p className="text-sm font-extrabold text-[#1a2b5e] font-headline">{title}</p>
      {children}
    </section>
  );
}

// ── QR Entry Simulation ────────────────────────────────────────────────────

function QREntryScreen({ onStart }) {
  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col justify-center gap-5">
      <MobileHeader title="Hello Ride" />
      <div className="rounded-3xl border border-brand/10 bg-white p-6 shadow-[0_14px_36px_rgba(21,74,168,0.10)]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              qr_code_scanner
            </span>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-brand">Airport QR Entry</p>
            <h1 className="mt-0.5 font-headline text-2xl font-black text-slate-900">Scan Airport QR</h1>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          For this demo, QR scan is simulated. In production, the airport QR code opens this passenger booking flow with pickup location pre-filled.
        </p>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detected pickup</p>
          <p className="mt-1 text-base font-bold text-slate-900">BKK Airport · Level 1, Gate 4</p>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-brand-deep py-4 font-headline text-base font-extrabold text-white shadow-[0_12px_28px_rgba(21,74,168,0.28)] active:scale-95 transition-transform"
        >
          Start Passenger Booking
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

// ── Home Screen ────────────────────────────────────────────────────────────

function HomeScreen({ initialData = {}, onNext }) {
  const { t } = useLanguage();
  const { activeTrip, setPassengerDestination } = useDemoMatching();
  const activeDestination = destinationLabel(activeTrip);
  const initialDestination = initialData.selectedDestination || initialData.dest || activeDestination || "";
  const [passengerName, setPassengerName] = useState(initialData.passengerName ?? "");
  const [dest, setDest] = useState(initialDestination);
  const [destInput, setDestInput] = useState(initialDestination);
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [specialAssistance, setSpecialAssistance] = useState(false);
  const [notes, setNotes] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = DESTINATION_PRESETS.filter((p) =>
    p.toLowerCase().includes(destInput.toLowerCase())
  ).slice(0, 8);

  const selectedDestination = dest.trim();
  const passengerNameValue = passengerName.trim();
  const isValid = passengerNameValue && selectedDestination && passengers >= 1;

  return (
    <div className="flex flex-col gap-3.5">
      <MobileHeader title="Hello Ride" />

      <FlowSection title={t("passenger.passengerName")}>
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">person</span>
            <input
              type="text"
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              placeholder={t("passenger.namePlaceholder")}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10 transition-all"
            />
          </div>
          {!passengerNameValue && (
            <p className="mt-2 text-xs font-semibold text-red-600">{t("passenger.nameRequired")}</p>
          )}
        </div>
      </FlowSection>

      <FlowSection title={t("passenger.destination")}>
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              type="text"
              value={destInput}
              onChange={(e) => {
                const value = e.target.value;
                setDestInput(value);
                setDest(value.trim());
                setPassengerDestination(value.trim());
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={t("passenger.destPlaceholder")}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10 transition-all"
            />
            {showSuggestions && destInput && filtered.length > 0 && (
              <div className="absolute z-10 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
                {filtered.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setDest(s); setDestInput(s); setPassengerDestination(s); setShowSuggestions(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!destInput && (
            <div className="flex flex-wrap gap-2 mt-3">
              {DESTINATION_PRESETS.slice(0, 6).map((s) => (
                <button
                  key={s}
                  onClick={() => { setDest(s); setDestInput(s); setPassengerDestination(s); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 hover:text-[#1a2b5e] hover:bg-brand/5 border border-slate-200 hover:border-brand/20 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </FlowSection>

      <FlowSection title={t("passenger.pickupRoute")}>
        <RouteSummary pickup={pickupLabel(activeTrip)} destination={selectedDestination} />
      </FlowSection>

      <FlowSection title={t("passenger.tripDetails")}>
        <div className="flex flex-col gap-2.5">
          <Counter
            label={t("passenger.passengers")}
            subtitle={t("passenger.passengerSubtitle")}
            value={passengers}
            onChange={setPassengers}
            min={1}
            max={10}
            icon="person"
          />
          <Counter
            label={t("passenger.luggage")}
            subtitle={t("passenger.luggageSubtitle")}
            value={luggage}
            onChange={setLuggage}
            min={0}
            max={8}
            icon="luggage"
          />
        </div>
      </FlowSection>

      <FlowSection title={t("passenger.notesAssistance")}>
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-900">{t("passenger.specialAssistance")}</p>
            <p className="text-xs text-muted mt-0.5">{t("passenger.specialAssistanceNote")}</p>
          </div>
          <button
            onClick={() => setSpecialAssistance((v) => !v)}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${specialAssistance ? "bg-brand" : "bg-slate-200"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${specialAssistance ? "translate-x-5.5 left-0.5" : "left-0.5"}`} />
          </button>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("passenger.notePlaceholder")}
          rows={2}
          className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-none shadow-sm"
        />
      </FlowSection>

      <div className="sticky bottom-0 z-40 -mx-5 mt-1 px-5 pt-3 pb-4 bg-gradient-to-t from-[#f5f8fb] via-[#f5f8fb]/95 to-transparent">
        <button
          onClick={() => isValid && onNext({ passengerName: passengerNameValue, selectedDestination, dest: selectedDestination, passengers, luggage, specialAssistance, notes })}
          disabled={!isValid}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand to-brand-deep text-white font-headline font-extrabold text-base shadow-[0_12px_28px_rgba(21,74,168,0.28)] disabled:opacity-100 disabled:from-slate-300 disabled:to-slate-300 disabled:text-white disabled:shadow-none disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {t("passenger.confirmPickup")}
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

// ── Car Type Screen ────────────────────────────────────────────────────────

// Rule-based vehicle default: SUV for large groups, Taxi for small, Car otherwise.
function getDefaultRideId(passengers, luggage) {
  if ((passengers ?? 1) >= 4 || (luggage ?? 0) >= 3) return "hello-suv";
  if ((passengers ?? 1) <= 2 && (luggage ?? 0) <= 1) return "hello-taxi";
  return "hello-car";
}

const RIDE_BADGES = {
  "hello-taxi": { label: "Cheapest", cls: "bg-brand text-white" },
  "hello-car":  { label: "Popular",  cls: "bg-brand/10 text-brand" },
  "hello-suv":  { label: "Most Space", cls: "bg-slate-200 text-slate-600" },
};

const RIDE_ICONS = {
  "hello-taxi": "local_taxi",
  "hello-car":  "directions_car",
  "hello-suv":  "airport_shuttle",
};

function CarTypeScreen({ activeTrip, destination, passengers, luggage, onBack, onNext }) {
  const { t } = useLanguage();
  const [selectedRide, setSelectedRide] = useState(() => getDefaultRideId(passengers, luggage));
  const [selectedPayment, setSelectedPayment] = useState("cash");

  function isEligible(ride) {
    return passengers <= ride.maxPassengers && luggage <= ride.maxLuggage;
  }

  return (
    <div className="flex flex-col gap-5">
      <MobileHeader title="Hello Ride" backLabel="Back" onBack={onBack} />

      {/* Current journey card */}
      <RouteSummary pickup={pickupLabel(activeTrip)} destination={destination} />

      {/* Ride selection */}
      <div>
        <p className="text-xl font-extrabold font-headline text-slate-900 leading-tight">{t("passenger.selectRide")}</p>
        <p className="text-xs text-muted mt-0.5 mb-4">{t("passenger.estimatedArrival")} {activeTrip.etaMin} {t("passenger.minUnit")}</p>
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
                    ? "bg-white border-2 border-brand shadow-[0_10px_28px_rgba(21,74,168,0.16)]"
                    : "bg-white border border-slate-200 hover:border-brand/25 hover:shadow-md"
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                  selected ? "bg-brand/8" : "bg-slate-100"
                }`}>
                  <span className="material-symbols-outlined text-4xl text-brand">{icon}</span>
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
                  <p className={`text-lg font-black font-headline ${selected ? "text-brand" : "text-slate-900"}`}>{ride.price}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment */}
      <div>
        <p className="text-base font-extrabold font-headline text-slate-900 mb-3">{t("passenger.payment")}</p>
        <div className="flex flex-col gap-2">
          {PAYMENT_OPTIONS.map((pay) => {
            const selected = selectedPayment === pay.id;
            return (
              <button
                key={pay.id}
                type="button"
                onClick={() => setSelectedPayment(pay.id)}
                className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left shadow-sm transition-all ${
                  selected
                    ? "border-2 border-brand bg-white shadow-[0_8px_22px_rgba(21,74,168,0.12)]"
                    : "border border-slate-200 bg-white hover:border-brand/40 hover:shadow-md active:scale-[0.99]"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? "bg-brand" : "bg-brand/8"}`}>
                  <span
                    className={`material-symbols-outlined text-lg ${selected ? "text-white" : "text-brand"}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {pay.id === "card" ? "credit_card" : "payments"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{pay.detail}</p>
                  <p className="text-xs text-muted">{pay.value}</p>
                </div>
                <span className={`material-symbols-outlined text-[20px] ${selected ? "text-brand" : "text-slate-300"}`}>
                  {selected ? "check_circle" : "radio_button_unchecked"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => selectedRide && selectedPayment && destination && onNext({ selectedRide, selectedPayment })}
        disabled={!selectedRide || !selectedPayment || !destination}
        className="w-full py-5 rounded-full bg-gradient-to-br from-brand to-brand-deep text-white font-headline font-extrabold text-lg shadow-[0_12px_28px_rgba(21,74,168,0.26)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform flex items-center justify-center gap-2"
      >
        {t("passenger.bookRide")}
        <span className="material-symbols-outlined text-[20px]">bolt</span>
      </button>
    </div>
  );
}

// ── Ride Confirmation Screen ───────────────────────────────────────────────

function RideScreen({ activeTrip, selectedPayment, specialAssistance, notes, onBack, onNext }) {
  const { t } = useLanguage();
  const payment = PAYMENT_OPTIONS.find((p) => p.id === selectedPayment);
  const dest = destinationLabel(activeTrip) || "Where to?";
  const route = `${pickupLabel(activeTrip)} → ${dest}`;
  const tripCompleted = activeTrip.status === "completed";
  const canReview = canShowPassengerReview(activeTrip);

  return (
    <div className="flex flex-col gap-4">
      <MobileHeader title="Hello Ride" backLabel="Back" onBack={onBack} showAvatar />

      {/* Booking confirmation */}
      <div className="bg-brand/10 border border-brand/25 rounded-2xl p-5">
        <p className="text-xs text-brand-deep uppercase tracking-widest font-medium">
          {canReview ? t("passenger.tripComplete") : t("passenger.bookingDetails")}
        </p>
        <h2 className="text-xl font-bold text-slate-900 mt-1">
          {canReview ? `Arrived at ${dest}` : `Ride booked to ${dest}`}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {route}
        </p>
        <p className="text-sm text-slate-600">{passengerVehicleLabel(activeTrip)}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand/15">
          <p className="text-xs text-muted">Fare</p>
          <p className="text-xl font-bold text-slate-900">{fareLabel(activeTrip)}</p>
        </div>
      </div>

      {/* Trip summary */}
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5">
        <p className="text-sm font-bold text-slate-900 mb-4">{t("passenger.tripSummary")}</p>
        {[
          [t("passenger.route"), route],
          [t("passenger.party"), `${activeTrip.passengerCount} passengers · ${activeTrip.luggageCount} luggage`],
          [t("passenger.rideSummary"), `${activeTrip.vehicleType} · ${activeTrip.distanceKM} km · ${activeTrip.tripTimeMin} mins`],
          ...(specialAssistance ? [[t("passenger.support"), "Special assistance requested"]] : []),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-100">
            <p className="text-xs text-muted">{label}</p>
            <p className="text-sm text-slate-900 text-right">{value}</p>
          </div>
        ))}
        {notes && (
          <div className="flex justify-between gap-4 py-2">
            <p className="text-xs text-muted">{t("passenger.notes")}</p>
            <p className="text-xs text-muted text-right">{notes}</p>
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5">
        <p className="text-sm font-bold text-slate-900 mb-4">{t("passenger.payment")}</p>
        <div className="flex justify-between py-2 border-b border-slate-100">
          <p className="text-xs text-muted">{t("passenger.method")}</p>
          <p className="text-sm text-slate-900">{payment?.label} · {payment?.detail}</p>
        </div>
        <div className="flex justify-between py-2">
          <p className="text-xs text-muted">{t("passenger.total")}</p>
          <p className="text-lg font-bold text-slate-900">{fareLabel(activeTrip)}</p>
        </div>
      </div>

      {canReview && (
        <button
          onClick={onNext}
          className="w-full py-4 rounded-full bg-gradient-to-br from-brand to-brand-deep text-white font-headline font-extrabold text-lg shadow-[0_8px_24px_rgba(21,74,168,0.24)] active:scale-95 transition-transform"
        >
          {t("passenger.leaveReview")}
        </button>
      )}

      <button
        onClick={onBack}
        className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:border-slate-400 hover:text-slate-700 transition-colors"
      >
        {t("passenger.done")}
      </button>
    </div>
  );
}

// ── Review Screen ──────────────────────────────────────────────────────────

function ReviewScreen({ activeTrip, onBack, onHome }) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [tip, setTip] = useState("฿50");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const driverFirst = driverPlateNumber(activeTrip);
  const dest = destinationLabel(activeTrip) || "Destination";

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <MobileHeader title="Hello Ride" backLabel="Close" onBack={onBack} />
        <div className="bg-brand/10 border border-brand/25 rounded-2xl p-6 text-center">
          <p className="text-xs text-brand-deep uppercase tracking-widest font-medium mb-2">{t("passenger.reviewSubmitted")}</p>
          <p className="text-xl font-bold text-slate-900">{t("passenger.thanksForFeedback")}</p>
          <p className="text-sm text-muted mt-2">Thank you for your feedback, {driverFirst}.</p>
        </div>
        <button
          onClick={onHome}
          className="w-full py-4 rounded-full bg-gradient-to-br from-brand to-brand-deep text-white font-headline font-extrabold text-lg shadow-[0_8px_24px_rgba(21,74,168,0.24)] active:scale-95 transition-transform"
        >
          {t("passenger.backToHome")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MobileHeader title="How was your ride?" backLabel="Close" onBack={onBack} rightLabel="Hello Ride" />

      <div className="rounded-2xl border border-brand/25 bg-brand/10 p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-brand-deep">{t("passenger.tripComplete")}</p>
        <p className="mt-1 text-xl font-black text-slate-900">Payment confirmed</p>
        <p className="mt-1 text-sm text-slate-600">Your ride to {dest} is complete. Review your trip details before leaving feedback.</p>
      </div>

      <TripInfoRows rows={[
        [t("passenger.total"), fareLabel(activeTrip)],
        [t("passenger.vehicleLabel"), `${driverFirst} · ${activeTrip.vehicleType}`],
        [t("passenger.destination"), dest],
        [t("passenger.route"), `${pickupLabel(activeTrip)} → ${dest}`],
      ]} />

      {/* Driver card */}
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5">
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">{t("passenger.driver")}</p>
        <p className="text-base font-bold text-slate-900">{driverPlateNumber(activeTrip)}</p>
        <p className="text-xs text-muted">{activeTrip.vehicleType} · {fareLabel(activeTrip)}</p>
      </div>

      {/* Star rating */}
      <div>
        <p className="text-sm font-bold text-slate-900 mb-1">{t("passenger.tapToRate")}</p>
        <p className="text-xs text-muted mb-3">{t("passenger.chooseRating")}</p>
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
          <p className="text-sm font-bold text-slate-900">{t("passenger.addTipFor")} {driverFirst}?</p>
          <p className="text-xs text-muted">{t("passenger.optional")}</p>
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
        <p className="text-sm font-bold text-slate-900 mb-2">{t("passenger.leaveComment")}</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("passenger.commentPlaceholder")}
          rows={3}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-none shadow-sm"
        />
      </div>

      <button
        onClick={() => setSubmitted(true)}
        className="w-full py-4 rounded-full bg-gradient-to-br from-brand to-brand-deep text-white font-headline font-extrabold text-lg shadow-[0_8px_24px_rgba(21,74,168,0.24)] active:scale-95 transition-transform"
      >
        {t("passenger.submitReview")}
      </button>
    </div>
  );
}

function TripInfoRows({ rows }) {
  return (
    <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5 flex flex-col">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
          <p className="text-xs text-muted">{label}</p>
          <p className="text-sm font-bold text-slate-900 text-right">{value}</p>
        </div>
      ))}
    </div>
  );
}

function CancelRequestBlock({ onCancel }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs text-muted">{t("passenger.noCharge")}</p>
      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded-2xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 active:scale-95"
      >
        {t("passenger.cancelRequest")}
      </button>
    </div>
  );
}

function FindingDriverScreen({ activeTrip, onCancel }) {
  const { t } = useLanguage();
  const { resolveDemoPassengerMatch } = useDemoMatching();
  const pendingDispatch = activeTrip.status === "pending_dispatch";
  const rematching = activeTrip.status === "rematching";

  useEffect(() => {
    if (!["booked", "finding_driver"].includes(activeTrip.status)) return undefined;

    const timeoutId = window.setTimeout(() => {
      resolveDemoPassengerMatch();
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [activeTrip.status, resolveDemoPassengerMatch]);

  return (
    <div className="flex flex-col gap-4">
      <MobileHeader title="Hello Ride" showAvatar />
      {pendingDispatch ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-500 shrink-0 mt-0.5" style={{ fontSize: "22px" }}>hourglass_top</span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-600 mb-1">{t("passenger.stillFindingDriver")}</p>
              <p className="text-base font-bold text-slate-900">{t("passenger.opsReviewingTitle")}</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">{t("passenger.opsReviewingBody")}</p>
            </div>
          </div>
        </div>
      ) : rematching ? (
        <div className="bg-brand/10 border border-brand/25 rounded-2xl p-5 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
          </div>
          <p className="text-xs text-brand-deep uppercase tracking-widest font-medium mb-1">{t("passenger.findingAnotherDriver")}</p>
          <p className="text-base font-bold text-slate-900">{t("passenger.previousDriverUnavailable")}</p>
        </div>
      ) : (
        <div className="bg-brand/10 border border-brand/25 rounded-2xl p-5 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
          </div>
          <p className="text-xs text-brand-deep uppercase tracking-widest font-medium mb-1">{t("passenger.findingRide")}</p>
          <p className="text-base font-bold text-slate-900">{t("passenger.findingDriver2")}</p>
        </div>
      )}
      <TripInfoRows rows={[
        [t("passenger.pickup"), activeTrip.pickupGate || "Level 1, Gate 4"],
        [t("passenger.destination"), activeTrip.destinationName || activeTrip.selectedDestination || "—"],
      ]} />
      <CancelRequestBlock onCancel={onCancel} />
    </div>
  );
}

function AssignedScreen({ activeTrip, onCancel }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-4">
      <MobileHeader title="Hello Ride" showAvatar />
      <div className="bg-brand/10 border border-brand/25 rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand animate-pulse" />
          <p className="text-xs text-brand-deep uppercase tracking-widest font-medium">{t("passenger.driverAssigned")}</p>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-xl font-black text-slate-900">{t("passenger.waitingConfirmation")}</p>
        </div>
        <p className="text-xs text-muted mt-2">
          {t("passenger.driverLabel")} {passengerVehicleLabel(activeTrip)} {t("passenger.driverNotifiedNote")}
        </p>
      </div>
      <TripInfoRows rows={[
        [t("passenger.driverLabel"), passengerVehicleLabel(activeTrip)],
        [t("passenger.etaLabel"), `${activeTrip.etaMin} ${t("passenger.minUnit")}`],
        [t("passenger.pickup"), activeTrip.pickupGate || "Level 1, Gate 4"],
        [t("passenger.destination"), activeTrip.destinationName || activeTrip.selectedDestination || "—"],
      ]} />
      <CancelRequestBlock onCancel={onCancel} />
    </div>
  );
}

function AcceptedScreen({ activeTrip }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-4">
      <MobileHeader title="Hello Ride" showAvatar />
      <div className="bg-brand/10 border border-brand/25 rounded-2xl p-5">
        <p className="text-xs text-brand-deep uppercase tracking-widest font-medium mb-1">{t("passenger.driverOnTheWay")}</p>
        <p className="text-2xl font-black text-slate-900 mt-1">{activeTrip.etaMin} {t("passenger.minUnit")}</p>
        <p className="text-xs text-muted mt-0.5">{t("passenger.etaNote")}</p>
      </div>
      <TripInfoRows rows={[
        [t("passenger.driverLabel"), passengerVehicleLabel(activeTrip)],
        [t("passenger.etaLabel"), `${activeTrip.etaMin} ${t("passenger.minUnit")}`],
        [t("passenger.pickup"), activeTrip.pickupGate || "Level 1, Gate 4"],
      ]} />
    </div>
  );
}

function ArrivedScreen({ activeTrip }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-4">
      <MobileHeader title="Hello Ride" showAvatar />
      <div className="bg-brand/10 border border-brand/25 rounded-2xl p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-full bg-brand/20 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-brand"
              style={{ fontSize: "32px", fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>
        </div>
        <p className="text-xs text-brand-deep uppercase tracking-widest font-medium mb-1">{t("passenger.driverArrived")}</p>
        <p className="text-base font-bold text-slate-900">{t("passenger.goPtoPickup")}</p>
      </div>
      <TripInfoRows rows={[
        [t("passenger.driverLabel"), driverPlateNumber(activeTrip)],
        [t("passenger.vehicleLabel"), activeTrip.vehicleType],
      ]} />
    </div>
  );
}

function CompletedPaymentPendingScreen({ activeTrip }) {
  const { t } = useLanguage();
  const dest = destinationLabel(activeTrip) || "Destination";

  return (
    <div className="flex flex-col gap-4">
      <MobileHeader title="Hello Ride" showAvatar />
      <div className="rounded-2xl border border-brand/25 bg-brand/10 p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-brand-deep">{t("passenger.tripComplete")}</p>
        <p className="mt-1 text-xl font-black text-slate-900">Payment confirmation pending</p>
        <p className="mt-1 text-sm text-slate-600">Your driver is confirming payment received. Your receipt and feedback screen will appear shortly.</p>
      </div>
      <TripInfoRows rows={[
        [t("passenger.destination"), dest],
        [t("passenger.vehicleLabel"), passengerVehicleLabel(activeTrip)],
        [t("passenger.total"), fareLabel(activeTrip)],
      ]} />
    </div>
  );
}

function PassengerMatchingStatus() {
  const { t } = useLanguage();
  const { activeTrip } = useDemoMatching();

  if (["idle", "completed", "rematching"].includes(activeTrip.status)) {
    return null;
  }

  if (activeTrip.status === "pending_dispatch") {
    return (
      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-600">Finding Driver</p>
            <p className="mt-1 text-sm font-bold text-amber-700">Finding your driver…</p>
            <p className="mt-0.5 text-xs text-amber-600">OPS is reviewing available driver supply and may re-dispatch your request shortly.</p>
          </div>
          <span className="material-symbols-outlined text-amber-500 leading-none" style={{ fontSize: "22px" }}>
            hourglass_top
          </span>
        </div>
      </div>
    );
  }

  const statusCopy = activeTrip.status === "arrived"
    ? t("passenger.driverArrived")
    : t("passenger.driverAssigned");
  const destination = destinationLabel(activeTrip) || "Destination pending";

  return (
    <div className="mb-4 rounded-2xl border border-brand/15 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-brand">{statusCopy}</p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {passengerVehicleLabel(activeTrip)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            ETA {activeTrip.etaMin} min · {destination} · {fareLabel(activeTrip)}
          </p>
        </div>
        <span className="material-symbols-outlined text-brand leading-none" style={{ fontSize: "22px" }}>
          local_taxi
        </span>
      </div>
    </div>
  );
}

// ── Main Passenger Portal ──────────────────────────────────────────────────

const STATUS_SCREENS = {
  booked: FindingDriverScreen,
  finding_driver: FindingDriverScreen,
  rematching: FindingDriverScreen,
  pending_dispatch: FindingDriverScreen,
  assigned: AssignedScreen,
  accepted: AcceptedScreen,
  arrived: ArrivedScreen,
};

export default function PassengerPortal() {
  const [step, setStep] = useState("home");
  const [qrCompleted, setQrCompleted] = useState(false);
  const [tripData, setTripData] = useState({});
  const { activeTrip, updatePassengerTrip, updateRideSelection, bookPassengerTrip, cancelPassengerRequest, completePassengerReview } = useDemoMatching();

  function handleStartQrBooking() {
    updatePassengerTrip({
      pickupGate: "ชั้น 1 ประตู 4 (Level 1, Gate 4)",
      pickupAddress: "Suvarnabhumi Airport, Bangkok",
      pickupTerminal: "BKK Airport",
    });
    setQrCompleted(true);
    setStep("home");
  }

  function handleHomeNext(data) {
    updatePassengerTrip({
      passengerName: data.passengerName?.trim() || "Passenger P001",
      destination: data.selectedDestination,
      passengers: data.passengers,
      luggage: data.luggage,
    });
    setTripData(data);
    setStep("carType");
  }

  function handleCarTypeNext(data) {
    const ride = RIDES.find((item) => item.id === data.selectedRide);
    const rideSelection = {
      vehicleType: ride?.label,
      fareTHB: fareToNumber(ride?.price),
      distanceKM: activeTrip.distanceKM,
      tripTimeMin: activeTrip.tripTimeMin,
    };
    updateRideSelection(rideSelection);
    bookPassengerTrip(rideSelection);
    setTripData((prev) => ({ ...prev, ...data }));
    setStep("ride");
  }

  function handleRideNext() {
    if (!canShowPassengerReview(activeTrip)) return;
    setStep("review");
  }

  function handleHome() {
    if (canShowPassengerReview(activeTrip)) {
      completePassengerReview();
    }
    setStep("home");
    setQrCompleted(false);
    setTripData({});
  }

  function handleCancelRequest() {
    cancelPassengerRequest();
    setStep("home");
    setQrCompleted(false);
    setTripData({});
  }

  const StatusScreen = STATUS_SCREENS[activeTrip.status];
  const shouldShowReview = canShowPassengerReview(activeTrip);
  const shouldShowCompletedPending = activeTrip.status === "completed";
  const shouldShowQrEntry = activeTrip.status === "idle" && step === "home" && !qrCompleted;

  return (
    <MobileShell>
      <MobileScrollArea className="pb-28">
        {shouldShowReview ? (
          <ReviewScreen
            activeTrip={activeTrip}
            onBack={() => setStep("ride")}
            onHome={handleHome}
          />
        ) : shouldShowCompletedPending ? (
          <CompletedPaymentPendingScreen activeTrip={activeTrip} />
        ) : StatusScreen ? (
          <StatusScreen activeTrip={activeTrip} onCancel={handleCancelRequest} />
        ) : shouldShowQrEntry ? (
          <QREntryScreen onStart={handleStartQrBooking} />
        ) : (
          <>
            <PassengerMatchingStatus />
            {step === "home" && <HomeScreen initialData={tripData} onNext={handleHomeNext} />}
            {step === "carType" && (
              <CarTypeScreen
                activeTrip={activeTrip}
                destination={tripData.selectedDestination || tripData.dest || ""}
                passengers={tripData.passengers}
                luggage={tripData.luggage}
                onBack={() => setStep("home")}
                onNext={handleCarTypeNext}
              />
            )}
            {step === "ride" && (
              <RideScreen
                activeTrip={activeTrip}
                selectedPayment={tripData.selectedPayment}
                specialAssistance={tripData.specialAssistance}
                notes={tripData.notes}
                onBack={() => setStep("carType")}
                onNext={handleRideNext}
              />
            )}
            {step === "review" && (
              <ReviewScreen
                activeTrip={activeTrip}
                onBack={() => setStep("ride")}
                onHome={handleHome}
              />
            )}
          </>
        )}
      </MobileScrollArea>

      {/* Support chat rendered as a direct child of the shell so it positions
          relative to the phone container, not the browser viewport */}
      <PassengerSupportChat />
    </MobileShell>
  );
}
