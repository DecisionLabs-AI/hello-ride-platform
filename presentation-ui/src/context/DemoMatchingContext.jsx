import { useEffect, useMemo, useState } from "react";
import { DemoMatchingContext } from "./DemoMatchingContextCore.js";

const STORAGE_KEY = "helloRideDemoMatching";

const DEFAULT_ACTIVE_TRIP = {
  tripId: "TRIP-20260522-001",
  passengerId: "P001",
  driverId: "D101",
  passengerName: "Tanaka K.",
  pickupTerminal: "Terminal 1",
  pickupGate: "Baggage Claim Gate A",
  pickupAddress: "Suvarnabhumi Airport, Terminal 1, Bangkok",
  selectedDestination: "",
  destinationName: "",
  destinationArea: "",
  vehicleType: "Hello Taxi",
  fareTHB: 385,
  distanceKM: 32.4,
  tripTimeMin: 45,
  bookingFeeTHB: 15,
  paymentStatus: "Payment pending",
  etaMin: 4,
  passengerCount: 3,
  luggageCount: 4,
  flightCode: "TG401",
  matchingReason: "Passenger waited 18 min; driver ETA is 4 min; vehicle capacity fits; high acceptance probability.",
  status: "idle",
};

function readStoredState() {
  if (typeof window === "undefined") return DEFAULT_ACTIVE_TRIP;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_ACTIVE_TRIP;

    const parsed = JSON.parse(stored);
    const storedTrip = parsed.activeTrip || parsed;
    const legacyStatus = parsed.matchingStatus || parsed.status;
    const selectedDestination =
      storedTrip.selectedDestination ||
      storedTrip.destinationName ||
      storedTrip.destination ||
      DEFAULT_ACTIVE_TRIP.selectedDestination;

    return {
      ...DEFAULT_ACTIVE_TRIP,
      ...storedTrip,
      selectedDestination,
      destinationName: storedTrip.destinationName || selectedDestination,
      destinationArea: storedTrip.destinationArea || selectedDestination,
      status: legacyStatus || storedTrip.status || DEFAULT_ACTIVE_TRIP.status,
    };
  } catch {
    return DEFAULT_ACTIVE_TRIP;
  }
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
  const [activeTrip, setActiveTrip] = useState(readStoredState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTrip }));
  }, [activeTrip]);

  const value = useMemo(() => {
    function setPassengerDestination(destination) {
      const nextDestination = splitDestination(destination);
      setActiveTrip((prev) => ({
        ...prev,
        ...nextDestination,
      }));
    }

    function updatePassengerTrip({ destination, passengers, luggage } = {}) {
      const nextDestination = destination ? splitDestination(destination) : {};
      setActiveTrip((prev) => ({
        ...prev,
        ...nextDestination,
        passengerCount: passengers ?? prev.passengerCount,
        luggageCount: luggage ?? prev.luggageCount,
      }));
    }

    function updateRideSelection({ vehicleType, fareTHB, distanceKM, tripTimeMin } = {}) {
      setActiveTrip((prev) => ({
        ...prev,
        vehicleType: vehicleType || prev.vehicleType,
        fareTHB: fareTHB ?? prev.fareTHB,
        distanceKM: distanceKM ?? prev.distanceKM,
        tripTimeMin: tripTimeMin ?? prev.tripTimeMin,
      }));
    }

    function assignMatch(destination) {
      setActiveTrip((prev) => {
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
        };
      });
    }

    function acceptMatch() {
      setActiveTrip((prev) => ({ ...prev, status: "accepted" }));
    }

    function markArrived() {
      setActiveTrip((prev) => ({ ...prev, status: "arrived" }));
    }

    function completeMatch() {
      setActiveTrip((prev) => ({ ...prev, status: "completed", paymentStatus: "Payment pending" }));
    }

    function resetMatch() {
      setActiveTrip((prev) => ({
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
      }));
    }

    return {
      activeTrip,
      setPassengerDestination,
      updatePassengerTrip,
      updateRideSelection,
      assignMatch,
      acceptMatch,
      markArrived,
      completeMatch,
      resetMatch,
    };
  }, [activeTrip]);

  return (
    <DemoMatchingContext.Provider value={value}>
      {children}
    </DemoMatchingContext.Provider>
  );
}
