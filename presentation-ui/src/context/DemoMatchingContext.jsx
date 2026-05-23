import { useEffect, useMemo, useState } from "react";
import { DemoMatchingContext } from "./DemoMatchingContextCore.js";

const STORAGE_KEY_TRIP = "helloride_activeTrip";
const STORAGE_KEY_OPS = "helloride_opsAction";
const STORAGE_KEY_ESCALATION = "helloride_activeEscalation";
const STORAGE_KEY_DISPATCH_MODE = "helloride_dispatchMode";
const DEFAULT_DISPATCH_MODE = "priority";

const DEFAULT_ACTIVE_TRIP = {
  tripId: "TRIP-20260522-001",
  passengerId: "P001",
  driverId: "D101",
  passengerName: "Tanaka K.",
  pickupTerminal: "",
  pickupGate: "ชั้น 1 ประตู 4 (Level 1, Gate 4)",
  pickupAddress: "ท่าอากาศยานสุวรรณภูมิ, สมุทรปราการ",
  selectedDestination: "",
  destinationName: "",
  destinationArea: "",
  vehicleType: "Hello Taxi",
  fareTHB: 385,
  distanceKM: 32.4,
  tripTimeMin: 45,
  bookingFeeTHB: 15,
  paymentStatus: "รอรับชำระเงิน",
  etaMin: 4,
  passengerCount: 3,
  luggageCount: 4,
  flightCode: "TG401",
  matchingReason: "ผู้โดยสารรอ 18 นาที · เวลาถึง 4 นาที · รถว่างพอรับได้",
  status: "idle",
  driverPaymentConfirmed: false,
  passengerReviewPending: false,
};

function readStoredTrip() {
  if (typeof window === "undefined") return DEFAULT_ACTIVE_TRIP;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY_TRIP);
    if (!stored) return DEFAULT_ACTIVE_TRIP;
    const parsed = JSON.parse(stored);
    const selectedDestination =
      parsed.selectedDestination ||
      parsed.destinationName ||
      parsed.destination ||
      DEFAULT_ACTIVE_TRIP.selectedDestination;
    return {
      ...DEFAULT_ACTIVE_TRIP,
      ...parsed,
      selectedDestination,
      destinationName: parsed.destinationName || selectedDestination,
      destinationArea: parsed.destinationArea || selectedDestination,
      status: parsed.status || DEFAULT_ACTIVE_TRIP.status,
    };
  } catch {
    return DEFAULT_ACTIVE_TRIP;
  }
}

function readStoredOpsAction() {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY_OPS);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function readStoredEscalation() {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY_ESCALATION);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function readStoredDispatchMode() {
  if (typeof window === "undefined") return DEFAULT_DISPATCH_MODE;
  const stored = window.localStorage.getItem(STORAGE_KEY_DISPATCH_MODE);
  return stored === "auto" || stored === "priority" ? stored : DEFAULT_DISPATCH_MODE;
}

function splitDestination(value) {
  const selectedDestination = String(value || "").trim();
  const [name = "", ...rest] = selectedDestination.split(",");
  const destinationName = name.trim() || selectedDestination;
  return {
    selectedDestination,
    destinationName,
    destinationArea: rest.join(",").trim() || destinationName,
  };
}

export function DemoMatchingProvider({ children }) {
  const [activeTrip, setActiveTripState] = useState(readStoredTrip);
  const [opsAction, setOpsActionState] = useState(readStoredOpsAction);
  const [activeEscalation, setActiveEscalationState] = useState(readStoredEscalation);
  const [dispatchMode, setDispatchModeState] = useState(readStoredDispatchMode);

  // Persist trip state to localStorage whenever it changes
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY_TRIP, JSON.stringify(activeTrip));
  }, [activeTrip]);

  // Persist opsAction to localStorage whenever it changes
  useEffect(() => {
    if (opsAction === null) {
      window.localStorage.removeItem(STORAGE_KEY_OPS);
    } else {
      window.localStorage.setItem(STORAGE_KEY_OPS, JSON.stringify(opsAction));
    }
  }, [opsAction]);

  useEffect(() => {
    if (activeEscalation === null) {
      window.localStorage.removeItem(STORAGE_KEY_ESCALATION);
    } else {
      window.localStorage.setItem(STORAGE_KEY_ESCALATION, JSON.stringify(activeEscalation));
    }
  }, [activeEscalation]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY_DISPATCH_MODE, dispatchMode);
  }, [dispatchMode]);

  // Cross-tab sync: re-read state when another tab writes to localStorage
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === STORAGE_KEY_TRIP) {
        setActiveTripState(
          e.newValue
            ? { ...DEFAULT_ACTIVE_TRIP, ...JSON.parse(e.newValue) }
            : DEFAULT_ACTIVE_TRIP
        );
      }
      if (e.key === STORAGE_KEY_OPS) {
        setOpsActionState(e.newValue ? JSON.parse(e.newValue) : null);
      }
      if (e.key === STORAGE_KEY_ESCALATION) {
        setActiveEscalationState(e.newValue ? JSON.parse(e.newValue) : null);
      }
      if (e.key === STORAGE_KEY_DISPATCH_MODE) {
        setDispatchModeState(e.newValue === "auto" || e.newValue === "priority" ? e.newValue : DEFAULT_DISPATCH_MODE);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo(() => {
    function setPassengerDestination(destination) {
      const nextDestination = splitDestination(destination);
      setActiveTripState((prev) => ({ ...prev, ...nextDestination }));
    }

    function updatePassengerTrip({ destination, passengers, luggage } = {}) {
      const nextDestination = destination ? splitDestination(destination) : {};
      setActiveTripState((prev) => ({
        ...prev,
        ...nextDestination,
        passengerCount: passengers ?? prev.passengerCount,
        luggageCount: luggage ?? prev.luggageCount,
      }));
    }

    function updateRideSelection({ vehicleType, fareTHB, distanceKM, tripTimeMin } = {}) {
      setActiveTripState((prev) => ({
        ...prev,
        vehicleType: vehicleType || prev.vehicleType,
        fareTHB: fareTHB ?? prev.fareTHB,
        distanceKM: distanceKM ?? prev.distanceKM,
        tripTimeMin: tripTimeMin ?? prev.tripTimeMin,
      }));
    }

    function setDispatchMode(mode) {
      if (mode === "auto" || mode === "priority") {
        setDispatchModeState(mode);
      }
    }

    function bookPassengerTrip() {
      if (dispatchMode === "auto") {
        setActiveTripState((prev) => {
          const resolvedDestination =
            prev.selectedDestination ||
            prev.destinationName ||
            "Sukhumvit";
          return {
            ...DEFAULT_ACTIVE_TRIP,
            ...prev,
            ...splitDestination(resolvedDestination),
            status: "assigned",
            driverPaymentConfirmed: false,
            passengerReviewPending: false,
          };
        });
        return;
      }

      setActiveTripState((prev) => ({
        ...prev,
        status: "booked",
        driverPaymentConfirmed: false,
        passengerReviewPending: false,
      }));
    }

    function assignMatch(destination) {
      setActiveTripState((prev) => {
        const resolvedDestination =
          destination ||
          prev.selectedDestination ||
          prev.destinationName ||
          "Sukhumvit";
        return {
          ...DEFAULT_ACTIVE_TRIP,
          ...prev,
          ...splitDestination(resolvedDestination),
          status: "assigned",
          driverPaymentConfirmed: false,
          passengerReviewPending: false,
        };
      });
    }

    function setOpsAction(action) {
      setOpsActionState(action);
    }

    function createEscalation({ protocol, message, sourceRole = "OPS Advisory" }) {
      if (!protocol) return;
      setActiveEscalationState({
        id: `ESC-${Date.now()}`,
        protocolId: protocol.id,
        protocolName: protocol.name,
        severity: protocol.severity,
        sourceRole,
        message,
        recommendedAction: protocol.recommendedAction,
        opsAction: protocol.opsAction,
        status: "open",
        createdAt: new Date().toISOString(),
      });
    }

    function acknowledgeEscalation() {
      setActiveEscalationState((prev) =>
        prev ? { ...prev, status: "acknowledged" } : prev
      );
    }

    function resolveEscalation() {
      setActiveEscalationState((prev) =>
        prev ? { ...prev, status: "resolved" } : prev
      );
    }

    function acceptMatch() {
      setActiveTripState((prev) => ({ ...prev, status: "accepted" }));
    }

    function markArrived() {
      setActiveTripState((prev) => ({ ...prev, status: "arrived" }));
    }

    function completeMatch() {
      setActiveTripState((prev) => ({
        ...prev,
        status: "completed",
        paymentStatus: "paid",
        driverPaymentConfirmed: false,
        passengerReviewPending: true,
      }));
    }

    function confirmDriverPayment() {
      setActiveTripState((prev) => ({
        ...prev,
        paymentStatus: "paid",
        driverPaymentConfirmed: true,
        passengerReviewPending: true,
      }));
    }

    function completePassengerReview() {
      setActiveTripState((prev) => ({
        ...DEFAULT_ACTIVE_TRIP,
        selectedDestination: "",
        destinationName: "",
        destinationArea: "",
        passengerCount: prev.passengerCount,
        luggageCount: prev.luggageCount,
        vehicleType: prev.vehicleType,
        fareTHB: prev.fareTHB,
        distanceKM: prev.distanceKM,
        tripTimeMin: prev.tripTimeMin,
        bookingFeeTHB: prev.bookingFeeTHB,
        paymentStatus: DEFAULT_ACTIVE_TRIP.paymentStatus,
        status: "idle",
        driverPaymentConfirmed: true,
        passengerReviewPending: false,
      }));
    }

    function resetMatch() {
      window.localStorage.removeItem(STORAGE_KEY_TRIP);
      window.localStorage.removeItem(STORAGE_KEY_OPS);
      window.localStorage.removeItem(STORAGE_KEY_ESCALATION);
      setActiveTripState((prev) => ({
        ...DEFAULT_ACTIVE_TRIP,
        selectedDestination: prev.selectedDestination,
        destinationName: prev.destinationName,
        destinationArea: prev.destinationArea,
        passengerCount: prev.passengerCount,
        luggageCount: prev.luggageCount,
        vehicleType: prev.vehicleType,
        fareTHB: prev.fareTHB,
        distanceKM: prev.distanceKM,
        tripTimeMin: prev.tripTimeMin,
        bookingFeeTHB: prev.bookingFeeTHB,
        paymentStatus: prev.paymentStatus,
        status: "idle",
        driverPaymentConfirmed: false,
        passengerReviewPending: false,
      }));
      setOpsActionState(null);
      setActiveEscalationState(null);
    }

    return {
      activeTrip: { ...activeTrip, opsAction },
      opsAction,
      activeEscalation,
      dispatchMode,
      setPassengerDestination,
      updatePassengerTrip,
      updateRideSelection,
      setDispatchMode,
      bookPassengerTrip,
      assignMatch,
      setOpsAction,
      createEscalation,
      acknowledgeEscalation,
      resolveEscalation,
      acceptMatch,
      markArrived,
      completeMatch,
      confirmDriverPayment,
      completePassengerReview,
      resetMatch,
    };
  }, [activeTrip, opsAction, activeEscalation, dispatchMode]);

  return (
    <DemoMatchingContext.Provider value={value}>
      {children}
    </DemoMatchingContext.Provider>
  );
}
