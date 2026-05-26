export const MOCK_DRIVER_POOL = [
  { id: "D101", name: "Somchai Jaidee", vehicle: "Hello Taxi", maxPassengers: 4, maxLuggage: 4, etaMin: 4,  queuePosition: 1, acceptanceRate: 94 },
  { id: "D118", name: "Driver D118",    vehicle: "Hello Car",  maxPassengers: 2, maxLuggage: 2, etaMin: 6,  queuePosition: 2, acceptanceRate: 88 },
  { id: "D124", name: "Driver D124",    vehicle: "Hello Taxi", maxPassengers: 4, maxLuggage: 2, etaMin: 8,  queuePosition: 3, acceptanceRate: 91 },
  { id: "D205", name: "Driver D205",    vehicle: "Hello SUV",  maxPassengers: 6, maxLuggage: 6, etaMin: 11, queuePosition: 4, acceptanceRate: 76 },
];

export function runMatchingAgent(passengerRequest, driverPool, opsContext = {}) {
  const pwt = Number(opsContext.pwt) || 0;
  const { passengerCount = 1, luggageCount = 0 } = passengerRequest;

  let mode, etaWeight, queueWeight;
  if (pwt > 30) {
    mode = "Critical Priority Matching";
    etaWeight = 2.5;
    queueWeight = 0.5;
  } else if (pwt > 20) {
    mode = "Priority Matching";
    etaWeight = 1.5;
    queueWeight = 1.2;
  } else {
    mode = "Normal Matching";
    etaWeight = 1.0;
    queueWeight = 2.0;
  }

  const eligible = [];
  const rejected = [];

  for (const driver of driverPool) {
    if (driver.maxPassengers < passengerCount) {
      rejected.push({ driverId: driver.id, reason: `Capacity too small (${driver.maxPassengers} pax max, need ${passengerCount})` });
      continue;
    }
    if (driver.maxLuggage < luggageCount) {
      rejected.push({ driverId: driver.id, reason: `Luggage capacity too small (${driver.maxLuggage} bags max, need ${luggageCount})` });
      continue;
    }
    const etaScore = Math.max(0, 100 - driver.etaMin * 8);
    const queueScore = Math.max(0, 20 - driver.queuePosition * 4);
    const acceptBonus = driver.acceptanceRate * 0.2;
    const totalScore = Math.round(etaScore * etaWeight + queueScore * queueWeight + acceptBonus);
    eligible.push({ driver, score: totalScore });
  }

  if (!eligible.length) {
    return {
      mode,
      selectedDriverId: null,
      selectedDriverName: null,
      confidence: 0,
      score: 0,
      reasons: ["No eligible driver available for this request"],
      candidateScores: [],
      rejectedCandidates: rejected,
      recommendedAction: "No dispatch possible — re-check driver pool",
      createdAt: new Date().toISOString(),
    };
  }

  eligible.sort((a, b) => b.score - a.score);
  const best = eligible[0];

  const modeReason =
    pwt > 30
      ? "PWT exceeds 30 min — fastest ETA is prioritized"
      : pwt > 20
      ? "PWT exceeds 20 min — ETA and queue order balanced"
      : "PWT is normal — queue position used as primary factor";

  const reasons = [
    `Shortest ETA among eligible drivers (${best.driver.etaMin} min)`,
    `Capacity fits passenger request (${passengerCount} pax / ${luggageCount} bags)`,
    modeReason,
  ];

  return {
    mode,
    selectedDriverId: best.driver.id,
    selectedDriverName: best.driver.name,
    confidence: Math.min(1, parseFloat((best.score / 200).toFixed(2))),
    score: best.score,
    reasons,
    candidateScores: eligible.map((e) => ({
      driverId: e.driver.id,
      name: e.driver.name,
      score: e.score,
      etaMin: e.driver.etaMin,
      reason: e === best ? "Best ETA and capacity fit" : "Eligible but lower priority",
    })),
    rejectedCandidates: rejected,
    recommendedAction: `Assign ${best.driver.name} (${best.driver.id}) to passenger`,
    createdAt: new Date().toISOString(),
  };
}

export const PWT_SEVERITY = {
  NORMAL: "NORMAL",
  WATCH: "WATCH",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
};

export const MATCHING_MODE = {
  NORMAL: "NORMAL_MATCHING",
  PRIORITY: "PRIORITY_MATCHING",
  CRITICAL: "CRITICAL_MATCHING",
};

export const OPS_ACTION = {
  INCENTIVE_SENT: "incentive_sent",
  OVERFLOW_ACTIVATED: "overflow_activated",
  MAX_INCENTIVE_SENT: "max_incentive_sent",
};

export const PWT_THRESHOLDS = {
  EARLY_WATCH: 15,
  ACTION_BUFFER: 20,
  SLA_BREACH: 30,
};

export function getPwtSeverity(predictedPWT) {
  const value = Number(predictedPWT) || 0;
  if (value <= PWT_THRESHOLDS.EARLY_WATCH) return PWT_SEVERITY.NORMAL;
  if (value <= PWT_THRESHOLDS.ACTION_BUFFER) return PWT_SEVERITY.WATCH;
  if (value <= PWT_THRESHOLDS.SLA_BREACH) return PWT_SEVERITY.WARNING;
  return PWT_SEVERITY.CRITICAL;
}

export function getMatchingMode(predictedPWT) {
  const value = Number(predictedPWT) || 0;
  if (value <= PWT_THRESHOLDS.ACTION_BUFFER) return MATCHING_MODE.NORMAL;
  if (value <= PWT_THRESHOLDS.SLA_BREACH) return MATCHING_MODE.PRIORITY;
  return MATCHING_MODE.CRITICAL;
}

export function getSeverityTone(severity) {
  return {
    [PWT_SEVERITY.NORMAL]: {
      label: "NORMAL",
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      bar: "bg-emerald-500",
    },
    [PWT_SEVERITY.WATCH]: {
      label: "WATCH",
      dot: "bg-sky-500",
      text: "text-sky-700",
      bg: "bg-sky-50",
      border: "border-sky-200",
      bar: "bg-sky-500",
    },
    [PWT_SEVERITY.WARNING]: {
      label: "WARNING",
      dot: "bg-amber-400",
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      bar: "bg-amber-400",
    },
    [PWT_SEVERITY.CRITICAL]: {
      label: "CRITICAL",
      dot: "bg-red-500",
      text: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      bar: "bg-red-500",
    },
  }[severity] ?? {
    label: "NORMAL",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    bar: "bg-emerald-500",
  };
}

export function getActionRecommendation(severity) {
  return {
    [PWT_SEVERITY.NORMAL]: {
      label: "No action needed",
      copy: "No action needed · Normal conditions",
      button: "Maintain Queue",
    },
    [PWT_SEVERITY.WATCH]: {
      label: "Monitor only",
      copy: "Monitor only · prepare incentive if PWT exceeds 20 min",
      button: "Acknowledge Watch",
    },
    [PWT_SEVERITY.WARNING]: {
      label: "Send Incentive + Broadcast",
      copy: "Send Incentive + Broadcast to nearby drivers",
      button: "Send Incentive & Broadcast",
    },
    [PWT_SEVERITY.CRITICAL]: {
      label: "Send Incentive & Broadcast Drivers",
      copy: "Send Incentive & Broadcast Drivers + Broadcast Holding Zone + Send Max Incentive",
      button: "Send Incentive & Broadcast Drivers",
    },
  }[severity];
}

export function canRecommendIncentive(severity) {
  return severity === PWT_SEVERITY.WARNING || severity === PWT_SEVERITY.CRITICAL;
}

export function canRecommendOverflowLane(severity) {
  return severity === PWT_SEVERITY.CRITICAL;
}
