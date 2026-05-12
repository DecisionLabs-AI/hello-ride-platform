const T1 = {
  code: "T1",
  title: "Terminal 1",
  pwt: 19,
  guardrailMin: 10,
  waitingPassengers: 302,
  waitingTrend: "+15%",
  holdingTaxis: 101,
  taxiTrend: "-6%",
  laneLoad: 87,
  activeLanes: 1,
  fleetReadiness: 93.9,
  projectedDeficit: 49,
  criticalWindow: { start: "14:45", end: "15:00" },
  aiAdvice:
    "Activate Terminal 1 overflow lane planning and broadcast a 6-minute head start to holding drivers.",
  deficitBreakdown: [
    { factor: "EK374 + QR833 arrival wave (JP/UAE routes)", impact: 120, type: "demand" },
    { factor: "QR scan spike at Claim C–D", impact: 35, type: "demand" },
    { factor: "Driver shortage — short-haul gap", impact: -20, type: "supply" },
    { factor: "Holding lane congestion (87% load)", impact: -15, type: "supply" },
  ],
  impactSimulation: {
    action: "Activate Overflow Lane + Broadcast to +6 min drivers",
    currentPwt: 19,
    projectedPwt: 11,
    pwtReductionPct: 42,
    currentDeficit: 49,
    projectedDeficit: 15,
    queueTimeReduction: 8,
  },
  forecastSeries: [
    { time: "14:00", demand: 34, supply: 46 },
    { time: "14:15", demand: 48, supply: 50 },
    { time: "14:30", demand: 70, supply: 49 },
    { time: "14:45", demand: 102, supply: 44 },
    { time: "15:00", demand: 136, supply: 43 },
    { time: "15:15", demand: 116, supply: 47 },
    { time: "15:30", demand: 84, supply: 50 },
    { time: "15:45", demand: 54, supply: 53 },
  ],
  flights: [
    { code: "TG401", origin: "Tokyo", eta: "14:35", terminal: "T1", status: "Bags on belt", demand: 84 },
    { code: "EK374", origin: "Dubai", eta: "14:50", terminal: "T1", status: "Taxiing", demand: 122 },
    { code: "QR833", origin: "Doha", eta: "15:10", terminal: "T1", status: "On final", demand: 96 },
  ],
  demandSignals: [
    { zone: "Claim A", time: "14:12", parties: 4, luggage: 3 },
    { zone: "Claim C", time: "14:18", parties: 3, luggage: 4 },
    { zone: "Claim D", time: "14:25", parties: 5, luggage: 6 },
  ],
  supplyItems: [
    { name: "Ready drivers", value: 101, detail: "33 in holding lane, 68 inbound" },
    { name: "Accepted dispatches", value: 35, detail: "Last 15 min" },
    { name: "Declines", value: 5, detail: "Mostly long-haul mismatch" },
  ],
};

const T2 = {
  code: "T2",
  title: "Terminal 2",
  pwt: 12,
  guardrailMin: 10,
  waitingPassengers: 40,
  waitingTrend: "+4%",
  holdingTaxis: 27,
  taxiTrend: "+2%",
  laneLoad: 63,
  activeLanes: 1,
  fleetReadiness: 95.3,
  projectedDeficit: 14,
  criticalWindow: { start: "15:00", end: "15:15" },
  aiAdvice:
    "Terminal 2 is within normal operating parameters. Maintain current dispatch cadence and monitor the 15:00 window.",
  deficitBreakdown: [
    { factor: "EK500 arrival wave (EU routes)", impact: 45, type: "demand" },
    { factor: "QR scan activity at Claim B", impact: 12, type: "demand" },
    { factor: "Adequate holding pool", impact: -5, type: "supply" },
    { factor: "Driver coverage sufficient", impact: -3, type: "supply" },
  ],
  impactSimulation: {
    action: "Maintain current dispatch + monitor 15:00 window",
    currentPwt: 12,
    projectedPwt: 9,
    pwtReductionPct: 25,
    currentDeficit: 14,
    projectedDeficit: 6,
    queueTimeReduction: 3,
  },
  forecastSeries: [
    { time: "14:00", demand: 20, supply: 30 },
    { time: "14:15", demand: 24, supply: 30 },
    { time: "14:30", demand: 28, supply: 28 },
    { time: "14:45", demand: 35, supply: 27 },
    { time: "15:00", demand: 42, supply: 27 },
    { time: "15:15", demand: 38, supply: 29 },
    { time: "15:30", demand: 32, supply: 30 },
    { time: "15:45", demand: 25, supply: 31 },
  ],
  flights: [
    { code: "EK500", origin: "London", eta: "14:55", terminal: "T2", status: "Taxiing", demand: 45 },
    { code: "LH760", origin: "Frankfurt", eta: "15:20", terminal: "T2", status: "On final", demand: 38 },
  ],
  demandSignals: [
    { zone: "Claim B", time: "14:20", parties: 2, luggage: 2 },
    { zone: "Claim E", time: "14:30", parties: 2, luggage: 3 },
  ],
  supplyItems: [
    { name: "Ready drivers", value: 27, detail: "15 in holding lane, 12 inbound" },
    { name: "Accepted dispatches", value: 12, detail: "Last 15 min" },
    { name: "Declines", value: 1, detail: "Long-haul preference" },
  ],
};

const ALL = {
  code: "ALL",
  title: "All terminals",
  pwt: 18,
  guardrailMin: 10,
  waitingPassengers: 342,
  waitingTrend: "+12%",
  holdingTaxis: 128,
  taxiTrend: "-4%",
  laneLoad: 84,
  activeLanes: 2,
  fleetReadiness: 94.1,
  projectedDeficit: 45,
  criticalWindow: { start: "14:45", end: "15:15" },
  aiAdvice:
    "Balance Terminal 1 surge control with a steady Terminal 2 release wave and keep driver broadcasts synchronized airport-wide.",
  deficitBreakdown: [
    { factor: "EK374 + QR833 arrival wave (T1 — JP/UAE routes)", impact: 120, type: "demand" },
    { factor: "QR scan spike at Claim C–D (T1)", impact: 35, type: "demand" },
    { factor: "EK500 arrival wave (T2 — EU routes)", impact: 45, type: "demand" },
    { factor: "Driver shortage — short-haul gap", impact: -23, type: "supply" },
    { factor: "Holding lane congestion (T1: 87% load)", impact: -15, type: "supply" },
  ],
  impactSimulation: {
    action: "Activate Overflow Lane + Broadcast to +6 min drivers (T1 priority)",
    currentPwt: 18,
    projectedPwt: 12,
    pwtReductionPct: 33,
    currentDeficit: 45,
    projectedDeficit: 18,
    queueTimeReduction: 6,
  },
  forecastSeries: [
    { time: "14:00", demand: 54, supply: 76 },
    { time: "14:15", demand: 72, supply: 80 },
    { time: "14:30", demand: 98, supply: 77 },
    { time: "14:45", demand: 137, supply: 71 },
    { time: "15:00", demand: 178, supply: 70 },
    { time: "15:15", demand: 154, supply: 76 },
    { time: "15:30", demand: 116, supply: 80 },
    { time: "15:45", demand: 79, supply: 84 },
  ],
  flights: [
    { code: "TG401", origin: "Tokyo", eta: "14:35", terminal: "T1", status: "Bags on belt", demand: 84 },
    { code: "EK374", origin: "Dubai", eta: "14:50", terminal: "T1", status: "Taxiing", demand: 122 },
    { code: "EK500", origin: "London", eta: "14:55", terminal: "T2", status: "Taxiing", demand: 45 },
    { code: "QR833", origin: "Doha", eta: "15:10", terminal: "T1", status: "On final", demand: 96 },
    { code: "LH760", origin: "Frankfurt", eta: "15:20", terminal: "T2", status: "On final", demand: 38 },
  ],
  demandSignals: [
    { zone: "Claim A (T1)", time: "14:12", parties: 4, luggage: 3 },
    { zone: "Claim B (T2)", time: "14:20", parties: 2, luggage: 2 },
    { zone: "Claim C (T1)", time: "14:18", parties: 3, luggage: 4 },
    { zone: "Claim D (T1)", time: "14:25", parties: 5, luggage: 6 },
    { zone: "Claim E (T2)", time: "14:30", parties: 2, luggage: 3 },
  ],
  supplyItems: [
    { name: "Ready drivers", value: 128, detail: "101 T1 ready, 27 T2 ready" },
    { name: "Accepted dispatches", value: 47, detail: "Last 15 min across terminals" },
    { name: "Declines", value: 6, detail: "Combined airport response pulse" },
  ],
};

const TERMINALS = { T1, T2, ALL };

export function getOpsData(terminal) {
  return TERMINALS[terminal] ?? TERMINALS.T1;
}

export const ADVISORY_RESPONSES = {
  "What is causing the projected deficit?":
    "The 49% projected deficit is driven by simultaneous arrival waves from EK374 (Dubai) and QR833 (Doha) delivering an estimated 218 passengers to Terminal 1 between 14:45 and 15:10. Lane 1 is at 87% load capacity, and 12 short-haul drivers remain in the holding queue. Supply cannot absorb the incoming demand without overflow activation.",
  "Should we activate overflow capacity now?":
    "Yes. The forecast shows demand peaking at 136 passengers at 15:00 with only 43 taxis available — a 93-taxi shortfall. Activating overflow now gives drivers a 6-minute head start to position before peak arrival. Delay of 15+ minutes would push PWT above 25 min.",
  "Summarize Terminal 1 status":
    "Terminal 1 is in a critical deficit state. PWT is 19 min (guardrail: 10 min). 302 passengers waiting. 101 taxis available vs 136 demand at peak (15:00). Deficit window runs 14:45–15:00. Two high-demand flights inbound. Recommended: activate overflow lane and broadcast immediately.",
  "What should ops do in the next 15 minutes?":
    "1. Activate overflow lane now — adds ~28 taxis per slot. 2. Broadcast holding drivers with +6 min head start by 14:44. 3. Monitor PWT every 5 min — target below 12 min by 15:15. 4. Reduce short-haul hold time from 4 min to 2 min to free 12 drivers. 5. Alert Terminal 2 dispatch to absorb any overflow.",
  "Explain the arrival wave risk":
    "EK374 from Dubai (122 forecast pax) and QR833 from Doha (96 forecast pax) are arriving within 35 minutes of each other. Combined with the QR scan spike at Claim C–D (+35 demand), this creates a 155+ passenger surge that exceeds current lane capacity by 49%. The overlap creates a compound wave — harder to absorb than sequential arrivals.",
  "Are drivers sufficient for current demand?":
    "No. Current supply: 101 taxis (33 in holding, 68 inbound). Peak demand at 15:00: 136 passengers. Net shortfall: 35 taxis at peak. The gap is worsened by 12 drivers in short-haul holding not yet dispatched. Activating overflow and broadcasting to holding drivers would close the gap to approximately 8 taxis — within safe operating range.",
};
