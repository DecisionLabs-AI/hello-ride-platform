import * as Switch from "@radix-ui/react-switch";
import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  ArrowLeft,
  CarFront,
  Check,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  Search,
  Star,
  Wallet,
  X,
} from "lucide-react";
import { passengerExperience } from "../data/mockData";
import { PhoneShell, SectionEyebrow, SurfaceCard, UserAvatar } from "./ui";

const paymentOptions = [
  {
    id: "wallet",
    label: "Wallet",
    detail: "Hello Pay Wallet",
    value: "$142.50 available",
    icon: Wallet,
  },
  {
    id: "card",
    label: "Card",
    detail: "Visa ending 2048",
    value: "Business card",
    icon: CreditCard,
  },
];

const tipOptions = ["$1", "$2", "$5", "Custom"];

function CounterField({ label, value, onDecrease, onIncrease }) {
  return (
    <div className="rounded-[24px] bg-white/75 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDecrease}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="font-display text-3xl font-extrabold text-foreground">{value}</span>
        <button
          type="button"
          onClick={onIncrease}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StepHeader({ title, onBack, rightSlot }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-foreground shadow-sm"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h3 className="min-w-0 flex-1 text-center font-display text-[2rem] font-extrabold text-foreground">
        {title}
      </h3>
      <div className="flex h-11 min-w-[44px] items-center justify-end">{rightSlot}</div>
    </div>
  );
}

export default function PassengerPage() {
  const { route, signal, tracking, rides: rideOptions } = passengerExperience;
  const [currentPassengerStep, setCurrentPassengerStep] = useState("home");
  const [destination, setDestination] = useState(route.dropoff);
  const [passengerCount, setPassengerCount] = useState(signal.partySize);
  const [luggageCount, setLuggageCount] = useState(signal.luggage);
  const [specialAssistance, setSpecialAssistance] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [selectedRideType, setSelectedRideType] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("wallet");
  const [selectedRating, setSelectedRating] = useState(5);
  const [selectedTip, setSelectedTip] = useState("$5");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const evaluatedRideOptions = useMemo(
    () =>
      rideOptions.map((ride) => {
        const isEligible = passengerCount <= ride.maxPassengers && luggageCount <= ride.maxLuggage;
        return {
          ...ride,
          isEligible,
          reason: isEligible
            ? ""
            : `Supports up to ${ride.maxPassengers} passengers and ${ride.maxLuggage} luggage`,
        };
      }),
    [rideOptions, passengerCount, luggageCount],
  );

  const selectedRide = evaluatedRideOptions.find((ride) => ride.id === selectedRideType);
  const selectedPayment = paymentOptions.find((payment) => payment.id === selectedPaymentMethod);
  const canBookSelectedRide = Boolean(selectedRide && selectedRide.isEligible);

  useEffect(() => {
    if (selectedRideType && !canBookSelectedRide) {
      setSelectedRideType("");
    }
  }, [canBookSelectedRide, selectedRideType]);

  const renderHome = () => (
    <div className="mt-5 flex flex-1 flex-col gap-4">
      <SurfaceCard className="rounded-[28px] p-4">
        <div className="flex items-center gap-3 rounded-[22px] bg-slate-50 px-4 py-3">
          <Search className="h-5 w-5 text-primary" />
          <input
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            className="w-full bg-transparent text-base font-semibold text-foreground outline-none"
            aria-label="Destination"
          />
          <button
            type="button"
            onClick={() => setDestination("")}
            className="text-slate-400"
            aria-label="Clear destination"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex gap-4">
          <div className="flex flex-col items-center">
            <span className="h-3 w-3 rounded-full border-2 border-primary" />
            <span className="h-14 w-px bg-border" />
            <span className="h-3 w-3 rounded-sm bg-danger" />
          </div>
          <div className="min-w-0 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Pickup</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-foreground">{route.pickup}</p>
              <p className="text-sm text-muted-foreground">Suntec Convention Centre, Lobby A</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Destination</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-foreground">
                {destination || "Add destination"}
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionEyebrow>Trip details</SectionEyebrow>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <CounterField
            label="Passengers"
            value={passengerCount}
            onDecrease={() => setPassengerCount((value) => Math.max(1, value - 1))}
            onIncrease={() => setPassengerCount((value) => Math.min(10, value + 1))}
          />
          <CounterField
            label="Luggage"
            value={luggageCount}
            onDecrease={() => setLuggageCount((value) => Math.max(0, value - 1))}
            onIncrease={() => setLuggageCount((value) => Math.min(8, value + 1))}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-[24px] bg-white/75 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Accessibility className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-foreground">Special Assistance</h4>
              <p className="text-sm text-muted-foreground">Wheelchair accessible vehicle</p>
            </div>
          </div>
          <Switch.Root
            checked={specialAssistance}
            onCheckedChange={setSpecialAssistance}
            className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition data-[state=checked]:bg-primary"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition data-[state=checked]:translate-x-6" />
          </Switch.Root>
        </div>

        <div className="mt-4 rounded-[24px] bg-white/75 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Additional Notes</p>
          <input
            value={additionalNotes}
            onChange={(event) => setAdditionalNotes(event.target.value)}
            placeholder="e.g. In front of the building"
            className="mt-3 w-full bg-transparent text-base text-foreground outline-none placeholder:text-slate-400"
            aria-label="Additional notes"
          />
        </div>

        <button
          type="button"
          onClick={() => setCurrentPassengerStep("carType")}
          className="mt-5 w-full rounded-[20px] bg-primary px-5 py-4 font-display text-lg font-extrabold text-primary-foreground shadow-lg shadow-primary/25 transition hover:translate-y-[-1px]"
        >
          Confirm Pick-up
        </button>
      </SurfaceCard>
    </div>
  );

  const renderCarType = () => (
    <div className="mt-5 flex flex-1 flex-col gap-4">
      <SurfaceCard className="overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(185,220,214,0.7),rgba(255,255,255,0.96))] p-5">
        <div className="rounded-[24px] bg-white/88 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Current Journey</p>
          <div className="mt-3 flex gap-3">
            <div className="flex flex-col items-center pt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="h-10 w-px bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-danger" />
            </div>
            <div className="min-w-0 space-y-3">
              <p className="font-semibold text-foreground">{route.pickup}</p>
              <p className="font-semibold text-muted-foreground">{destination || route.dropoff}</p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="rounded-[28px]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h4 className="font-display text-4xl font-extrabold text-foreground">Select ride</h4>
            <p className="text-base text-muted-foreground">Estimated arrival: 4 mins</p>
          </div>
        </div>

        <div className="mt-3 rounded-[20px] bg-white/75 px-4 py-3 text-sm text-muted-foreground">
          {passengerCount} passengers • {luggageCount} luggage
        </div>

        <div className="mt-5 space-y-3">
          {evaluatedRideOptions.map((ride) => {
            const isSelected = selectedRideType === ride.id;

            return (
              <button
                key={ride.id}
                type="button"
                onClick={() => {
                  if (ride.isEligible) {
                    setSelectedRideType(ride.id);
                  }
                }}
                disabled={!ride.isEligible}
                className={`w-full rounded-[24px] border p-4 text-left transition ${
                  isSelected
                    ? "border-primary bg-[#6eff93] text-foreground shadow-[0_14px_32px_rgba(0,177,79,0.15)]"
                    : ride.isEligible
                      ? "border-transparent bg-white/75 text-foreground"
                      : "border-transparent bg-slate-100/90 text-slate-400"
                } ${ride.isEligible ? "" : "cursor-not-allowed"}`}
              >
                <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-[18px] ${ride.isEligible ? "bg-white/70 text-foreground" : "bg-white/60 text-slate-400"}`}>
                    <CarFront className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-2xl font-extrabold">{ride.label}</p>
                      {isSelected ? (
                        <span className="rounded-full bg-foreground px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                          Selected
                        </span>
                      ) : null}
                      {!ride.isEligible ? (
                        <span className="rounded-full bg-slate-300 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                          Unavailable
                        </span>
                      ) : null}
                    </div>
                    <p className={`text-sm ${ride.isEligible ? "text-muted-foreground" : "text-slate-500"}`}>
                      {ride.description}
                    </p>
                    <p className={`mt-1 text-sm ${ride.isEligible ? "text-muted-foreground" : "text-slate-500"}`}>
                      Capacity: {ride.maxPassengers} passengers • {ride.maxLuggage} luggage
                    </p>
                    {!ride.isEligible ? <p className="mt-1 text-sm font-medium text-danger">{ride.reason}</p> : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-3xl font-extrabold">{ride.price}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-[24px] bg-white/75 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Payment</p>
          <div className="mt-3 space-y-3">
            {paymentOptions.map((payment) => {
              const Icon = payment.icon;
              const isSelected = selectedPaymentMethod === payment.id;

              return (
                <button
                  key={payment.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(payment.id)}
                  className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${
                    isSelected ? "border-primary bg-primary/5" : "border-border bg-white"
                  }`}
                >
                  <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{payment.detail}</p>
                      <p className="text-sm text-muted-foreground">{payment.value}</p>
                    </div>
                    <div className="shrink-0">
                      {isSelected ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="inline-flex h-7 w-7 rounded-full border border-border" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={!canBookSelectedRide}
          onClick={() => setCurrentPassengerStep("ride")}
          className="mt-5 w-full rounded-[20px] bg-primary px-5 py-4 font-display text-lg font-extrabold text-primary-foreground shadow-lg shadow-primary/25 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          Book
        </button>
      </SurfaceCard>
    </div>
  );

  const renderRide = () => (
    <div className="mt-5 flex flex-1 flex-col gap-4">
      <SurfaceCard className="overflow-hidden bg-[linear-gradient(180deg,rgba(20,57,74,0.96),rgba(14,33,49,0.94))] text-white">
        <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-[24px] bg-white/90 px-4 py-3 text-foreground">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Arrived at</p>
              <p className="mt-1 font-display text-3xl font-extrabold">Destination</p>
            </div>
            <div className="rounded-[24px] bg-white/90 px-4 py-3 text-right text-foreground">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Fare</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-primary">
                {selectedRide ? selectedRide.price : "$14.50"}
              </p>
            </div>
          </div>
          <div className="mt-10 flex items-center justify-center">
            <div className="rounded-full bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/30">
              <MapPin className="h-6 w-6" />
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="rounded-[28px]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">Hello Ride</p>
            <h4 className="font-display text-3xl font-extrabold text-foreground">Trip complete</h4>
            <p className="mt-2 text-base text-muted-foreground">You have arrived at {destination || route.dropoff}.</p>
          </div>
          <UserAvatar name="Nara T." />
        </div>

        <div className="mt-4 rounded-[24px] bg-white/75 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{tracking.driver}</span>
            <span>•</span>
            <span>{tracking.vehicle}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {passengerCount} passengers • {luggageCount} luggage
            {specialAssistance ? " • Special Assistance" : ""}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Ride type: {selectedRide ? selectedRide.label : "Standard"}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Payment: {selectedPayment ? selectedPayment.label : "Wallet"}
          </p>
          {additionalNotes ? <p className="mt-2 text-sm text-muted-foreground">{additionalNotes}</p> : null}
        </div>

        <button
          type="button"
          onClick={() => setCurrentPassengerStep("review")}
          className="mt-5 w-full rounded-[20px] bg-primary px-5 py-4 font-display text-lg font-extrabold text-primary-foreground shadow-lg shadow-primary/25 transition hover:translate-y-[-1px]"
        >
          Continue
        </button>
      </SurfaceCard>
    </div>
  );

  const renderReview = () => (
    <div className="mt-5 flex flex-1 flex-col gap-4">
      <SurfaceCard className="rounded-[32px] bg-[linear-gradient(180deg,#e8ffe9_0%,#d9ffdf_100%)]">
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={() => setCurrentPassengerStep("ride")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-foreground shadow-sm"
            aria-label="Back to ride summary"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h4 className="font-display text-2xl font-extrabold text-foreground">How was your ride?</h4>
          </div>
          <p className="text-lg font-bold text-primary">Hello Ride</p>
        </div>

        <div className="mt-5 rounded-[28px] bg-white/85 p-4">
          <div className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[26px] border-2 border-primary/20 bg-white text-primary">
              <UserAvatar name={tracking.driver} />
            </div>
            <div className="min-w-0">
              <h5 className="font-display text-3xl font-extrabold text-foreground">{tracking.driver}</h5>
              <p className="mt-1 text-base text-muted-foreground">{tracking.vehicle}</p>
              <div className="mt-3 inline-flex rounded-2xl bg-primary/15 px-3 py-2 text-sm font-bold text-primary">
                {tracking.plate}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="font-display text-4xl font-extrabold text-foreground">Tap to rate</p>
          <div className="mt-4 grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }, (_, index) => index + 1).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setSelectedRating(rating)}
                className={`flex h-14 items-center justify-center rounded-[18px] ${
                  rating <= selectedRating ? "bg-[#b8ffbf] text-primary" : "bg-white/75 text-slate-300"
                }`}
                aria-label={`Rate ${rating} stars`}
              >
                <Star className={`h-7 w-7 ${rating <= selectedRating ? "fill-current" : ""}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-2xl font-extrabold text-foreground">Add a tip for {tracking.driver.split(" ")[0]}?</p>
            <p className="text-sm font-semibold text-primary">Optional</p>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {tipOptions.map((tip) => (
              <button
                key={tip}
                type="button"
                onClick={() => setSelectedTip(tip)}
                className={`rounded-[18px] px-3 py-4 text-center font-display text-2xl font-extrabold transition ${
                  selectedTip === tip ? "bg-[#0c7d35] text-white shadow-lg shadow-primary/20" : "bg-[#b8ffbf] text-[#0c7d35]"
                }`}
              >
                {tip}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-[24px] bg-[#b8ffbf] p-4">
          <p className="font-display text-2xl font-extrabold text-foreground">Leave a comment</p>
          <textarea
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
            placeholder="Share your experience (e.g. 'Great driver, clean car!')"
            className="mt-3 h-32 w-full resize-none rounded-[20px] bg-white/45 px-4 py-3 text-base text-foreground outline-none placeholder:text-slate-500"
            aria-label="Review comment"
          />
        </div>

        <button
          type="button"
          onClick={() => setReviewSubmitted(true)}
          className="mt-6 w-full rounded-[20px] bg-primary px-5 py-4 font-display text-lg font-extrabold text-primary-foreground shadow-lg shadow-primary/25 transition hover:translate-y-[-1px]"
        >
          Submit Review
        </button>
      </SurfaceCard>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_35%),linear-gradient(180deg,#f6fff9_0%,#edf4ff_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-[420px] justify-center">
        <PhoneShell tone="passenger">
          {currentPassengerStep === "home" ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">Hello Ride</p>
                  <h3 className="font-display text-2xl font-extrabold text-foreground">Home</h3>
                </div>
                <UserAvatar name="Nara T." />
              </div>
              {renderHome()}
            </>
          ) : null}

          {currentPassengerStep === "carType" ? (
            <>
              <StepHeader
                title="Hello Ride"
                onBack={() => setCurrentPassengerStep("home")}
                rightSlot={<button type="button" className="text-slate-500" aria-label="More actions">•••</button>}
              />
              {renderCarType()}
            </>
          ) : null}

          {currentPassengerStep === "ride" ? (
            <>
              <StepHeader
                title="Hello Ride"
                onBack={() => setCurrentPassengerStep("carType")}
                rightSlot={<UserAvatar name="Nara T." />}
              />
              {renderRide()}
            </>
          ) : null}

          {currentPassengerStep === "review" ? (
            reviewSubmitted ? (
              <div className="mt-5 flex flex-1 flex-col gap-4">
                <SurfaceCard className="rounded-[32px] bg-[linear-gradient(180deg,#e8ffe9_0%,#d9ffdf_100%)] p-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="mt-4 font-display text-2xl font-extrabold text-foreground">
                    Review submitted!
                  </h4>
                  <p className="mt-2 text-base text-muted-foreground">
                    Thank you for your feedback, {tracking.driver.split(" ")[0]}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewSubmitted(false);
                      setCurrentPassengerStep("home");
                    }}
                    className="mt-6 w-full rounded-[20px] bg-primary px-5 py-4 font-display text-lg font-extrabold text-primary-foreground shadow-lg shadow-primary/25 transition hover:translate-y-[-1px]"
                  >
                    Back to Home
                  </button>
                </SurfaceCard>
              </div>
            ) : (
              renderReview()
            )
          ) : null}
        </PhoneShell>
      </div>
    </div>
  );
}
