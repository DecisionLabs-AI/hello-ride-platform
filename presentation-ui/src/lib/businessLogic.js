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
