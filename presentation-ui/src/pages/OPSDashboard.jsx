import { useEffect, useRef, useState } from "react";
import { getOpsData, ADVISORY_RESPONSES } from "../data/mockOps.js";
import { meta, kpiSummary, demandChartData, recentAlerts, aiAdvisory, dispatchSummary } from "../data/index.js";
import { EDGE_CASE_PROTOCOLS } from "../data/edgeCaseProtocols.js";
import { useDemoMatching } from "../context/useDemoMatching.js";
import {
  getActionRecommendation,
  getMatchingMode,
  getPwtSeverity,
  getSeverityTone,
  canRecommendIncentive,
  canRecommendOverflowLane,
  OPS_ACTION,
  PWT_SEVERITY,
  PWT_THRESHOLDS,
  MOCK_DRIVER_POOL,
} from "../lib/businessLogic.js";
import { useLanguage } from "../context/useLanguage.js";
import { matchProtocol } from "../lib/protocolMatcher.js";

const OPS_SYNC_STORAGE_KEYS = [
  "helloride_activeEscalation",
  "helloride_opsAction",
  "helloride_activeTrip",
  "helloride_passengerMessages",
];

const OPS_PRIMARY_RECOMMENDATION =
  "Supply shortage detected. Gap = 12. Send incentive broadcast to call taxis from holding zone immediately. Tier 2 dispatch required.";
const ROOT_CAUSE_SUMMARY = "QR +8.2 min | Peak hour +5.2 min | Lane capacity −4.1 min | Weekend +2.8 min";

function readStorageJson(key) {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function isPassengerHelpEscalation(escalation) {
  return escalation?.sourceRole === "Passenger Support Chat";
}

function getActiveEscalationCount(escalations) {
  const records = Array.isArray(escalations) ? escalations : [escalations];
  return records.filter((record) => {
    if (!record || !isPassengerHelpEscalation(record)) return false;
    const status = String(record.status || "").toLowerCase();
    if (["acknowledged", "resolved", "closed"].includes(status)) return false;

    const severity = String(record.severity || "").toUpperCase();
    const type = String(record.type || "").toUpperCase();
    const protocol = `${record.protocolId || ""} ${record.protocolName || ""}`.toLowerCase();
    const text = String(record.text || record.message || "").toLowerCase();

    return (
      ["SAFETY", "SOS", "EMERGENCY"].includes(type) ||
      ["HIGH", "CRITICAL"].includes(severity) ||
      protocol.includes("sos") ||
      protocol.includes("safety") ||
      protocol.includes("emergency") ||
      text.includes("emergency") ||
      text.includes("safety")
    );
  }).length;
}

function readPassengerMessages() {
  const messages = readStorageJson("helloride_passengerMessages");
  return Array.isArray(messages) ? messages : [];
}

function buildOpsView() {
  const base = getOpsData("ALL");
  const pwt = Math.round(kpiSummary.currentPWT);
  const predictedPWT = Math.round(kpiSummary.currentPWTPrediction);
  const slaThreshold = Math.round(meta.breachThreshold);
  const pwtImprovement = Math.round(((predictedPWT - slaThreshold) / predictedPWT) * 100);
  const holdingTaxis = Math.round(kpiSummary.taxisAtCurb);
  const waitingPassengers = Math.round(kpiSummary.confirmedQR);
  const laneLoad = Math.round((kpiSummary.confirmedQR / kpiSummary.laneCapacity) * 100);
  const projectedDeficit = Math.min(99, Math.round(kpiSummary.breachRate));

  const forecastSeries = demandChartData.map((item) => ({
    time: item.label,
    pwt: Math.round(item.avgWaitMin),
  }));

  // Map recentAlerts → demandSignals shape expected by DataSection
  const demandSignals = recentAlerts.map((alert) => ({
    zone: `Alert ${alert.time}`,
    time: alert.time,
    parties: Math.round(alert.confirmedQR),
    luggage: alert.arrivingFlights,
  }));

  return {
    ...base,
    pwt,
    severity: getPwtSeverity(pwt),
    predictedPwt: predictedPWT,
    holdingTaxis,
    waitingPassengers,
    laneLoad,
    projectedDeficit,
    aiAdvice: OPS_PRIMARY_RECOMMENDATION,
    forecastSeries,
    demandSignals,
    deficitBreakdown: aiAdvisory.topFactors,
    impactSimulation: {
      ...base.impactSimulation,
      currentPwt: pwt,
      projectedPwt: slaThreshold,
      predictedPwt: predictedPWT,
      currentDeficit: projectedDeficit,
      projectedDeficit: Math.max(5, projectedDeficit - 28),
      pwtReductionPct: pwtImprovement,
    },
  };
}

const OPS_AUTH_KEY = "helloRideOpsAuth";
const OPS_DEMO_USERNAME = "ops_demo";
const OPS_DEMO_PASSWORD = "1234";

function getStoredOpsAuth() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(OPS_AUTH_KEY) === "true";
}

// ── Shared sub-components ───────────────────────────────────────────────────

const INFO_ICON_CLASS = "flex w-4 h-4 cursor-pointer items-center justify-center text-gray-400 transition-colors hover:text-gray-600 focus:outline-none";

function Eyebrow({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{children}</p>
  );
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="mb-5 flex items-start gap-2.5">
      <div className="w-0.5 h-6 bg-brand rounded-full mt-0.5 shrink-0" />
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 mt-0.5">{title}</h2>
      </div>
    </div>
  );
}

// ── PWT Gauge (standalone — no outer card) ─────────────────────────────────

function PWTGauge({ value }) {
  const { t } = useLanguage();
  const severity = getPwtSeverity(value);
  const tone = getSeverityTone(severity);
  const isCritical = severity === PWT_SEVERITY.CRITICAL;
  const max = 45;
  const progress = Math.min(value / max, 1);
  const r = 58;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const progressLen = arcLen * progress;

  return (
    <div className="flex flex-col items-center shrink-0">
      <svg width="164" height="150" viewBox="0 0 164 150">
        <circle
          cx="82" cy="90" r={r} fill="none"
          stroke={isCritical ? "rgba(180,30,30,0.15)" : "rgba(0,0,0,0.08)"} strokeWidth="11"
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeLinecap="round"
          transform="rotate(135 82 90)"
        />
        <circle
          cx="82" cy="90" r={r} fill="none"
          stroke={isCritical ? "#b91c1c" : severity === PWT_SEVERITY.WARNING ? "#f59e0b" : severity === PWT_SEVERITY.WATCH ? "#0ea5e9" : "#00b14f"} strokeWidth="11"
          strokeDasharray={`${progressLen} ${circ - progressLen}`}
          strokeLinecap="round"
          transform="rotate(135 82 90)"
        />
        <text x="82" y="86" textAnchor="middle" fontSize="42" fontWeight="800"
          fill={isCritical ? "#b91c1c" : "#1a2b5e"} fontFamily="system-ui, sans-serif">
          {value}
        </text>
        <text x="82" y="108" textAnchor="middle" fontSize="12" fill="#94a3b8"
          fontFamily="system-ui, sans-serif" fontWeight="500">
          MIN PWT
        </text>
      </svg>
      <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${tone.bg} ${tone.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
        {t(`ops.${severity.toLowerCase()}`)}
      </span>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Max 45 min</p>
    </div>
  );
}

// ── Main Health Card ────────────────────────────────────────────────────────

function getCardSeverityAccent(severity) {
  if (severity === PWT_SEVERITY.CRITICAL) return "border-t-[3px] border-t-[#EF4444]";
  if (severity === PWT_SEVERITY.WARNING) return "border-t-[3px] border-t-[#F59E0B]";
  return "";
}

function SLAStatusRow({ currentPWT }) {
  const levels = [
    { id: "normal", label: "Normal", threshold: "≤15 min", active: currentPWT <= 15, color: "#9CA3AF" },
    { id: "watch", label: "Watch", threshold: "15–30 min", active: currentPWT > 15 && currentPWT <= 30, color: "#F59E0B" },
    { id: "critical", label: "Critical", threshold: ">30 min", active: currentPWT > 30, color: "#DC2626" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5">
      <p className="shrink-0 text-xs font-semibold uppercase tracking-widest text-gray-400">SLA Status</p>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        {levels.map((level) => (
          <div key={level.id} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-sm leading-none"
                style={{ color: level.active ? level.color : "#CBD5E1" }}
              >
                {level.active ? "●" : "○"}
              </span>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600">{level.label}</p>
            </div>
            <p className="mt-0.5 text-[10px] font-medium text-gray-400">{level.threshold}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthCard({ d }) {
  const severity = getPwtSeverity(d.pwt);
  const severityTone = getSeverityTone(severity);
  const predictedForecast = Math.floor(kpiSummary.currentPWTPrediction);
  const loadTone = {
    [PWT_SEVERITY.CRITICAL]: { pill: `${severityTone.bg} ${severityTone.text} border ${severityTone.border}`, label: "Critical" },
    [PWT_SEVERITY.WARNING]: { pill: `${severityTone.bg} ${severityTone.text} border ${severityTone.border}`, label: "High Load" },
    [PWT_SEVERITY.WATCH]: { pill: `${severityTone.bg} ${severityTone.text} border ${severityTone.border}`, label: "Watch" },
    [PWT_SEVERITY.NORMAL]: { pill: `${severityTone.bg} ${severityTone.text} border ${severityTone.border}`, label: "Normal Load" },
  }[severity];
  const severityAccent = getCardSeverityAccent(severity);

  return (
    <div className={`flex min-w-0 flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${severityAccent}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Live Situation</p>
        <h2 className="mt-0.5 text-xl font-extrabold text-[#1a2b5e]">Curb load and queue health</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div>
          <p className="text-5xl font-bold leading-none text-red-600">{d.pwt}</p>
          <p className="mt-2 text-xs font-semibold text-gray-500">min PWT</p>
          <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${loadTone.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${severityTone.dot}`} />
            {loadTone.label}
          </span>
        </div>

        <div className="hidden w-px bg-gray-100 md:block" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Waiting PAX</p>
          <div className="mt-2 flex items-end gap-1.5">
            <p className="text-3xl font-bold leading-none text-gray-900">{d.waitingPassengers.toLocaleString()}</p>
            <span className={`mb-0.5 text-sm font-bold ${d.waitingTrend?.startsWith("+") ? "text-red-500" : "text-green-600"}`}>
              {d.waitingTrend}
            </span>
          </div>
        </div>

        <div className="hidden w-px bg-gray-100 md:block" />

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Holding Taxis</p>
          <div className="mt-2 flex items-end gap-1.5">
            <p className="text-3xl font-bold leading-none text-gray-900">{d.holdingTaxis}</p>
            <span className={`mb-0.5 text-sm font-bold ${d.taxiTrend?.startsWith("-") ? "text-red-500" : "text-green-600"}`}>
              {d.taxiTrend}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-4 py-2">
        <p className="shrink-0 text-xs font-semibold text-gray-500">AI forecast · +15 min projection</p>
        <p className="text-sm font-semibold text-slate-700">
          {Math.round(kpiSummary.currentPWT)} MIN
          {" → "}
          <span className={`font-semibold ${kpiSummary.currentPWTPrediction > kpiSummary.currentPWT ? "text-red-600" : "text-green-600"}`}>
            {predictedForecast} MIN
            {" "}
            {kpiSummary.currentPWTPrediction > kpiSummary.currentPWT ? "↑" : "↓"}
          </span>
        </p>
      </div>

      <SLAStatusRow currentPWT={d.pwt} />
    </div>
  );
}

// ── Projected Deficit Alert Card ────────────────────────────────────────────

function AlertCard({ d, laneActivated, broadcastSent, onApproveAction }) {
  const { t } = useLanguage();
  const severity = getPwtSeverity(d.pwt);
  const tone = getSeverityTone(severity);
  const action = getActionRecommendation(severity);
  const canAct = canRecommendIncentive(severity) || canRecommendOverflowLane(severity);
  const actionDone = severity === PWT_SEVERITY.CRITICAL ? laneActivated : broadcastSent;
  const criticalActionText = OPS_PRIMARY_RECOMMENDATION;
  const dispatchTier = Math.round(kpiSummary.dispatchTier ?? 1);
  const isSupplyShortage = dispatchTier >= 2 || (kpiSummary.dispatchGap ?? 0) > 0;
  const actionButton = severity === PWT_SEVERITY.CRITICAL
    ? "Approve Incentive Broadcast"
    : severity === PWT_SEVERITY.WARNING
    ? `${t("ops.sendIncentive")} / ${t("ops.broadcastDrivers")}`
    : action.button;
  const actionCopyText = {
    [PWT_SEVERITY.NORMAL]: t("ops.actionCopyNormal"),
    [PWT_SEVERITY.WATCH]: t("ops.actionCopyWatch"),
    [PWT_SEVERITY.WARNING]: t("ops.actionCopyWarning"),
    [PWT_SEVERITY.CRITICAL]: criticalActionText,
  }[severity];

  return (
    <div className={`${severity === PWT_SEVERITY.CRITICAL ? "bg-[#7B1A1A] text-white" : "bg-white text-slate-900"} flex min-w-0 flex-col gap-3 rounded-xl border border-gray-100 p-4 shadow-sm`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${severity === PWT_SEVERITY.CRITICAL ? "text-red-200" : tone.text}`}>
        ⚠ Critical alert
      </p>
      <p className={`text-base font-bold leading-snug ${severity === PWT_SEVERITY.CRITICAL ? "text-white" : "text-slate-900"}`}>{actionCopyText}</p>
      <p className={`text-xs leading-snug ${severity === PWT_SEVERITY.CRITICAL ? "text-red-200" : "text-slate-500"}`}>{t("ops.aiAdvisoryOnly")}</p>
      <button
        onClick={() => onApproveAction(severity)}
        disabled={!canAct || actionDone}
        className={`mt-1 flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-colors active:scale-95 ${
          severity === PWT_SEVERITY.CRITICAL
            ? "bg-white text-red-800 hover:bg-red-50 disabled:bg-emerald-50 disabled:text-brand"
            : "bg-[#154aa8] text-white hover:bg-[#0f2f68] disabled:bg-slate-100 disabled:text-slate-400"
        }`}
      >
        {actionDone ? t("ops.approved") : actionButton}
      </button>
      <div className={`rounded-lg p-3 ${severity === PWT_SEVERITY.CRITICAL ? "bg-white/10" : "bg-slate-50 border border-slate-100"}`}>
        <p className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${severity === PWT_SEVERITY.CRITICAL ? "text-red-200" : "text-slate-400"}`}>
          Supply Analysis
        </p>
        <span className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
          isSupplyShortage
            ? "border border-orange-200 bg-orange-50 text-orange-700"
            : "border border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isSupplyShortage ? "bg-orange-500" : "bg-emerald-500"}`} />
          Dispatch Tier: {dispatchTier} — {isSupplyShortage ? "Supply Shortage" : "Supply Sufficient"}
        </span>
        <div className="mb-2 flex gap-3">
          <div className="flex-1">
            <p className={`text-[10px] uppercase tracking-widest ${severity === PWT_SEVERITY.CRITICAL ? "text-red-200" : "text-slate-400"}`}>Predicted Taxis</p>
            <p className={`text-xl font-black ${severity === PWT_SEVERITY.CRITICAL ? "text-white" : "text-slate-900"}`}>{Math.round(kpiSummary.predSupply)}</p>
          </div>
          <div className={`w-px ${severity === PWT_SEVERITY.CRITICAL ? "bg-white/20" : "bg-slate-200"}`} />
          <div className="flex-1">
            <p className={`text-[10px] uppercase tracking-widest ${severity === PWT_SEVERITY.CRITICAL ? "text-red-200" : "text-slate-400"}`}>Taxis Needed</p>
            <p className={`text-xl font-black ${severity === PWT_SEVERITY.CRITICAL ? "text-white" : "text-slate-900"}`}>{Math.round(kpiSummary.predDemand)}</p>
          </div>
        </div>
        <p className={`text-xs leading-snug ${severity === PWT_SEVERITY.CRITICAL ? "text-red-100" : "text-slate-600"}`}>
          {kpiSummary.dispatchGap > 0
            ? `Gap ${Math.round(kpiSummary.dispatchGap)} · send incentive broadcast to call taxis from holding zone`
            : "Tier 1 — supply sufficient · issue is lane throughput and holding-zone flow"}
        </p>
      </div>
    </div>
  );
}

// ── AI Situation Brief ─────────────────────────────────────────────────────

function AISituationBrief({ d }) {
  const severity = getPwtSeverity(d.pwt);
  const currentPWT = Math.round(kpiSummary.currentPWT);
  const slaTarget = Math.round(meta.breachThreshold);
  const briefText = severity === PWT_SEVERITY.CRITICAL
    ? `Suvarnabhumi Airport is entering a queue pressure window. PWT is ${d.pwt} min with ${d.waitingPassengers.toLocaleString()} waiting passengers queued at curb. The 30-min SLA threshold is exceeded; OPS approval required before action.`
    : severity === PWT_SEVERITY.WARNING
    ? "Queue approaching threshold. Monitor and prepare lane throughput response."
    : "Queue operating within normal parameters. No immediate action required.";

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.35fr_auto_0.9fr_auto_0.9fr] md:items-stretch">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="material-symbols-outlined leading-none text-blue-500" style={{ fontSize: "17px" }}>auto_awesome</span>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">AI Situation Brief</p>
          </div>
          <p className="text-sm leading-snug text-gray-700">{briefText}</p>
        </div>
        <div className="hidden w-px bg-blue-200/70 md:block" />
        <div>
          <p className="text-sm font-semibold leading-snug text-blue-700">
            Recommended next action:
          </p>
          <p className="mt-1 text-sm leading-snug text-gray-700">{OPS_PRIMARY_RECOMMENDATION}</p>
        </div>
        <div className="hidden w-px bg-blue-200/70 md:block" />
        <div>
          <p className="text-sm font-bold leading-snug text-slate-900">Expected impact:</p>
          <p className="mt-1 text-sm leading-snug text-gray-700">
            PWT improves from <span className="font-bold">{currentPWT}</span> → <span className="font-bold">{slaTarget} min</span> <span className="font-semibold">(SLA target)</span>; deficit drops from <span className="font-bold">{d.projectedDeficit}%</span> → <span className="font-bold">10%</span>.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Demand Chart ───────────────────────────────────────────────────────────

function DemandChart({ series, currentPwt = kpiSummary.currentPWT }) {
  const severity = getPwtSeverity(currentPwt);
  const severityAccent = getCardSeverityAccent(severity);
  const W = 640, H = 300, padL = 50, padR = 20, padT = 20, padB = 44;
  const iW = W - padL - padR, iH = H - padT - padB;
  const maxVal = Math.max(90, Math.ceil(currentPwt / 15) * 15);
  const slaThreshold = 30;
  const xStep = iW / (series.length - 1);
  const toX = (i) => padL + i * xStep;
  const toY = (v) => padT + iH - (v / maxVal) * iH;
  const slaY = toY(slaThreshold);
  const pwtPts = series.map((d, i) => `${toX(i)},${toY(d.pwt)}`).join(" ");
  const nowX = toX(7.5);

  return (
    <div className={`overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${severityAccent}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Predictive forecast</p>
          <h2 className="mt-0.5 text-xl font-bold text-gray-900">Arrival wave analysis</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block w-5 shrink-0" style={{ borderTop: "2px solid #154AA8", marginTop: "1px" }} />
            PWT (min)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-red-600">
            <span className="inline-block w-5 shrink-0" style={{ borderTop: "2px dashed #dc2626", marginTop: "1px" }} />
            SLA 30 min
          </div>
          <span className="relative flex items-center group">
            <button
              type="button"
              aria-label="Arrival wave data explanation"
              className={INFO_ICON_CLASS}
            >
              ⓘ
            </button>
            <span
              className="absolute right-0 top-6 z-20 hidden group-hover:block rounded-lg bg-slate-800 text-white text-xs px-3 py-2 shadow-lg whitespace-pre-line pointer-events-none"
              style={{ minWidth: "300px" }}
            >{`PWT (min) — ค่าเฉลี่ย avgWaitMin ต่อชั่วโมง จาก hybrid dataset\nSLA Threshold — เกณฑ์เวลารอ 30 นาที`}</span>
          </span>
        </div>
      </div>
      {/* No explicit height on SVG — scales naturally from viewBox aspect ratio (640:300 ≈ 2.1) */}
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {series.map((d, i) => {
            if (d.pwt <= slaThreshold) return null;
            const x1 = Math.max(padL, toX(i) - xStep / 2);
            const x2 = Math.min(W - padR, toX(i) + xStep / 2);
            return <rect key={`critical-${d.time}`} x={x1} y={padT} width={x2 - x1} height={iH} fill="rgba(220,38,38,0.08)" />;
          })}
          {[0, 30, 60, 90].map((tick) => (
            <line key={tick} x1={padL} y1={toY(tick)} x2={W - padR} y2={toY(tick)}
              stroke="rgba(0,0,0,0.06)" strokeWidth={1} strokeDasharray="4 4" />
          ))}
          <line x1={padL} y1={slaY} x2={W - padR} y2={slaY} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="6 5" />
          <text x={W - padR - 4} y={slaY - 6} textAnchor="end" fontSize={10} fill="#dc2626" fontFamily="system-ui" fontWeight="700">
            SLA Threshold
          </text>
          <text
            x={padL + iW / 2} y={padT + 14}
            textAnchor="middle" fontSize={8} fill="#dc2626"
            fontFamily="system-ui" fontWeight="600" letterSpacing="1"
          >
            CRITICAL DEFICIT WINDOW
          </text>
          {[0, 30, 60, 90].map((tick) => (
            <text key={tick} x={padL - 6} y={toY(tick) + 4}
              textAnchor="end" fontSize={10} fill="#94a3b8" fontFamily="system-ui">
              {tick}
            </text>
          ))}
          <text
            x={14} y={padT + iH / 2}
            textAnchor="middle" fontSize={10} fill="#64748b"
            fontFamily="system-ui" fontWeight="700"
            transform={`rotate(-90 14 ${padT + iH / 2})`}
          >
            PWT (min)
          </text>
          <polyline points={pwtPts} fill="none" stroke="#154AA8" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          {series.map((d, i) => (
            <circle key={`point-${d.time}`} cx={toX(i)} cy={toY(d.pwt)} r={2.5} fill="#154AA8" />
          ))}
          <line x1={nowX} y1={padT} x2={nowX} y2={H - padB} stroke="#dc2626" strokeWidth={1} strokeDasharray="4 4" opacity="0.7" />
          {series.map((d, i) => (
            i % 4 === 0 ? (
              <text key={i} x={toX(i)} y={H - 10} textAnchor="middle" fontSize={10} fill="#64748b" fontFamily="system-ui">{d.time}</text>
            ) : null
          ))}
          <text x={nowX} y={H - 26} textAnchor="middle" fontSize={10} fill="#dc2626" fontFamily="system-ui" fontWeight="700">
            07:30
          </text>
        </svg>
        <div className="mt-3 text-center text-xs font-semibold text-slate-500">
          Time of Day
        </div>
      </div>
    </div>
  );
}

// ── Deficit Breakdown ──────────────────────────────────────────────────────

function DeficitBreakdown({ breakdown }) {
  const { t } = useLanguage();
  function signalMeta(item) {
    const featureLabels = {
      confirmedQR: "QR Demand",
      arrivingFlights: "Peak Hour Effect (07:30)",
      hourOfDay: "Peak Hour Effect (07:30)",
      avgLaneCapacity: "Lane Capacity Constraint",
      isWeekend: "Weekend Surge",
    };
    const featureIcons = {
      confirmedQR: "qr_code_scanner",
      arrivingFlights: "schedule",
      hourOfDay: "schedule",
      avgLaneCapacity: "traffic",
      isWeekend: "calendar_month",
    };
    const directionTone = {
      up: {
        accent: "border-[#FCA5A5] bg-[#FEF2F2]",
        iconColor: "text-red-500",
        titleColor: "text-red-700",
        valueColor: "text-red-600",
      },
      down: {
        accent: "border-[#86EFAC] bg-[#F0FDF4]",
        iconColor: "text-green-500",
        titleColor: "text-green-700",
        valueColor: "text-green-600",
      },
      neutral: {
        accent: "border-gray-200 bg-gray-50",
        iconColor: "text-gray-500",
        titleColor: "text-gray-700",
        valueColor: "text-gray-600",
      },
    };
    const tone = directionTone[item.direction] ?? directionTone.neutral;
    return {
      label: featureLabels[item.feature] ?? item.feature,
      icon: featureIcons[item.feature] ?? "analytics",
      accent: tone.accent,
      iconColor: tone.iconColor,
      titleColor: tone.titleColor,
      valueColor: tone.valueColor,
      value: item.feature === "isWeekend" ? (kpiSummary.isWeekend ? "+2.8 min" : "+0.0 min") : item.impact,
    };
  }

  return (
    <div className="rounded-xl border border-gray-100 border-t-[3px] border-t-[#EF4444] bg-white p-4 shadow-sm">
        <div className="mb-3">
          <Eyebrow>{t("ops.rootCause")}</Eyebrow>
          <h2 className="mt-0.5 text-lg font-bold text-slate-900">Why the gap is forming</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">{ROOT_CAUSE_SUMMARY}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {breakdown.map((item) => {
            const meta = signalMeta(item);
            return (
              <div key={item.feature} className={`flex min-h-[112px] flex-col gap-2 rounded-lg border p-3 ${meta.accent}`}>
                <div className="flex min-w-0 items-start gap-2">
                    <span className={`material-symbols-outlined leading-none shrink-0 ${meta.iconColor}`} style={{ fontSize: "18px" }}>
                      {meta.icon}
                    </span>
                  <p className={`min-w-0 text-sm font-semibold leading-tight break-words ${meta.titleColor}`}>{meta.label}</p>
                </div>
                <p className={`text-base font-bold leading-tight ${meta.valueColor}`}>{meta.value}</p>
                <p className="mt-auto text-xs leading-snug text-gray-500 break-words">{item.feature}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs italic leading-snug text-gray-400">
          Source: XGBoost Combined+Forecast model · Feature Importance (Gain)
        </p>
    </div>
  );
}

// ── Impact Simulation ──────────────────────────────────────────────────────

function ImpactSimulation({ sim }) {
  const { t } = useLanguage();
  const severity = getPwtSeverity(sim.currentPwt);
  const severityAccent = getCardSeverityAccent(severity);
  const subtitle = Math.round(kpiSummary.dispatchTier ?? 1) === 2
    ? "Estimated outcome after incentive broadcast response"
    : "Estimated outcome after lane throughput response";

  return (
    <div className={`h-full rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${severityAccent}`}>
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t("ops.impactSimulation")}</p>
            <h2 className="mt-0.5 text-xl font-bold text-[var(--color-text-primary)]">If we act now</h2>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
          <div className="group relative">
            <button
              type="button"
              aria-label="Impact simulation estimation method"
              className={INFO_ICON_CLASS}
            >
              ⓘ
            </button>
            <div className="pointer-events-none absolute right-0 top-9 z-20 hidden min-w-[280px] max-w-[320px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 shadow-xl group-hover:block group-focus-within:block">
              <p className="font-bold">Estimation method:</p>
              <div className="mt-2 grid grid-cols-[auto_92px_1fr] gap-x-2 gap-y-1.5">
                <span>·</span>
                <span className="font-semibold text-gray-600">Without action</span>
                <span className="whitespace-nowrap">→ PWT rises to 38 min</span>
                <span>·</span>
                <span className="font-semibold text-gray-600">Action target</span>
                <span className="whitespace-nowrap">→ bring PWT to SLA (30 min)</span>
                <span>·</span>
                <span className="font-semibold text-gray-600">Improvement</span>
                <span className="whitespace-nowrap">→ (38 − 30) ÷ 38 = 21%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border-2 border-[#4ADE80] bg-[#F0FDF4] px-3 py-2.5">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-green-700">Recommended Action</p>
          <p className="text-sm font-semibold leading-snug text-gray-800">{OPS_PRIMARY_RECOMMENDATION}</p>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-gray-50 p-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Current PWT</p>
            <p className="mt-0.5 text-3xl font-black text-red-600">{sim.currentPwt} min</p>
          </div>
          <span className="text-xl font-bold text-gray-300">→</span>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">After action</p>
            <p className="mt-0.5 text-3xl font-black text-[#154aa8]">{sim.projectedPwt} min</p>
            <p className="mt-1 text-xs font-semibold text-gray-500">SLA target</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-lg bg-[#16A34A] px-3 py-3">
            <p className="text-2xl font-bold text-white">▼ {sim.pwtReductionPct}%</p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-[#BBF7D0]">PWT improvement</p>
            <p className="mt-1 text-xs text-[#DCFCE7]">vs. predicted baseline ({sim.predictedPwt} min)</p>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── ML Prediction ───────────────────────────────────────────────────────────

const ML_MOCK = {
  ALL: { predictedPWT: Math.round(kpiSummary.currentPWTPrediction), breachProb: Math.round(kpiSummary.breachRate), decision: aiAdvisory.recommendation },
};

function MLPredictionCard({ terminal }) {
  const { t } = useLanguage();
  const { predictedPWT, breachProb, decision } = ML_MOCK[terminal] ?? ML_MOCK.ALL;
  const severity = getPwtSeverity(predictedPWT);
  const SLA_THRESHOLD = PWT_THRESHOLDS.SLA_BREACH;
  const ACTION_BUFFER = PWT_THRESHOLDS.ACTION_BUFFER;
  const EARLY_WATCH = PWT_THRESHOLDS.EARLY_WATCH;
  const buffer = +(SLA_THRESHOLD - predictedPWT).toFixed(1);
  const kpi = {
    ...getSeverityTone(severity),
    desc: {
      [PWT_SEVERITY.NORMAL]: "Normal: queue pressure is within operating range.",
      [PWT_SEVERITY.WATCH]: "Watch: rising queue pressure, no dispatch intervention yet.",
      [PWT_SEVERITY.WARNING]: "Warning: action buffer exceeded, lane response recommended.",
      [PWT_SEVERITY.CRITICAL]: "Critical: SLA breach risk, overflow response recommended.",
    }[severity],
  };

  const modelInputs = ["Flight wave", "QR demand", "Taxi supply", "Lane capacity", "Weather", "Time"];
  const decisionText = `Decision: ${decision}`;
  const modelStatus = "Offline model";

  return (
    <details className="group bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
        <div>
          <Eyebrow>{t("ops.systemIntelligence")}</Eyebrow>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">Supporting model evidence</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${kpi.bg} ${kpi.text} ${kpi.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${kpi.dot}`} />
            {predictedPWT} min · {breachProb}% risk
          </span>
          <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
        </div>
      </summary>
      <div>
        <div className="h-0.5 bg-brand" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Eyebrow>Offline XGBoost model output</Eyebrow>
              <p className="text-sm text-muted mt-1 max-w-2xl">
                Two XGBoost models estimate future wait time and breach risk from operational features.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-brand text-xs font-bold border border-brand/20">
              {modelStatus}
            </span>
          </div>

          <div className="mt-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Input Features</p>
            <div className="flex flex-wrap gap-2">
              {modelInputs.map((input) => (
                <span key={input} className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
                  {input}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Model Logic</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-sm font-bold text-slate-900">XGBoost Regressor</p>
                <p className="text-xs text-muted mt-1">Predicts expected PWT in minutes</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-sm font-bold text-slate-900">XGBoost Classifier</p>
                <p className="text-xs text-muted mt-1">Predicts probability of PWT &gt; {SLA_THRESHOLD} min</p>
              </div>
            </div>
          </div>

          {/* Output header row with live KPI state pill */}
          <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Model Output — KPI Interpretation</p>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${kpi.bg} ${kpi.text} ${kpi.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${kpi.dot}`} />
              {kpi.label}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            {/* Predicted Wait Time — with SLA context */}
            <div className={`${kpi.bg} ${kpi.border} border rounded-2xl p-5`}>
              <p className={`text-xs uppercase tracking-widest font-semibold ${kpi.text}`}>Predicted Wait Time</p>
              <p className={`text-4xl font-black mt-1 ${kpi.text}`}>{predictedPWT} min</p>
              <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">SLA breach threshold</span>
                  <span className="text-xs font-bold text-slate-600">&gt; {SLA_THRESHOLD} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Action buffer</span>
                  <span className="text-xs font-bold text-slate-600">&gt; {ACTION_BUFFER} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Early watch</span>
                  <span className="text-xs font-bold text-slate-600">&gt; {EARLY_WATCH} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${kpi.text}`}>
                    {buffer >= 0
                      ? `${buffer} min headroom`
                      : `${Math.abs(buffer)} min over SLA`}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${kpi.bar}`}
                    style={{ width: `${Math.min((predictedPWT / SLA_THRESHOLD) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-1">vs {SLA_THRESHOLD} min SLA breach threshold</p>
              </div>
            </div>

            {/* Breach Risk Probability */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-muted uppercase tracking-widest font-semibold">Breach Risk Probability</p>
              <p className="text-4xl font-bold text-slate-900 mt-1">{breachProb}%</p>
              <p className="text-xs text-muted mt-3 leading-relaxed">
                Probability PWT exceeds {SLA_THRESHOLD} min in the next demand window.
              </p>
            </div>

            {/* SLA Status summary */}
            <div className={`${kpi.bg} ${kpi.border} border rounded-2xl p-5`}>
              <p className={`text-xs uppercase tracking-widest font-semibold ${kpi.text}`}>SLA Status</p>
              <p className={`text-xl font-bold mt-2 ${kpi.text}`}>{kpi.label}</p>
              <p className="text-xs text-muted mt-2 leading-relaxed">{kpi.desc}</p>
            </div>
          </div>

          <div className={`mt-4 rounded-2xl ${kpi.bg} ${kpi.border} border p-4`}>
            <p className={`text-xs uppercase tracking-widest font-bold mb-1 ${kpi.text}`}>OPS DECISION</p>
            <p className="text-sm font-semibold text-slate-900">{decisionText}</p>
            <p className="text-xs text-muted mt-1">
              If breach risk increases, OPS can trigger the control actions below.
            </p>
          </div>
        </div>
      </div>
    </details>
  );
}

// ── Supporting Data: 3-column table ───────────────────────────────────────

function DataSection({ eyebrow, title, items, tooltip }) {
  return (
    <div className="rounded-xl border border-gray-100 border-t-[3px] border-t-[#3B82F6] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        {tooltip ? (
          <span className="relative flex items-center group">
            <button
              type="button"
              aria-label={`${title} data explanation`}
              className={INFO_ICON_CLASS}
            >
              ⓘ
            </button>
            <span className="pointer-events-none absolute right-0 top-6 z-20 hidden min-w-[260px] max-w-[320px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-xl group-hover:block group-focus-within:block">
              {tooltip}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted bg-slate-100 px-2 py-0.5 rounded-full">{items.length}</span>
        )}
      </div>
      <p className="text-sm font-bold text-slate-800 mb-3">{title}</p>
      <ul className="flex flex-col divide-y divide-slate-100">
        {items.map((item, i) => (
          <li key={i} className="flex items-start justify-between gap-2 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
            <div>
              <p className="text-sm text-slate-800">{item.primary}</p>
              {item.secondary && <p className="text-xs text-muted mt-0.5">{item.secondary}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-slate-800">{item.value}</p>
              {item.caption && <p className="text-xs text-muted">{item.caption}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DemoAssignmentStatus() {
  const { activeTrip, resetMatch, reDispatchTrip } = useDemoMatching();

  if (activeTrip.status === "idle") return null;

  if (activeTrip.status === "pending_dispatch") {
    const d = buildOpsView();
    const currentPwt = d.pwt || activeTrip.opsPwt || 0;
    const rejectedCount = (activeTrip.rejectedDriverIds || []).length;
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-amber-600 leading-none mt-0.5" style={{ fontSize: "18px" }}>warning</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-slate-900">Pending Dispatch</p>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase text-amber-600">
                  pending dispatch
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                All available candidate drivers rejected this request. OPS can re-dispatch the request or activate additional supply.
              </p>
              {rejectedCount > 0 && (
                <p className="text-xs font-bold text-amber-700 mt-1">Rejected candidates: {rejectedCount}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => reDispatchTrip({ pwt: currentPwt })}
              className="rounded-lg border border-amber-500 bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors"
            >
              Re-dispatch Request
            </button>
            <button
              onClick={resetMatch}
              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-white/70 transition-colors"
            >
              Reset demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="material-symbols-outlined text-brand leading-none" style={{ fontSize: "18px" }}>hub</span>
          <p className="text-sm font-bold text-slate-900">
            Assigned: {activeTrip.passengerId} → {activeTrip.driverId} · ETA {activeTrip.etaMin} min
          </p>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase text-brand">
            {activeTrip.status}
          </span>
        </div>
        {activeTrip.matchingDecision && (
          <p className="text-xs text-slate-600 pl-6">
            <span className="font-bold">Matching Agent</span> · {activeTrip.matchingMode} · {activeTrip.matchingDecision.reasons[0]}
          </p>
        )}
      </div>
      <button
        onClick={resetMatch}
        className="rounded-lg border border-brand/20 bg-white px-2.5 py-1.5 text-xs font-bold text-brand hover:bg-white/70 transition-colors"
      >
        Reset demo
      </button>
    </div>
  );
}

function EscalationAlert() {
  const { activeEscalation, acknowledgeEscalation } = useDemoMatching();
  const [storedEscalation, setStoredEscalation] = useState(() =>
    readStorageJson("helloride_activeEscalation")
  );
  const [, setStorageSyncVersion] = useState(0);

  useEffect(() => {
    function syncFromStorage() {
      setStoredEscalation(readStorageJson("helloride_activeEscalation"));
      setStorageSyncVersion((version) => version + 1);
    }

    function handleStorage(event) {
      if (OPS_SYNC_STORAGE_KEYS.includes(event.key)) {
        syncFromStorage();
      }
    }

    window.addEventListener("storage", handleStorage);
    syncFromStorage();

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const escalationCandidate = storedEscalation ?? activeEscalation;
  const escalation = isPassengerHelpEscalation(escalationCandidate)
    ? escalationCandidate
    : null;

  if (!escalation || escalation.status !== "open") return null;

  const highSeverity = escalation.severity === "HIGH";

  function handleAcknowledge() {
    const acknowledged = { ...escalation, status: "acknowledged" };
    setStoredEscalation(acknowledged);
    window.localStorage.setItem("helloride_activeEscalation", JSON.stringify(acknowledged));
    acknowledgeEscalation();
  }

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${
      highSeverity ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
              highSeverity ? "bg-red-600 text-white" : "bg-amber-500 text-white"
            }`}>
              Safety Escalation · {escalation.severity}
            </span>
            <span className="text-xs font-bold text-slate-500">{escalation.id}</span>
          </div>
          <p className="mt-2 text-sm font-black text-slate-900">
            {escalation.protocolName} detected from {escalation.sourceRole}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Recommended: {escalation.recommendedAction}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Demo only. OPS must acknowledge before any simulated escalation. No external emergency dispatch is active.
          </p>
        </div>
        <button
          onClick={handleAcknowledge}
          className="shrink-0 rounded-xl bg-[#154aa8] px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-[#0f2f68] active:scale-95"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}

// ── Passenger–Driver Matching Simulation ───────────────────────────────────

const SECONDARY_MATCHING_PASSENGERS = [
  { id: "P002", waitMin: 12, partySize: 2, bags: 1, flight: "TG401", priorityScore: 78 },
  { id: "P003", waitMin: 7, partySize: 1, bags: 2, flight: "QR833", priorityScore: 64 },
];

const SECONDARY_MATCHING_DRIVERS = [
  { id: "D118", vehicle: "Sedan", etaMin: 6, acceptanceRate: 88, capacityFit: "2 pax / 2 bags", score: 81 },
  { id: "D124", vehicle: "Taxi", etaMin: 8, acceptanceRate: 91, capacityFit: "4 pax / 2 bags", score: 73 },
];

function MatchingSimulation({ d }) {
  const { t } = useLanguage();
  const { activeTrip } = useDemoMatching();
  const matchingMode = getMatchingMode(d.pwt);
  const isCritical = matchingMode === "CRITICAL_MATCHING";
  const isPriority = matchingMode === "PRIORITY_MATCHING";
  const mode = {
    NORMAL_MATCHING: "Normal Matching",
    PRIORITY_MATCHING: "Priority Matching",
    CRITICAL_MATCHING: "Critical Priority Matching",
  }[matchingMode];
  const modeTone = isCritical
    ? "bg-red-50 text-red-700 border-red-200"
    : isPriority
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-emerald-50 text-brand border-brand/20";
  const reason = {
    NORMAL_MATCHING: `PWT ${d.pwt} min is at or below the 20-min action buffer, using first-come matching with capacity fit.`,
    PRIORITY_MATCHING: `PWT ${d.pwt} min exceeds the 20-min action buffer, adding ETA and capacity fit to queue order.`,
    CRITICAL_MATCHING: `PWT ${d.pwt} min exceeds the 30-min SLA breach threshold, prioritizing longest wait, low ETA, high acceptance, and capacity fit.`,
  }[matchingMode];
  const bestPassenger = {
    id: activeTrip.passengerId,
    waitMin: 18,
    partySize: activeTrip.passengerCount,
    bags: activeTrip.luggageCount,
    flight: activeTrip.flightCode,
    priorityScore: 96,
  };
  const agentDecision = activeTrip.matchingDecision;
  const bestDriver = {
    id: activeTrip.driverId,
    vehicle: activeTrip.vehicleType,
    etaMin: activeTrip.etaMin,
    acceptanceRate: 94,
    capacityFit: `${activeTrip.passengerCount} pax / ${activeTrip.luggageCount} bags`,
    score: agentDecision?.score ?? 92,
  };
  const matchingPassengers = [bestPassenger, ...SECONDARY_MATCHING_PASSENGERS];

  // Use live candidateScores from agent when available; fall back to static secondary list
  const liveDriverPool = agentDecision?.candidateScores
    ? agentDecision.candidateScores.map((c) => ({
        id: c.driverId,
        vehicle: MOCK_DRIVER_POOL.find((d) => d.id === c.driverId)?.vehicle ?? "Taxi",
        etaMin: c.etaMin,
        acceptanceRate: MOCK_DRIVER_POOL.find((d) => d.id === c.driverId)?.acceptanceRate ?? 90,
        capacityFit: `${MOCK_DRIVER_POOL.find((d) => d.id === c.driverId)?.maxPassengers ?? 4} pax / ${MOCK_DRIVER_POOL.find((d) => d.id === c.driverId)?.maxLuggage ?? 4} bags`,
        score: c.score,
      }))
    : [bestDriver, ...SECONDARY_MATCHING_DRIVERS];
  const matchingDrivers = liveDriverPool;

  return (
    <section>
      <SectionHeading eyebrow={t("ops.dispatchIntelligence")} title={t("ops.matchingSimulation")} />
      <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1fr_1fr] gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className={`h-0.5 ${isCritical ? "bg-danger" : "bg-brand"}`} />
          <div className="p-5 flex flex-col gap-4">
            <div>
              <Eyebrow>Matching Mode</Eyebrow>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${modeTone}`}>
                  {mode}
                </span>
                <span className="text-xs text-muted">{d.title}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{reason}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Mode logic</p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-bold text-slate-900">Critical:</span> Longest Wait + Low ETA + High Acceptance + Capacity Fit
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-bold text-slate-900">Priority:</span> Queue Order + ETA + Capacity Fit
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-bold text-slate-900">Normal:</span> FCFS + Capacity Fit
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                {agentDecision ? "Matching Agent — Best Match" : "Best Match"}
              </p>
              <p className="mt-1 text-lg font-black text-slate-900">{bestPassenger.id} → {bestDriver.id}</p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                <div>
                  <p className="text-muted">ETA</p>
                  <p className="font-bold text-slate-900">{bestDriver.etaMin} min</p>
                </div>
                <div>
                  <p className="text-muted">Vehicle</p>
                  <p className="font-bold text-slate-900">{bestDriver.vehicle}</p>
                </div>
                <div>
                  <p className="text-muted">Score</p>
                  <p className="font-bold text-brand">{bestDriver.score}</p>
                </div>
                <div>
                  <p className="text-muted">Confidence</p>
                  <p className="font-bold text-brand">
                    {agentDecision ? `${Math.round(agentDecision.confidence * 100)}%` : "—"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                {agentDecision
                  ? agentDecision.reasons.join(" · ")
                  : activeTrip.matchingReason}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="mb-3 flex items-center justify-between">
            <Eyebrow>Passenger Queue</Eyebrow>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted">{matchingPassengers.length}</span>
          </div>
          <div className="flex flex-col divide-y divide-slate-100">
            {matchingPassengers.map((passenger) => (
              <div key={passenger.id} className="grid grid-cols-[auto_1fr_auto] gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#154aa8]/8 text-xs font-black text-[#154aa8]">
                  {passenger.id}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{passenger.waitMin} min wait · {passenger.partySize} pax / {passenger.bags} bags</p>
                  <p className="text-xs text-muted mt-0.5">Flight {passenger.flight}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Priority</p>
                  <p className={`text-sm font-black ${passenger.priorityScore >= 90 ? "text-danger" : "text-slate-700"}`}>
                    {passenger.priorityScore}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="mb-3 flex items-center justify-between">
            <Eyebrow>Driver Pool</Eyebrow>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted">{matchingDrivers.length}</span>
          </div>
          <div className="flex flex-col divide-y divide-slate-100">
            {matchingDrivers.map((driver) => (
              <div key={driver.id} className="grid grid-cols-[auto_1fr_auto] gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-xs font-black text-brand">
                  {driver.id}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{driver.vehicle} · ETA {driver.etaMin} min</p>
                  <p className="text-xs text-muted mt-0.5">{driver.acceptanceRate}% accept · fits {driver.capacityFit}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Score</p>
                  <p className="text-sm font-black text-brand">{driver.score}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ResponseActionFramework() {
  const actions = [
    {
      layer: "Action 1 — Quick Win",
      action: "Supply shortage response",
      description: "Immediate action — send incentive broadcast to call taxis from holding zone to curb. Primary action recommended by dashboard.",
      tone: "border-emerald-200 bg-emerald-50",
    },
    {
      layer: "Action 2 — Supply",
      action: "Call from Holding Area",
      description: "Pull taxis directly from holding zone to curb. Resolves supply routing bottleneck.",
      tone: "border-blue-200 bg-blue-50",
    },
    {
      layer: "Action 3 — Throughput",
      action: "Open Additional Lanes",
      description: "Add taxi pickup lanes to reduce congestion. Resolves 'taxis available but passengers still waiting' issue. Root Cause: Lane Capacity −4.1 min",
      tone: "border-amber-200 bg-amber-50",
    },
  ];

  return (
    <section>
      <SectionHeading eyebrow="Response action framework" title="Response Action Framework" />
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="grid grid-cols-[0.85fr_1fr_1.7fr] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <p>Action Layer</p>
          <p>Action</p>
          <p>Description</p>
        </div>
        <div className="divide-y divide-slate-100">
          {actions.map((item) => (
            <div key={item.layer} className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[0.85fr_1fr_1.7fr] md:items-start">
              <div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black text-slate-800 ${item.tone}`}>
                  {item.layer}
                </span>
              </div>
              <p className="text-sm font-black text-slate-900">{item.action}</p>
              <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MatchingAgentLogic() {
  const { activeTrip } = useDemoMatching();
  const agentFlow = [
    {
      step: "Observe",
      detail: "Passenger request + driver pool + OPS context",
      icon: "visibility",
    },
    {
      step: "Select Mode",
      detail: "Normal / Priority / Critical Priority based on current PWT",
      icon: "rule_settings",
    },
    {
      step: "Score Drivers",
      detail: "ETA + capacity fit + queue priority + acceptance probability + PWT urgency",
      icon: "scoreboard",
    },
    {
      step: "Assign / Re-match",
      detail: "Assign best-fit driver with reason; if rejected, exclude driver and re-score next candidate",
      icon: "hub",
    },
  ];
  const modes = [
    {
      name: "Normal Matching",
      threshold: "PWT ≤ 20 min",
      rule: "FCFS + capacity fit",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    {
      name: "Priority Matching",
      threshold: "PWT 20–30 min",
      rule: "Queue order + ETA + capacity",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      name: "Critical Priority Matching",
      threshold: "PWT > 30 min",
      rule: "Fastest ETA + capacity + queue pressure",
      tone: "border-red-200 bg-red-50 text-red-700",
    },
  ];
  const decision = activeTrip.matchingDecision;
  const firstReason = decision?.reasons?.[0];

  return (
    <section>
      <SectionHeading eyebrow="Dispatch Intelligence" title="Matching Agent Logic" />
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          How the system selects the best driver using passenger demand, driver pool, and OPS context.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          The Matching Agent observes passenger request, driver pool, and OPS context, then scores eligible drivers using ETA,
          capacity fit, queue priority, acceptance probability, and current PWT urgency. The selected driver is assigned with
          an explainable reason. If the driver rejects, the agent excludes that driver and re-runs the matching process for
          the next-best candidate.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          {agentFlow.map((item, index) => (
            <div key={item.step} className="rounded-xl border border-[#154aa8]/15 bg-[#154aa8]/[0.03] p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#154aa8]/10 text-[#154aa8]">
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: "18px" }}>{item.icon}</span>
                </span>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step {index + 1}</p>
              </div>
              <p className="mt-3 text-sm font-black text-slate-900">{item.step}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {modes.map((mode) => (
            <div key={mode.name} className={`rounded-xl border p-3 ${mode.tone}`}>
              <p className="text-sm font-black">{mode.name}</p>
              <p className="mt-1 text-xs font-bold opacity-80">{mode.threshold}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{mode.rule}</p>
            </div>
          ))}
        </div>

        {decision?.matchingMode && firstReason && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Current decision</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {decision.matchingMode} · {firstReason}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function CommandCenter({ d, laneActivated, broadcastSent, onApproveAction }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-stretch">
      <HealthCard d={d} />
      <AlertCard
        d={d}
        laneActivated={laneActivated}
        broadcastSent={broadcastSent}
        onApproveAction={onApproveAction}
      />
    </section>
  );
}

function ForecastImpactSection({ d }) {
  return (
    <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.8fr)] gap-5 items-stretch">
      <DemandChart series={d.forecastSeries} currentPwt={d.pwt} />
      <ImpactSimulation sim={d.impactSimulation} />
    </section>
  );
}

function RootCauseTelemetry({ d, flightItems, supplyItems }) {
  return (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <DeficitBreakdown breakdown={d.deficitBreakdown} />
      <DataSection
        eyebrow="Flight wave"
        title="Arrivals driving demand"
        items={flightItems}
        tooltip="Passenger counts estimated from flights_15m_bkk.csv aggregate data, adjusted by aircraft type. ±20% margin."
      />
      <DataSection
        eyebrow="Supply telemetry"
        title="Driver response pulse"
        items={supplyItems}
        tooltip="Taxis at curb: observed from training data (avg last 4 rows). Predicted Taxis: XGBoost Supply Forecast model, T+45 min ahead. Dispatch gap = max(0, demand − supply + buffer 5)."
      />
    </section>
  );
}

// ── Live Monitoring View ───────────────────────────────────────────────────

function LiveMonitoring({ d, terminal, laneActivated, broadcastSent, onApproveAction }) {
  const severity = getPwtSeverity(d.pwt);
  const severityTone = getSeverityTone(severity);
  const isCritical = severity === PWT_SEVERITY.CRITICAL;
  const flightItems = d.flights.map((f) => ({
    primary: `${f.flight ?? f.code} · ${f.airline ?? f.origin}`,
    secondary: `${f.status} · ${f.origin} · ETA ${f.eta}`,
    value: String(f.pax ?? f.demand),
    caption: "est. pax",
  }));
  const supplyItems = [
    {
      primary: "Taxis at curb",
      secondary: null,
      value: String(Math.round(kpiSummary.taxisAtCurb)),
      caption: null,
    },
    {
      primary: "Predicted Taxis",
      secondary: null,
      value: String(Math.round(kpiSummary.predSupply)),
      caption: "taxis",
    },
    {
      primary: "Dispatch gap",
      secondary: `Taxis needed ${Math.round(kpiSummary.predDemand)} · buffer 5`,
      value: String(Math.round(kpiSummary.dispatchGap)),
      caption: "gap",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-end gap-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isCritical ? "bg-red-50 text-red-700 ring-1 ring-red-200" : `${severityTone.bg} ${severityTone.text} ring-1 ring-gray-100`}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isCritical ? "bg-red-600" : severityTone.dot}`} />
          {isCritical ? "Critical · SLA breached" : severityTone.label}
        </span>
      </div>

      <AISituationBrief d={d} />
      <DemoAssignmentStatus />

      <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <HealthCard d={d} />
        <AlertCard
          d={d}
          laneActivated={laneActivated}
          broadcastSent={broadcastSent}
          onApproveAction={onApproveAction}
        />
        <DemandChart series={d.forecastSeries} currentPwt={d.pwt} />
        <ImpactSimulation sim={d.impactSimulation} />
      </div>

      <RootCauseTelemetry
        d={d}
        flightItems={flightItems}
        supplyItems={supplyItems}
      />
    </div>
  );
}

// ── AI Advisory Workspace ──────────────────────────────────────────────────

function makeMessage(role, content) {
  return {
    role,
    content,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

const ADVISORY_COPY = {
  en: {
    defaultMessage:
      "I’m ready to help with PWT, queue pressure, SLA risk, dispatch actions, and expected impact.",
    contextEyebrow: "Advisory context",
    contextTitle: "Current terminal context",
    chatTitle: "OPS AI Advisory",
    terminal: "TERMINAL",
    pwt: "PWT",
    breachRate: "Breach Rate",
    confirmedQr: "Confirmed QR",
    taxis: "Taxis",
    flights: "Flights",
    subtitle: "Ask operational questions about PWT, queue pressure, dispatch actions, SLA risk, and expected impact.",
    suggested: "Suggested OPS questions",
    placeholder: "Ask about queue situation...",
    send: "Send",
    generating: "Generating advisory...",
    escalationPrefix: "Active demo escalation",
    prompts: [
      { id: "why-critical", label: "Why is PWT critical?" },
      { id: "sla-breach", label: "Explain the SLA breach" },
      { id: "why-lane-response", label: "Why lane response?" },
      { id: "drivers", label: "Are taxis sufficient?" },
      { id: "next-action", label: "What should OPS do next?" },
      { id: "simulate-impact", label: "Simulate impact" },
    ],
    responses: {
      "why-pwt": `PWT is critical because the current wait time is 84 min, above the 30-min SLA threshold.\n\nRoot cause:\nQR +8.2 min | Flights +6.1 min | Lane capacity −3.4 min.\n\nRecommended action:\n${OPS_PRIMARY_RECOMMENDATION}`,
      "next-action": `The current queue state is critical and needs OPS approval.\n\nRoot cause:\nPWT is above the 30-min SLA breach threshold, with dispatch gap = 12. Supply shortage is active and Tier 2 dispatch is required.\n\nRecommended action:\n${OPS_PRIMARY_RECOMMENDATION}`,
      drivers: `Taxis are insufficient for the current demand window.\n\nRoot cause:\nDispatch gap is 12, with predicted supply below confirmed demand.\n\nRecommended action:\n${OPS_PRIMARY_RECOMMENDATION}`,
      "arrival-risk": `The main risk is an overlapping arrival wave.\n\nRoot cause:\nMultiple inbound flights are feeding baggage claim demand at the same time.\n\nRecommended action:\nKeep OPS in priority dispatch mode and monitor PWT every 5 minutes.\n\nExpected impact:\nThe team can intervene before the queue expands further.`,
    },
    protocolResponse(protocol) {
      return `Detected protocol: ${protocol.name}\nSeverity: ${protocol.severity}\n\nRecommended action:\n${protocol.recommendedAction}\n\nOPS approval required:\n${protocol.opsAction}\n\nDemo only; no external emergency dispatch or webhook is active.`;
    },
    fallback(d) {
      return `Current PWT is ${d.pwt} min with ${d.projectedDeficit}% projected deficit.\n\nRoot cause:\nArrival demand is exceeding available curb supply.\n\nRecommended action:\n${d.aiAdvice}\n\nExpected impact:\nOPS can reduce queue pressure by approving the recommended action.`;
    },
  },
  th: {
    defaultMessage:
      "พร้อมช่วยวิเคราะห์แรงกดดันคิว ความเสี่ยงจากเที่ยวบินขาเข้า จำนวนคนขับ และคำแนะนำถัดไปสำหรับ OPS",
    contextEyebrow: "บริบทคำแนะนำ",
    contextTitle: "บริบทสถานการณ์ปัจจุบัน",
    chatTitle: "AI Advisory",
    terminal: "สถานี",
    pwt: "เวลารอ",
    breachRate: "อัตรา Breach",
    confirmedQr: "QR ยืนยัน",
    taxis: "แท็กซี่",
    flights: "เที่ยวบิน",
    subtitle: "ถามเกี่ยวกับการขาดดุล คลื่นเที่ยวบิน หรือ action ถัดไป",
    suggested: "คำถามแนะนำสำหรับ OPS",
    placeholder: "ถาม AI Advisory...",
    send: "ส่ง",
    generating: "กำลังสร้างคำแนะนำ...",
    escalationPrefix: "เหตุยกระดับจำลอง",
    prompts: [
      { id: "why-pwt", label: "ทำไม PWT สูง?" },
      { id: "next-action", label: "ต้องทำอะไรตอนนี้?" },
      { id: "drivers", label: "คนขับเพียงพอไหม?" },
      { id: "arrival-risk", label: "ความเสี่ยงช่วงนี้คืออะไร?" },
    ],
    responses: {
      "why-pwt": `PWT อยู่ในระดับวิกฤตเพราะเวลารอปัจจุบัน 34 นาที สูงกว่า SLA 30 นาที\n\nสาเหตุหลัก:\nQR +8.2 min | Flights +6.1 min | Lane capacity −3.4 min\n\nคำแนะนำ:\nตรวจพบคอขวดที่เลน ให้ดึงรถจาก Holding Zone เข้า Curb และพิจารณาเปิดเลนเพิ่ม`,
      "next-action": `สถานการณ์คิวตอนนี้อยู่ในระดับวิกฤตและต้องให้ OPS อนุมัติ\n\nสาเหตุหลัก:\nPWT เกินเกณฑ์ SLA 30 นาที แต่ dispatch gap = 0 แปลว่า supply เพียงพอ ปัญหาอยู่ที่ throughput ของเลนและการไหลจาก holding zone\n\nคำแนะนำ:\nดึงรถจาก Holding Zone เข้า Curb และพิจารณาเปิดเลนเพิ่ม`,
      drivers: `จำนวนแท็กซี่เพียงพอสำหรับดีมานด์ตอนนี้\n\nสาเหตุหลัก:\ndispatch gap = 0 แปลว่าไม่ใช่ปัญหาขาด supply แต่เป็นคอขวดที่ lane capacity และ holding-zone flow\n\nคำแนะนำ:\nแก้ throughput ที่ curb และพิจารณาเปิดเลนเพิ่ม`,
      "arrival-risk": `ความเสี่ยงหลักคือเที่ยวบินขาเข้าหลายเที่ยวทับซ้อนกัน\n\nสาเหตุหลัก:\nผู้โดยสารจากหลายเที่ยวบินเข้าสู่ baggage claim ในเวลาใกล้กัน\n\nคำแนะนำ:\nคงโหมด priority dispatch และติดตาม PWT ทุก 5 นาที\n\nผลที่คาดว่าจะเกิดขึ้น:\nOPS เข้าจัดการได้ก่อนที่คิวจะขยายมากขึ้น`,
    },
    protocolResponse(protocol) {
      return `ตรวจพบโปรโตคอล: ${protocol.name}\nระดับ: ${protocol.severity}\n\nคำแนะนำ:\n${protocol.recommendedAction}\n\nต้องให้ OPS อนุมัติ:\n${protocol.opsAction}\n\nเป็นเดโมเท่านั้น ไม่มีการส่งเหตุฉุกเฉินหรือ webhook ภายนอก`;
    },
    fallback(d) {
      return `PWT ปัจจุบันอยู่ที่ ${d.pwt} นาที และมี deficit คาดการณ์ ${d.projectedDeficit}%\n\nสาเหตุหลัก:\nดีมานด์ขาเข้ามากกว่าจำนวนรถที่พร้อมรับริมทาง\n\nคำแนะนำ:\n${d.aiAdvice}\n\nผลที่คาดว่าจะเกิดขึ้น:\nOPS สามารถลดแรงกดดันคิวได้เมื่ออนุมัติการดำเนินการที่แนะนำ`;
    },
  },
};

function getDashboardAdvisoryResponse(d, question, promptId) {
  const normalized = `${promptId || ""} ${question || ""}`.toLowerCase();
  const currentPWT = Math.round(kpiSummary.currentPWT);
  const predictedPWT = Math.round(kpiSummary.currentPWTPrediction);
  const slaThreshold = Math.round(meta.breachThreshold);
  const waitingPassengers = Math.round(kpiSummary.confirmedQR);
  const holdingTaxis = Math.round(kpiSummary.taxisAtCurb);
  const predictedTaxis = Math.round(kpiSummary.predSupply);
  const taxisNeeded = Math.round(kpiSummary.predDemand);
  const afterActionPWT = Math.round(d.impactSimulation.projectedPwt);
  const recommendedAction = OPS_PRIMARY_RECOMMENDATION;
  const supplyLine = predictedTaxis >= taxisNeeded
    ? "Taxi supply is numerically sufficient. Dispatch gap is 0, so this is Tier 1: no extra supply dispatch is required; the bottleneck is lane throughput and holding-zone flow."
    : `Taxi supply is below the predicted demand window. Dispatch gap is ${Math.round(kpiSummary.dispatchGap)}, so Tier ${Math.round(kpiSummary.dispatchTier)} dispatch is required.`;

  if (normalized.includes("sla")) {
    return `The SLA is breached because current PWT is ${currentPWT} min, above the ${slaThreshold}-min SLA threshold. Predicted PWT rises to ${predictedPWT} min without action.\n\nWhy it matters:\n${holdingTaxis} taxis are currently at curb against a demand of ${waitingPassengers} confirmed passengers. Supply is sufficient, but lane capacity is constraining throughput.\n\nRecommended action:\n${recommendedAction} AI recommends only; OPS approval is required before action.`;
  }

  if (normalized.includes("incentive") || normalized.includes("lane") || normalized.includes("action")) {
    return `The system recommends an incentive broadcast because PWT is ${currentPWT} min and predicted to reach ${predictedPWT} min in the next window.\n\nRoot cause:\n${supplyLine}\n\nOPS decision:\n${recommendedAction} AI does not auto-activate operational changes; OPS must approve.`;
  }

  if (normalized.includes("taxi") || normalized.includes("driver")) {
    return `Predicted taxis: ${predictedTaxis}. Taxis needed: ${taxisNeeded}. Taxis at curb: ${holdingTaxis}.\n\nAssessment:\n${supplyLine}\n\nRecommended action:\n${recommendedAction}`;
  }

  if (normalized.includes("impact") || normalized.includes("simulate")) {
    return `If OPS acts now, the target is to bring PWT from the predicted baseline of ${predictedPWT} min down to the SLA boundary of ${afterActionPWT} min.\n\nExpected impact:\nCurrent PWT is ${currentPWT} min. The simulated improvement is ${d.impactSimulation.pwtReductionPct}% versus predicted baseline.\n\nAction required:\nOPS must approve the incentive broadcast before the demo action is applied.`;
  }

  if (normalized.includes("arrival") || normalized.includes("risk") || normalized.includes("critical") || normalized.includes("pwt")) {
    return `PWT is critical because current wait time is ${currentPWT} min, above the ${slaThreshold}-min SLA threshold. Without action, predicted PWT rises to ${predictedPWT} min.\n\nRoot cause:\nQR +8.2 min | Flights +6.1 min | Lane capacity −3.4 min. ${supplyLine}\n\nRecommended action:\n${recommendedAction} OPS approval is required before action.`;
  }

  return `Current PWT is ${currentPWT} min. ${holdingTaxis} taxis are currently at curb against a demand of ${waitingPassengers} confirmed passengers. Predicted PWT is ${predictedPWT} min against a ${slaThreshold}-min SLA threshold.\n\nRecommended action:\n${recommendedAction} AI recommends only; OPS must approve before action.\n\nExpected impact:\nPWT target improves toward ${afterActionPWT} min.`;
}

const OPS_AI_SUGGESTIONS = [
  { id: "why-critical", label: "Why is PWT critical?" },
  { id: "why-lane-response", label: "Why lane response?" },
  { id: "drivers", label: "Are taxis sufficient?" },
  { id: "next-action", label: "What should OPS do next?" },
  { id: "sla-breach", label: "Explain SLA breach" },
];

function OPSAIChatWidget({ d }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, isOpen]);

  function send(question, promptId = null) {
    const text = String(question || "").trim();
    if (!text) return;
    setMessages((prev) => [...prev, makeMessage("user", text)]);
    setInput("");
    setLoading(true);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        makeMessage("assistant", getDashboardAdvisoryResponse(d, text, promptId)),
      ]);
      setLoading(false);
    }, 350);
  }

  const visibleMessages = messages.length
    ? messages
    : [{
        role: "assistant",
        content: "Hi, I’m your OPS AI Advisory. I can explain the current PWT, SLA risk, supply pressure, and recommended dispatch action.",
        timestamp: "",
      }];

  return (
    <>
      {isOpen && (
        <section className="fixed bottom-24 right-6 z-[80] flex h-[560px] max-h-[calc(100vh-8rem)] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex-none border-b border-slate-100 bg-[#154aa8] px-4 py-3 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  <h2 className="text-sm font-black">OPS AI Advisory</h2>
                </div>
                <p className="mt-1 text-xs leading-snug text-blue-100">
                  Ask about PWT, SLA risk, dispatch actions, and queue pressure
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close OPS AI Advisory"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg leading-none text-white transition-colors hover:bg-white/20"
              >
                ×
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
            <div className="flex flex-col gap-3">
              {visibleMessages.map((message, index) => (
                <div key={`${message.timestamp}-${index}`} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#154aa8]/10 text-[#154aa8]">
                      <span className="material-symbols-outlined leading-none" style={{ fontSize: "16px" }}>auto_awesome</span>
                    </div>
                  )}
                  <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "rounded-br-md bg-[#154aa8] text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                  }`}>
                    <p className="whitespace-pre-line">{message.content}</p>
                    {message.timestamp && (
                      <p className={`mt-1 text-[10px] ${message.role === "user" ? "text-white/65" : "text-slate-400"}`}>{message.timestamp}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#154aa8]/10 text-[#154aa8]">
                    <span className="material-symbols-outlined leading-none" style={{ fontSize: "16px" }}>auto_awesome</span>
                  </div>
                  <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-500 shadow-sm">
                    Reviewing dashboard context...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="flex-none border-t border-slate-100 bg-white px-4 py-3">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {OPS_AI_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => send(suggestion.label, suggestion.id)}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-[#154aa8]/30 hover:bg-[#154aa8]/5 hover:text-[#154aa8]"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") send(input);
                }}
                placeholder="Ask about the current operation..."
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#154aa8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#154aa8]/10"
              />
              <button
                type="button"
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="rounded-xl bg-[#154aa8] px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0f2f68] disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-label="Open OPS AI Advisory"
        title="OPS AI"
        className="fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-[#154aa8] text-white shadow-[0_14px_30px_rgba(21,74,168,0.35)] transition-all hover:bg-[#0f2f68] hover:shadow-[0_18px_36px_rgba(21,74,168,0.45)] active:scale-95"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
          {isOpen ? "close" : "chat"}
        </span>
      </button>
    </>
  );
}

function HelpRequestsWorkspace() {
  const { activeEscalation, acknowledgeEscalation } = useDemoMatching();
  const [activeTab, setActiveTab] = useState("help");
  const [storedEscalation, setStoredEscalation] = useState(() =>
    readStorageJson("helloride_activeEscalation")
  );
  const [passengerMessages, setPassengerMessages] = useState(readPassengerMessages);

  useEffect(() => {
    // Auto-clear escalations older than 60 min on mount
    const raw = window.localStorage.getItem("helloride_activeEscalation");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.createdAt) {
          const ageMs = Date.now() - new Date(parsed.createdAt).getTime();
          if (ageMs > 60 * 60 * 1000) {
            window.localStorage.removeItem("helloride_activeEscalation");
            setStoredEscalation(null);
            acknowledgeEscalation();
            return;
          }
        }
      } catch {
        // ignore
      }
    }

    function syncFromStorage() {
      setStoredEscalation(readStorageJson("helloride_activeEscalation"));
      setPassengerMessages(readPassengerMessages());
    }
    function handleStorage(e) {
      if (OPS_SYNC_STORAGE_KEYS.includes(e.key)) syncFromStorage();
    }
    function handlePassengerMessages(e) {
      setPassengerMessages(Array.isArray(e.detail) ? e.detail : readPassengerMessages());
    }
    function handleEscalationEvent(e) {
      setStoredEscalation(e.detail || readStorageJson("helloride_activeEscalation"));
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener("helloride:passengerMessages", handlePassengerMessages);
    window.addEventListener("helloride:activeEscalation", handleEscalationEvent);
    syncFromStorage();
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("helloride:passengerMessages", handlePassengerMessages);
      window.removeEventListener("helloride:activeEscalation", handleEscalationEvent);
    };
  }, []);

  const escalation = storedEscalation ?? activeEscalation;
  const isActiveHelp = getActiveEscalationCount(escalation) > 0;
  const highSeverity = escalation?.severity === "HIGH";
  const createdAt = escalation?.createdAt
    ? new Date(escalation.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";

  function handleAcknowledge() {
    const acknowledged = { ...escalation, status: "acknowledged" };
    window.localStorage.setItem("helloride_activeEscalation", JSON.stringify(acknowledged));
    setStoredEscalation(acknowledged);
    acknowledgeEscalation();
    window.dispatchEvent(new CustomEvent("helloride:activeEscalation", { detail: acknowledged }));
  }

  function handleResetHelpDemoData() {
    window.localStorage.removeItem("helloride_activeEscalation");
    window.localStorage.removeItem("helloride_passengerMessages");
    setStoredEscalation(null);
    setPassengerMessages([]);
    acknowledgeEscalation();
    window.dispatchEvent(new CustomEvent("helloride:activeEscalation", { detail: null }));
    window.dispatchEvent(new CustomEvent("helloride:passengerMessages", { detail: [] }));
  }

  const emptyState = (
    <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl bg-slate-50 py-12 text-center">
      <span className="material-symbols-outlined text-4xl text-slate-300">support_agent</span>
      <p className="text-sm font-semibold text-slate-500">No active help requests</p>
      <p className="text-xs text-slate-400">Urgent passenger help requests will appear here when triggered from the Passenger Portal.</p>
    </div>
  );

  const messageEmptyState = (
    <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl bg-slate-50 py-12 text-center">
      <span className="material-symbols-outlined text-4xl text-slate-300">chat_bubble</span>
      <p className="text-sm font-semibold text-slate-500">No messages yet</p>
      <p className="text-xs text-slate-400">Passenger support chat messages will appear here in chronological order</p>
    </div>
  );

  const sortedMessages = [...passengerMessages].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  return (
    <div className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className={`h-0.5 ${isActiveHelp && highSeverity ? "bg-red-500" : isActiveHelp ? "bg-amber-500" : "bg-slate-200"}`} />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Help Requests</h2>
              <p className="mt-1 text-sm text-muted">Passenger support requests from the mobile portal</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex rounded-xl bg-slate-100 p-1">
                {[
                  ["help", "Help"],
                  ["feedback", "Feedback"],
                ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    activeTab === id ? "bg-white text-[#154aa8] shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleResetHelpDemoData}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              >
                Reset Help Demo Data
              </button>
            </div>
          </div>

          {activeTab === "help" && (!isActiveHelp ? emptyState : (
            <div className={`mt-4 rounded-2xl border p-4 ${highSeverity ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                      highSeverity ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                    }`}>
                      {escalation.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{escalation.id}</span>
                    {createdAt && (
                      <span className="text-xs text-slate-400">· {createdAt}</span>
                    )}
                  </div>

                  <p className="mt-3 text-sm font-black text-slate-900">{escalation.protocolName}</p>

                  {escalation.message && (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Passenger message</p>
                      <p className="mt-1 text-sm text-slate-700">"{escalation.message}"</p>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white/70 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Source</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-700">{escalation.sourceRole}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Protocol</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-700">{escalation.protocolId}</p>
                    </div>
                  </div>

                  <div className="mt-2 rounded-xl bg-white/70 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recommended action</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{escalation.recommendedAction}</p>
                  </div>

                  <p className="mt-3 text-[11px] text-slate-400">
                    Demo only. OPS must acknowledge before any simulated escalation. No external emergency dispatch is active.
                  </p>
                </div>

                <button
                  onClick={handleAcknowledge}
                  className={`shrink-0 self-start rounded-xl px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors active:scale-95 ${
                    highSeverity ? "bg-red-600 hover:bg-red-700" : "bg-[#154aa8] hover:bg-[#0f2f68]"
                  }`}
                >
                  Acknowledge
                </button>
              </div>
            </div>
          ))}

          {activeTab === "feedback" && (
            sortedMessages.length === 0 ? messageEmptyState : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                <div className="divide-y divide-slate-100">
                  {sortedMessages.map((message) => (
                    <div key={message.id} className="grid grid-cols-[88px_1fr_190px] gap-3 px-4 py-3 text-sm">
                      <p className="text-xs font-bold text-slate-400">
                        {new Date(message.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="min-w-0 text-slate-800">{message.text}</p>
                      <p className="min-w-0 truncate text-right text-xs font-semibold text-slate-500">{message.quickOption}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}

function AIAdvisoryWorkspace({ d, initialQuestion }) {
  const { language } = useLanguage();
  const copy = ADVISORY_COPY[language] ?? ADVISORY_COPY.en;
  const { createEscalation } = useDemoMatching();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    if (!initialQuestion?.question) return;
    handleSend(initialQuestion.question, initialQuestion.promptId ?? null);
  }, [initialQuestion?.id]);

  function getResponse(question, promptId) {
    const protocol = matchProtocol(question);
    if (protocol) {
      createEscalation({ protocol, message: question, sourceRole: "AI Advisory" });
      return copy.protocolResponse(protocol);
    }

    if (promptId && copy.responses[promptId]) {
      return copy.responses[promptId];
    }

    if (language === "en") {
      return getDashboardAdvisoryResponse(d, question, promptId);
    }

    if (language === "en" && ADVISORY_RESPONSES[question]) {
      return ADVISORY_RESPONSES[question];
    }

    return copy.fallback(d);
  }

  function handleSend(question, promptId = null) {
    if (!question.trim()) return;
    const q = question.trim();
    setMessages((prev) => [...prev, makeMessage("user", q)]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, makeMessage("assistant", getResponse(q, promptId))]);
      setLoading(false);
    }, 800);
  }

  const visibleMessages = messages.length
    ? messages
    : [{ role: "assistant", content: copy.defaultMessage, timestamp: "" }];

  return (
    <div className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-0.5 bg-[#154aa8]" />
        <div className="p-5">
          <h2 className="text-xl font-bold text-slate-900">{copy.contextTitle}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              [copy.terminal, d.title],
              [copy.pwt, `${d.pwt} min`],
              [copy.breachRate, `${Math.round(kpiSummary.breachRate)}%`],
              [copy.confirmedQr, Math.round(kpiSummary.confirmedQR).toLocaleString()],
              [copy.taxis, String(Math.round(kpiSummary.taxisAtCurb))],
              [copy.flights, String(Math.round(kpiSummary.arrivingFlights))],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{label}</p>
                <p className="text-base font-black text-slate-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-0.5 bg-[#154aa8]" />
        <div className="flex flex-1 min-h-0 flex-col p-5">
          <div className="flex-none">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{copy.chatTitle}</h2>
            </div>
            <p className="mt-1 text-sm text-muted">{copy.subtitle}</p>
          </div>

          <div className="mt-4 flex min-h-[300px] flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
            {visibleMessages.map((message, index) => (
              <div key={`${message.timestamp}-${index}`} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#154aa8]/10 text-[#154aa8]">
                    <span className="material-symbols-outlined leading-none" style={{ fontSize: "16px" }}>auto_awesome</span>
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === "user"
                    ? "bg-[#154aa8] text-white rounded-br-md"
                    : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-md"
                }`}>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{message.content}</p>
                  {message.timestamp && (
                    <p className={`mt-1 text-[10px] ${message.role === "user" ? "text-white/65" : "text-slate-400"}`}>{message.timestamp}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#154aa8]/10 text-[#154aa8]">
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: "16px" }}>auto_awesome</span>
                </div>
                <div className="rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-4 py-3 text-sm text-muted shadow-sm animate-pulse">
                  {copy.generating}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="mt-4 flex-none">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">{copy.suggested}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
            {copy.prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => handleSend(prompt.label, prompt.id)}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-[#154aa8]/30 hover:bg-[#154aa8]/5 hover:text-[#154aa8]"
              >
                {prompt.label}
              </button>
            ))}
            </div>
          </div>

          <div className="mt-3 flex flex-none gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
              placeholder={copy.placeholder}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#154aa8] focus:bg-white focus:ring-2 focus:ring-[#154aa8]/10 transition-all"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
              className="rounded-xl bg-[#154aa8] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0f2f68] disabled:opacity-40"
            >
              {copy.send}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function EdgeCaseProtocolsSection() {
  const severityClass = {
    HIGH: "border-red-200 bg-red-50 text-red-700",
    MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
    LOW: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <section>
      <SectionHeading eyebrow="Policy Intelligence" title="Policy & Edge Case Protocols" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {EDGE_CASE_PROTOCOLS.map((protocol) => (
          <div key={protocol.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{protocol.group}</p>
                <h3 className="mt-1 text-base font-black text-slate-900">{protocol.name}</h3>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${severityClass[protocol.severity] ?? severityClass.LOW}`}>
                {protocol.severity}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {protocol.triggerKeywords.slice(0, 5).map((keyword) => (
                <span key={keyword} className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                  {keyword}
                </span>
              ))}
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recommended action</p>
                <p className="mt-1 text-slate-700">{protocol.recommendedAction}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">OPS action</p>
                <p className="mt-1 font-bold text-slate-900">{protocol.opsAction}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Required additions</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{protocol.requiredAdditions}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Demo documentation only. These protocols do not connect to police, AOT, EMS, webhooks, or external services.
      </p>
    </section>
  );
}

function SystemIntelligenceWorkspace({ d, terminal }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <Eyebrow>{t("ops.systemIntelligence")}</Eyebrow>
        <h2 className="text-xl font-bold text-slate-900 mt-0.5">Technical explainability and demo evidence</h2>
        <p className="text-sm text-muted mt-1 max-w-3xl">
          This workspace explains why Hello Ride recommends actions: passenger-driver matching evidence, dispatch mode logic, and model interpretation.
        </p>
      </div>
      <ResponseActionFramework />
      <MatchingAgentLogic />
      <EdgeCaseProtocolsSection />
    </div>
  );
}

// ── Demo OPS Login ─────────────────────────────────────────────────────────

function OPSLoginScreen({ onLogin }) {
  const [username, setUsername] = useState(OPS_DEMO_USERNAME);
  const [password, setPassword] = useState(OPS_DEMO_PASSWORD);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (username === OPS_DEMO_USERNAME && password === OPS_DEMO_PASSWORD) {
      window.localStorage.setItem(OPS_AUTH_KEY, "true");
      onLogin();
      return;
    }

    setError("Use the demo OPS credentials to continue.");
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f5f8fb] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-2xl bg-[#154aa8] flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-xl">admin_panel_settings</span>
            </div>
            <p className="text-2xl font-black text-[#1a2b5e] font-headline tracking-tight">Hello Ride</p>
          </div>
          <h1 className="text-2xl font-black text-[#1a2b5e] font-headline">OPS Control Sign In</h1>
          <p className="text-sm text-muted mt-1">Airport operations access for Hello Ride console</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl shadow-[0_18px_50px_rgba(21,74,168,0.12)] overflow-hidden"
        >
          <div className="h-1 bg-[#154aa8]" />
          <div className="p-6 flex flex-col gap-4">
            <div className="bg-[#154aa8]/5 border border-[#154aa8]/10 rounded-2xl p-4">
              <p className="text-[10px] font-extrabold text-[#154aa8] uppercase tracking-widest">OPS Console</p>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Sign in to monitor airport queues, arrival waves, and dispatch controls.
              </p>
            </div>

            <div>
              <label htmlFor="ops-username" className="block text-xs text-muted uppercase tracking-widest font-bold mb-2">
                Username
              </label>
              <input
                id="ops-username"
                type="text"
                value={username}
                onChange={(event) => { setUsername(event.target.value); setError(""); }}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00b14f] focus:ring-2 focus:ring-[#00b14f]/15 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
              />
            </div>

            <div>
              <label htmlFor="ops-password" className="block text-xs text-muted uppercase tracking-widest font-bold mb-2">
                Password
              </label>
              <input
                id="ops-password"
                type="password"
                value={password}
                onChange={(event) => { setPassword(event.target.value); setError(""); }}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00b14f] focus:ring-2 focus:ring-[#00b14f]/15 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
              />
            </div>

            {error && <p className="text-xs font-semibold text-danger">{error}</p>}

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#22c55e] to-[#00a344] text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(0,163,68,0.28)] hover:shadow-[0_12px_28px_rgba(0,163,68,0.36)] active:scale-95 transition-all"
            >
              Login
            </button>

            <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-200 px-1.5 py-0.5 rounded">Demo</span>
              <span className="text-xs text-slate-500">ops_demo / 1234</span>
            </div>

            <p className="text-[11px] text-center text-slate-400">
              Demo access only — not production authentication.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main OPS Dashboard ─────────────────────────────────────────────────────

export default function OPSDashboard() {
  const { t } = useLanguage();
  const { assignMatch, setOpsAction, activeEscalation } = useDemoMatching();
  const [opsLoggedIn, setOpsLoggedIn] = useState(getStoredOpsAuth);
  const terminal = "ALL";
  const [workspace, setWorkspace] = useState("monitoring");
  const [laneActivated, setLaneActivated] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  function handleSignOut() {
    window.localStorage.removeItem(OPS_AUTH_KEY);
    setOpsLoggedIn(false);
  }

  if (!opsLoggedIn) {
    return <OPSLoginScreen onLogin={() => setOpsLoggedIn(true)} />;
  }

  const d = buildOpsView();

  function handleApproveOpsAction(severity) {
    if (severity === PWT_SEVERITY.CRITICAL) {
      setLaneActivated(true);
      setBroadcastSent(true);
      setOpsAction(OPS_ACTION.OVERFLOW_ACTIVATED);
      assignMatch(undefined, { pwt: d.pwt });
      return;
    }

    if (severity === PWT_SEVERITY.WARNING) {
      setBroadcastSent(true);
      setOpsAction(OPS_ACTION.INCENTIVE_SENT);
    }
  }

  const workspaceOptions = [
    { id: "monitoring", label: t("ops.liveMonitoring") },
  ];
  const helpRequestCount = getActiveEscalationCount(activeEscalation);

  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#f8f9fb]">
      {/* Sidebar */}
      <aside className="w-44 shrink-0 bg-white border-r border-slate-200 flex flex-col py-4 overflow-y-auto">
        <nav className="flex-1 px-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Workspace</p>
          {workspaceOptions.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setWorkspace(id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold mb-1 transition-all ${
                workspace === id ? "bg-[#154aa8]/10 text-[#154aa8]" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setWorkspace("help")}
            className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-all ${
              helpRequestCount > 0
                ? "bg-red-50 text-red-700"
                : workspace === "help"
                ? "bg-[#154aa8]/10 text-[#154aa8]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>Help Requests</span>
            {helpRequestCount > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">
                {helpRequestCount}
              </span>
            )}
          </button>
        </nav>
        <div className="border-t border-slate-100 px-2 pt-4">
          <button
            onClick={() => setWorkspace("intelligence")}
            className={`mb-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition-all ${
              workspace === "intelligence" ? "bg-[#154aa8]/10 text-[#154aa8]" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Documentation
          </button>
          <button
            onClick={handleSignOut}
            className="mb-1 flex w-full items-center gap-1.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
          >
            <span className="material-symbols-outlined leading-none" style={{ fontSize: "16px" }}>logout</span>
            {t("ops.signOut")}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#f8f9fb]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-headline font-black text-2xl text-[#1a2b5e]">{t("ops.console")}</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-brand">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  SLA Breach Active
                </span>
              </div>
              <p className="text-xs text-muted mt-1">OPS Snapshot · 10 May 2026 · 07:30 · Suvarnabhumi</p>
            </div>
          </div>
          {workspace === "monitoring" && (
            <LiveMonitoring
              d={d}
              terminal={terminal}
              laneActivated={laneActivated}
              broadcastSent={broadcastSent}
              onApproveAction={handleApproveOpsAction}
            />
          )}
          {workspace === "help" && <HelpRequestsWorkspace />}
          {workspace === "intelligence" && <SystemIntelligenceWorkspace d={d} terminal={terminal} />}
        </div>
      </main>
      {workspace === "monitoring" && <OPSAIChatWidget d={d} />}
    </div>
  );
}
