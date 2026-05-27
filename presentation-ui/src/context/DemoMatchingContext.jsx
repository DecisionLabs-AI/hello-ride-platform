import { useEffect, useMemo, useState } from "react";
import { DemoMatchingContext } from "./DemoMatchingContextCore.js";
import { MOCK_DRIVER_POOL, runMatchingAgent } from "../lib/businessLogic.js";

const STORAGE_KEY_TRIP = "helloride_activeTrip";
const STORAGE_KEY_OPS = "helloride_opsAction";
const STORAGE_KEY_ESCALATION = "helloride_activeEscalation";
const STORAGE_KEY_DISPATCH_MODE = "helloride_dispatchMode";
const DEFAULT_DISPATCH_MODE = "auto";

const DEFAULT_ACTIVE_TRIP = {
  tripId: "TRIP-20260522-001",
  passengerId: "P001",
  driverId: null,
  assignedDriver: null,
  passengerName: "",
  pickupTerminal: "",
  pickupGate: "ชั้น 1 ประตู 4 (Level 1, Gate 4)",
  pickupAddress: "ท่าอากาศยานสุวรรณภูมิ, สมุทรปราการ",
  selectedDestination: "",
  destinationName: "",
  destinationArea: "",
  requestedVehicleType: "Hello Taxi",
  vehicleType: null,
  fareTHB: 385,
  distanceKM: 32.4,
  tripTimeMin: 45,
  bookingFeeTHB: 50,
  paymentStatus: "รอรับชำระเงิน",
  etaMin: null,
  passengerCount: 3,
  luggageCount: 4,
  flightCode: "TG401",
  matchingReason: "",
  status: "idle",
  driverPaymentConfirmed: false,
  passengerReviewPending: false,
  completedAt: null,
  matchingMode: null,
  matchingDecision: null,
  rejectedDriverIds: [],
  opsPwt: null,
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
    return normalizeTripState({
      ...DEFAULT_ACTIVE_TRIP,
      ...parsed,
      selectedDestination,
      destinationName: parsed.destinationName || selectedDestination,
      destinationArea: parsed.destinationArea || selectedDestination,
      bookingFeeTHB: DEFAULT_ACTIVE_TRIP.bookingFeeTHB,
      status: parsed.status || DEFAULT_ACTIVE_TRIP.status,
      rejectedDriverIds: Array.isArray(parsed.rejectedDriverIds) ? parsed.rejectedDriverIds : [],
    });
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

function clearAssignmentFields(trip) {
  return {
    ...trip,
    driverId: null,
    assignedDriver: null,
    vehicleType: null,
    etaMin: null,
    matchingReason: "",
    matchingMode: null,
    matchingDecision: null,
  };
}

function resetLifecycleFields(trip) {
  return {
    ...trip,
    driverPaymentConfirmed: false,
    passengerReviewPending: false,
    completedAt: null,
  };
}

function makePendingDispatch(prev, rejectedDriverIds = prev.rejectedDriverIds || [], opsContext = {}) {
  const pwt = opsContext.pwt ?? prev.opsPwt ?? prev.assignmentContext?.pwt ?? null;
  return resetLifecycleFields({
    ...clearAssignmentFields(prev),
    status: "pending_dispatch",
    rejectedDriverIds,
    opsPwt: pwt,
    assignmentContext: { pwt },
  });
}

function normalizeTripState(trip) {
  if (trip.status === "pending_dispatch") {
    return buildDemoFallbackAssignment({ ...trip, rejectedDriverIds: [] }, {
      pwt: trip.opsPwt ?? trip.assignmentContext?.pwt ?? null,
    });
  }

  if (trip.status === "assigned" && (!trip.driverId || !trip.vehicleType || trip.etaMin == null || !trip.matchingDecision)) {
    return buildDemoFallbackAssignment({ ...trip, rejectedDriverIds: [] }, {
      pwt: trip.opsPwt ?? trip.assignmentContext?.pwt ?? null,
    });
  }

  if (trip.status === "idle") {
    return resetLifecycleFields({
      ...clearAssignmentFields(trip),
      status: "idle",
      rejectedDriverIds: [],
    });
  }

  return trip;
}

function buildDemoFallbackAssignment(prev, opsContext = {}) {
  if (!MOCK_DRIVER_POOL.length) {
    return makePendingDispatch(prev, prev.rejectedDriverIds || [], opsContext);
  }

  const fallbackDriver = MOCK_DRIVER_POOL.find((driver) => driver.id === "D101") || MOCK_DRIVER_POOL[0];
  const pwt = opsContext.pwt ?? prev.opsPwt ?? prev.assignmentContext?.pwt ?? 0;
  const decision = {
    mode: "Demo Fallback Matching",
    selectedDriverId: fallbackDriver.id,
    selectedDriverName: fallbackDriver.name,
    confidence: 1,
    score: 100,
    reasons: [
      "Demo fallback selected an available driver",
      `Capacity fits passenger request (${prev.passengerCount} pax / ${prev.luggageCount} bags)`,
      "Fallback prevents the presentation flow from stalling",
    ],
    candidateScores: MOCK_DRIVER_POOL.map((driver) => ({
      driverId: driver.id,
      name: driver.name,
      score: driver.id === fallbackDriver.id ? 100 : 80,
      etaMin: driver.etaMin,
      reason: driver.id === fallbackDriver.id ? "Selected demo fallback" : "Available fallback candidate",
    })),
    rejectedCandidates: [],
    recommendedAction: `Assign ${fallbackDriver.name} (${fallbackDriver.id}) to passenger`,
    createdAt: new Date().toISOString(),
  };

  return resetLifecycleFields({
    ...prev,
    status: "assigned",
    driverId: fallbackDriver.id,
    assignedDriver: fallbackDriver,
    vehicleType: fallbackDriver.vehicle,
    etaMin: fallbackDriver.etaMin,
    matchingReason: decision.reasons.slice(0, 2).join(" · "),
    matchingMode: decision.mode,
    matchingDecision: decision,
    rejectedDriverIds: [],
    opsPwt: pwt,
    assignmentContext: { pwt },
  });
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
        setActiveTripState(e.newValue ? readStoredTrip() : DEFAULT_ACTIVE_TRIP);
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
    function handleEscalationEvent(e) {
      setActiveEscalationState(e.detail || readStoredEscalation());
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener("helloride:activeEscalation", handleEscalationEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("helloride:activeEscalation", handleEscalationEvent);
    };
  }, []);

  function _buildAssignment(prev, opsContext = {}) {
    const eligible = MOCK_DRIVER_POOL.filter(
      (d) => !(prev.rejectedDriverIds || []).includes(d.id)
    );
    const decision = runMatchingAgent(
      { passengerCount: prev.passengerCount, luggageCount: prev.luggageCount },
      eligible,
      opsContext
    );
    if (!decision.selectedDriverId) {
      return buildDemoFallbackAssignment(
        { ...prev, rejectedDriverIds: [] },
        opsContext
      );
    }
    const driver = MOCK_DRIVER_POOL.find((d) => d.id === decision.selectedDriverId);
    return resetLifecycleFields({
      ...prev,
      status: "assigned",
      driverId: driver.id,
      assignedDriver: driver,
      vehicleType: driver.vehicle,
      etaMin: driver.etaMin,
      matchingReason: decision.reasons.slice(0, 2).join(" · "),
      matchingMode: decision.mode,
      matchingDecision: decision,
      opsPwt: opsContext.pwt ?? null,
      assignmentContext: { pwt: opsContext.pwt ?? null },
    });
  }

  const value = useMemo(() => {
    function setPassengerDestination(destination) {
      const nextDestination = splitDestination(destination);
      setActiveTripState((prev) => ({ ...prev, ...nextDestination }));
    }

    function updatePassengerTrip({ destination, passengerName, passengers, luggage, pickupGate, pickupAddress, pickupTerminal } = {}) {
      const nextDestination = destination ? splitDestination(destination) : {};
      setActiveTripState((prev) => ({
        ...prev,
        ...nextDestination,
        passengerName: passengerName ?? prev.passengerName,
        pickupGate: pickupGate ?? prev.pickupGate,
        pickupAddress: pickupAddress ?? prev.pickupAddress,
        pickupTerminal: pickupTerminal ?? prev.pickupTerminal,
        passengerCount: passengers ?? prev.passengerCount,
        luggageCount: luggage ?? prev.luggageCount,
      }));
    }

    function updateRideSelection({ vehicleType, fareTHB, distanceKM, tripTimeMin } = {}) {
      setActiveTripState((prev) => ({
        ...prev,
        requestedVehicleType: vehicleType || prev.requestedVehicleType,
        vehicleType: prev.status === "idle" ? null : prev.vehicleType,
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
      setActiveTripState((prev) => {
        const resolved = prev.selectedDestination || prev.destinationName || "Sukhumvit";
        const pwt = prev.opsPwt ?? prev.assignmentContext?.pwt ?? 0;
        const base = {
          ...resetLifecycleFields(clearAssignmentFields(prev)),
          ...splitDestination(resolved),
          status: "finding_driver",
          rejectedDriverIds: [],
        };
        return _buildAssignment(base, { pwt });
      });
    }

    function assignMatch(destination, opsContext = {}) {
      setActiveTripState((prev) => {
        const resolved = destination || prev.selectedDestination || prev.destinationName || "Sukhumvit";
        const base = { ...prev, ...splitDestination(resolved) };
        return _buildAssignment(base, opsContext);
      });
    }

    function resolveDemoPassengerMatch() {
      setActiveTripState((prev) => {
        if (!["booked", "finding_driver"].includes(prev.status)) return prev;
        const next = _buildAssignment(
          {
            ...resetLifecycleFields(clearAssignmentFields(prev)),
            rejectedDriverIds: [],
            status: "finding_driver",
          },
          { pwt: prev.opsPwt ?? prev.assignmentContext?.pwt ?? 0 }
        );
        window.localStorage.setItem(STORAGE_KEY_TRIP, JSON.stringify(next));
        window.localStorage.setItem("DemoMatchingContext", JSON.stringify(next));
        return next;
      });
    }

    function rejectAndRematch() {
      setActiveTripState((prev) => {
        const rejectedIds = [...(prev.rejectedDriverIds || []), prev.driverId].filter(Boolean);
        const eligible = MOCK_DRIVER_POOL.filter((d) => !rejectedIds.includes(d.id));
        const opsContext = { pwt: prev.opsPwt ?? prev.assignmentContext?.pwt ?? 0 };

        if (!eligible.length) {
          return _buildAssignment(
            {
              ...resetLifecycleFields(clearAssignmentFields(prev)),
              rejectedDriverIds: [],
              status: "finding_driver",
            },
            opsContext
          );
        }
        const decision = runMatchingAgent(
          { passengerCount: prev.passengerCount, luggageCount: prev.luggageCount },
          eligible,
          opsContext
        );
        if (!decision.selectedDriverId) {
          return _buildAssignment(
            {
              ...resetLifecycleFields(clearAssignmentFields(prev)),
              rejectedDriverIds: [],
              status: "finding_driver",
            },
            opsContext
          );
        }
        const driver = MOCK_DRIVER_POOL.find((d) => d.id === decision.selectedDriverId);
        return resetLifecycleFields({
          ...prev,
          status: "assigned",
          driverId: driver.id,
          assignedDriver: driver,
          vehicleType: driver.vehicle,
          etaMin: driver.etaMin,
          matchingReason: decision.reasons.slice(0, 2).join(" · "),
          matchingMode: decision.mode,
          matchingDecision: decision,
          rejectedDriverIds: rejectedIds,
          opsPwt: opsContext.pwt,
          assignmentContext: { pwt: opsContext.pwt },
        });
      });
    }

    function reDispatchTrip(opsContext = {}) {
      setActiveTripState((prev) => {
        const pwt = opsContext.pwt ?? prev.opsPwt ?? prev.assignmentContext?.pwt ?? 0;
        const base = {
          ...resetLifecycleFields(clearAssignmentFields(prev)),
          status: "finding_driver",
          rejectedDriverIds: [],
          opsPwt: pwt,
          assignmentContext: { pwt },
        };
        return _buildAssignment(base, { ...opsContext, pwt });
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
        passengerReviewPending: false,
        completedAt: new Date().toISOString(),
      }));
    }

    function confirmDriverPayment() {
      setActiveTripState((prev) => ({
        ...prev,
        paymentStatus: "paid",
        driverPaymentConfirmed: true,
        passengerReviewPending: true,
        completedAt: prev.completedAt || new Date().toISOString(),
      }));
    }

    function cancelPassengerRequest() {
      setActiveTripState((prev) => ({
        ...DEFAULT_ACTIVE_TRIP,
        selectedDestination: prev.selectedDestination,
        destinationName: prev.destinationName,
        destinationArea: prev.destinationArea,
        passengerCount: prev.passengerCount,
        luggageCount: prev.luggageCount,
        requestedVehicleType: prev.requestedVehicleType,
        vehicleType: null,
        fareTHB: prev.fareTHB,
        distanceKM: prev.distanceKM,
        tripTimeMin: prev.tripTimeMin,
        bookingFeeTHB: DEFAULT_ACTIVE_TRIP.bookingFeeTHB,
        paymentStatus: DEFAULT_ACTIVE_TRIP.paymentStatus,
        status: "idle",
        driverPaymentConfirmed: false,
        passengerReviewPending: false,
        completedAt: null,
        matchingMode: null,
        matchingDecision: null,
        rejectedDriverIds: [],
        opsPwt: null,
      }));
    }

    function completePassengerReview() {
      window.localStorage.removeItem(STORAGE_KEY_DISPATCH_MODE);
      setDispatchModeState(DEFAULT_DISPATCH_MODE);
      setActiveTripState((prev) => ({
        ...DEFAULT_ACTIVE_TRIP,
        selectedDestination: "",
        destinationName: "",
        destinationArea: "",
        passengerCount: prev.passengerCount,
        luggageCount: prev.luggageCount,
        requestedVehicleType: prev.requestedVehicleType,
        vehicleType: null,
        fareTHB: prev.fareTHB,
        distanceKM: prev.distanceKM,
        tripTimeMin: prev.tripTimeMin,
        bookingFeeTHB: DEFAULT_ACTIVE_TRIP.bookingFeeTHB,
        paymentStatus: DEFAULT_ACTIVE_TRIP.paymentStatus,
        status: "idle",
        driverPaymentConfirmed: false,
        passengerReviewPending: false,
        completedAt: null,
        matchingMode: null,
        matchingDecision: null,
        rejectedDriverIds: [],
        opsPwt: null,
      }));
    }

    function resetMatch() {
      window.localStorage.removeItem(STORAGE_KEY_TRIP);
      window.localStorage.removeItem(STORAGE_KEY_OPS);
      window.localStorage.removeItem(STORAGE_KEY_ESCALATION);
      window.localStorage.removeItem(STORAGE_KEY_DISPATCH_MODE);
      setActiveTripState((prev) => ({
        ...DEFAULT_ACTIVE_TRIP,
        selectedDestination: prev.selectedDestination,
        destinationName: prev.destinationName,
        destinationArea: prev.destinationArea,
        passengerCount: prev.passengerCount,
        luggageCount: prev.luggageCount,
        requestedVehicleType: prev.requestedVehicleType,
        vehicleType: null,
        fareTHB: prev.fareTHB,
        distanceKM: prev.distanceKM,
        tripTimeMin: prev.tripTimeMin,
        bookingFeeTHB: DEFAULT_ACTIVE_TRIP.bookingFeeTHB,
        paymentStatus: prev.paymentStatus,
        status: "idle",
        driverPaymentConfirmed: false,
        passengerReviewPending: false,
        completedAt: null,
        matchingMode: null,
        matchingDecision: null,
        rejectedDriverIds: [],
        opsPwt: null,
      }));
      setOpsActionState(null);
      setActiveEscalationState(null);
      setDispatchModeState(DEFAULT_DISPATCH_MODE);
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
      resolveDemoPassengerMatch,
      rejectAndRematch,
      reDispatchTrip,
      setOpsAction,
      createEscalation,
      acknowledgeEscalation,
      resolveEscalation,
      acceptMatch,
      markArrived,
      completeMatch,
      confirmDriverPayment,
      cancelPassengerRequest,
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
