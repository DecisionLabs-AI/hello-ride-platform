import { useEffect, useRef, useState } from "react";
import { getOpsData, ADVISORY_RESPONSES } from "../data/mockOps.js";
import { kpiSummary, demandChartData, recentAlerts, aiAdvisory } from "../data/index.js";
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
} from "../lib/businessLogic.js";
import { useLanguage } from "../context/useLanguage.js";
import { matchProtocol } from "../lib/protocolMatcher.js";

const OPS_SYNC_STORAGE_KEYS = [
  "helloride_activeEscalation",
  "helloride_opsAction",
  "helloride_activeTrip",
];

function readStorageJson(key) {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getCurrentThaiMinuteTime() {
  return new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function useCurrentThaiMinuteTime() {
  const [currentTime, setCurrentTime] = useState(getCurrentThaiMinuteTime);

  useEffect(() => {
    setCurrentTime(getCurrentThaiMinuteTime());
    const intervalId = window.setInterval(() => {
      setCurrentTime(getCurrentThaiMinuteTime());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  return currentTime;
}

function buildOpsView() {
  const base = getOpsData("ALL");
  const pwt = Math.round(kpiSummary.currentPWT);
  const holdingTaxis = Math.round(kpiSummary.taxisAtCurb);
  const waitingPassengers = Math.round(kpiSummary.confirmedQR);
  const laneLoad = Math.min(99, Math.round(kpiSummary.breachRate));
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
    holdingTaxis,
    waitingPassengers,
    laneLoad,
    projectedDeficit,
    aiAdvice: aiAdvisory.recommendation,
    forecastSeries,
    demandSignals,
    impactSimulation: {
      ...base.impactSimulation,
      currentPwt: pwt,
      projectedPwt: Math.round(pwt * 0.65),
      currentDeficit: projectedDeficit,
      projectedDeficit: Math.max(5, projectedDeficit - 28),
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

function HealthCard({ d }) {
  const severity = getPwtSeverity(d.pwt);
  const severityTone = getSeverityTone(severity);
  const loadTone = {
    [PWT_SEVERITY.CRITICAL]: { pill: `${severityTone.bg} ${severityTone.text} border ${severityTone.border}`, label: "Critical", hint: "PWT is above the 30-min SLA threshold; activate critical response." },
    [PWT_SEVERITY.WARNING]: { pill: `${severityTone.bg} ${severityTone.text} border ${severityTone.border}`, label: "High Load", hint: "PWT has passed the 20-min action buffer; prepare approved intervention." },
    [PWT_SEVERITY.WATCH]: { pill: `${severityTone.bg} ${severityTone.text} border ${severityTone.border}`, label: "Watch", hint: "PWT is rising above early watch range; monitor closely." },
    [PWT_SEVERITY.NORMAL]: { pill: `${severityTone.bg} ${severityTone.text} border ${severityTone.border}`, label: "Normal Load", hint: "PWT is within normal range." },
  }[severity];
  const isCritical = severity === PWT_SEVERITY.CRITICAL;

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Live Situation</p>
        <h2 className="mt-0.5 text-xl font-extrabold text-[#1a2b5e]">Curb load and queue health</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div>
          <p className="text-5xl font-bold leading-none text-red-600">{d.pwt}</p>
          <p className="mt-2 text-xs font-semibold text-gray-500">min PWT · max 45</p>
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
          <p className="mt-1 text-xs text-gray-400">Est. clearing 45m</p>
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
          <p className="mt-1 text-xs text-gray-400">Throughput 14/m</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-4 py-2">
        <p className="shrink-0 text-xs font-semibold text-gray-500">AI forecast · predicted wait in 15 min</p>
        <p className="text-sm font-semibold text-slate-700">
          {Math.round(kpiSummary.currentPWT)} MIN
          {" → "}
          <span className={`font-semibold ${kpiSummary.currentPWTPrediction > kpiSummary.currentPWT ? "text-red-600" : "text-green-600"}`}>
            {Math.round(kpiSummary.currentPWTPrediction)} MIN
            {" "}
            {kpiSummary.currentPWTPrediction > kpiSummary.currentPWT ? "↑" : "↓"}
          </span>
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Lane load</p>
          </div>
          <p className="text-xs font-bold text-gray-600">{d.laneLoad}%</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#154aa8] transition-all" style={{ width: `${d.laneLoad}%` }} />
        </div>
        {isCritical && <p className="mt-2 text-xs font-semibold text-red-600">{loadTone.hint}</p>}
      </div>
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
  const criticalActionText = "Send Incentive & Broadcast Drivers + Broadcast Holding Zone";
  const actionButton = severity === PWT_SEVERITY.CRITICAL
    ? "Send Incentive & Broadcast Drivers"
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
    </div>
  );
}

// ── AI Situation Brief ─────────────────────────────────────────────────────

function AISituationBrief({ d }) {
  const severity = getPwtSeverity(d.pwt);
  const action = getActionRecommendation(severity);
  const afterActionPWT = Math.round(d.pwt * 0.65);
  const briefText = severity === PWT_SEVERITY.CRITICAL
    ? `All terminals are entering a queue pressure window. PWT is ${d.pwt} min with ${d.waitingPassengers.toLocaleString()} waiting passengers and ${d.laneLoad}% lane load. The 30-min SLA threshold is exceeded; OPS approval required before action.`
    : severity === PWT_SEVERITY.WARNING
    ? "Queue approaching threshold. Monitor and prepare incentive response."
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
          <p className="mt-1 text-sm leading-snug text-gray-700">{action.copy}</p>
        </div>
        <div className="hidden w-px bg-blue-200/70 md:block" />
        <div>
          <p className="text-sm font-bold leading-snug text-slate-900">Expected impact:</p>
          <p className="mt-1 text-sm leading-snug text-gray-700">
            PWT improves from <span className="font-bold">{d.pwt}</span> → <span className="font-bold">{afterActionPWT} min</span>; deficit drops from <span className="font-bold">{d.projectedDeficit}%</span> → <span className="font-bold">10%</span>.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Demand Chart ───────────────────────────────────────────────────────────

function DemandChart({ series }) {
  const W = 640, H = 300, padL = 50, padR = 20, padT = 20, padB = 44;
  const iW = W - padL - padR, iH = H - padT - padB;
  const maxVal = 45;
  const slaThreshold = 30;
  const xStep = iW / (series.length - 1);
  const toX = (i) => padL + i * xStep;
  const toY = (v) => padT + iH - (v / maxVal) * iH;
  const slaY = toY(slaThreshold);
  const pwtPts = series.map((d, i) => `${toX(i)},${toY(d.pwt)}`).join(" ");

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
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
          <rect x={padL} y={padT} width={iW} height={slaY - padT} fill="rgba(220,38,38,0.06)" />
          {series.map((d, i) => {
            if (d.pwt <= slaThreshold) return null;
            const x1 = Math.max(padL, toX(i) - xStep / 2);
            const x2 = Math.min(W - padR, toX(i) + xStep / 2);
            return <rect key={`critical-${d.time}`} x={x1} y={padT} width={x2 - x1} height={iH} fill="rgba(220,38,38,0.08)" />;
          })}
          {[0, 15, 30, 45].map((tick) => (
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
          {[0, 15, 30, 45].map((tick) => (
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
            Wait (min)
          </text>
          <polyline points={pwtPts} fill="none" stroke="#154AA8" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          {series.map((d, i) => (
            <circle key={`point-${d.time}`} cx={toX(i)} cy={toY(d.pwt)} r={2.5} fill="#154AA8" />
          ))}
          {series.map((d, i) => (
            i % 4 === 0 ? (
              <text key={i} x={toX(i)} y={H - 10} textAnchor="middle" fontSize={10} fill="#64748b" fontFamily="system-ui">{d.time}</text>
            ) : null
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Deficit Breakdown ──────────────────────────────────────────────────────

function DeficitBreakdown({ breakdown }) {
  const { t } = useLanguage();
  function signalMeta(item) {
    const factor = item.factor.toLowerCase();
    if (factor.includes("qr")) {
      return {
        label: "QR surge",
        icon: "qr_code_scanner",
        accent: "border-[#FCA5A5] bg-[#FEF2F2]",
        iconColor: "text-red-500",
        titleColor: "text-red-700",
        valueColor: "text-red-600",
        value: `+${item.impact} pax`,
      };
    }
    if (factor.includes("driver shortage")) {
      return {
        label: "Driver shortage",
        icon: "local_taxi",
        accent: "border-[#FCD34D] bg-[#FFFBEB]",
        iconColor: "text-amber-500",
        titleColor: "text-amber-700",
        valueColor: "text-amber-600",
        value: `${item.impact} taxis`,
      };
    }
    if (factor.includes("holding lane")) {
      return {
        label: "Holding lane congestion",
        icon: "traffic",
        accent: "border-[#FCD34D] bg-[#FFFBEB]",
        iconColor: "text-amber-500",
        titleColor: "text-amber-700",
        valueColor: "text-amber-600",
        value: `${item.impact} taxis`,
      };
    }
    const isDemand = item.type === "demand";
    return {
      label: "Flight wave",
      icon: "flight_land",
      accent: isDemand ? "border-[#FCA5A5] bg-[#FEF2F2]" : "border-[#FCD34D] bg-[#FFFBEB]",
      iconColor: isDemand ? "text-red-500" : "text-amber-500",
      titleColor: isDemand ? "text-red-700" : "text-amber-700",
      valueColor: isDemand ? "text-red-600" : "text-amber-600",
      value: item.type === "demand" ? `+${item.impact} pax` : `${item.impact} taxis`,
    };
  }

  return (
    <div className="rounded-xl border border-gray-100 border-t-[3px] border-t-[#EF4444] bg-white p-4 shadow-sm">
        <div className="mb-3">
          <Eyebrow>{t("ops.rootCause")}</Eyebrow>
          <h2 className="mt-0.5 text-lg font-bold text-slate-900">Why the gap is forming</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {breakdown.map((item) => {
            const meta = signalMeta(item);
            return (
              <div key={item.factor} className={`rounded-lg border p-3 ${meta.accent}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`material-symbols-outlined leading-none shrink-0 ${meta.iconColor}`} style={{ fontSize: "18px" }}>
                      {meta.icon}
                    </span>
                    <p className={`text-sm font-semibold leading-tight ${meta.titleColor}`}>{meta.label}</p>
                  </div>
                  <p className={`text-sm font-bold shrink-0 ${meta.valueColor}`}>{meta.value}</p>
                </div>
                <p className="text-xs text-gray-500 leading-snug mt-2">{item.factor}</p>
              </div>
            );
          })}
        </div>
    </div>
  );
}

// ── Impact Simulation ──────────────────────────────────────────────────────

function ImpactSimulation({ sim }) {
  const { t } = useLanguage();
  const actionRecommendation = getActionRecommendation(getPwtSeverity(sim.currentPwt));
  return (
    <div className="h-full rounded-xl border border-gray-100 border-t-[3px] border-t-[#EF4444] bg-white p-4 shadow-sm">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t("ops.impactSimulation")}</p>
            <h2 className="mt-0.5 text-xl font-bold text-[var(--color-text-primary)]">If we act now</h2>
            <p className="mt-1 text-sm text-muted">Estimated outcome after sending incentive</p>
          </div>
          <div className="group relative">
            <button
              type="button"
              aria-label="Impact simulation estimation method"
              className={INFO_ICON_CLASS}
            >
              ⓘ
            </button>
            <div className="pointer-events-none absolute right-0 top-9 z-20 hidden min-w-[260px] max-w-[320px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 shadow-xl group-hover:block group-focus-within:block">
              <p className="font-bold">Estimation method:</p>
              <p className="mt-2">• After Action PWT = Current PWT × 0.65</p>
              <p className="text-gray-500">(based on historical incentive response rate)</p>
              <p className="mt-2">• Deficit reduction assumes +15 taxis dispatched</p>
              <p className="mt-2">• Queue time improvement = ΔPax × avg service rate</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border-2 border-[#4ADE80] bg-[#F0FDF4] px-3 py-2.5">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-green-700">Recommended Action</p>
          <p className="text-sm font-semibold leading-snug text-gray-800">{actionRecommendation.copy}</p>
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
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#16A34A] px-3 py-3">
            <p className="text-2xl font-bold text-white">▼ {sim.pwtReductionPct}%</p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-[#BBF7D0]">PWT improvement</p>
          </div>
          <div className="rounded-lg bg-[#16A34A] px-3 py-3">
            <p className="text-2xl font-bold text-white">▼ {sim.queueTimeReduction} min</p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-[#BBF7D0]">Queue time</p>
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
      [PWT_SEVERITY.WARNING]: "Warning: action buffer exceeded, incentive recommended.",
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

function DataSection({ eyebrow, title, items }) {
  return (
    <div className="rounded-xl border border-gray-100 border-t-[3px] border-t-[#3B82F6] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <span className="text-xs text-muted bg-slate-100 px-2 py-0.5 rounded-full">{items.length}</span>
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
  const { activeTrip, resetMatch } = useDemoMatching();

  if (activeTrip.status === "idle") return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-brand leading-none" style={{ fontSize: "18px" }}>hub</span>
        <p className="text-sm font-bold text-slate-900">
          Assigned: {activeTrip.passengerId} → {activeTrip.driverId} · ETA {activeTrip.etaMin} min
        </p>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase text-brand">
          {activeTrip.status}
        </span>
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

  const escalation = storedEscalation ?? activeEscalation;

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
  const { activeTrip, assignMatch, resetMatch, setOpsAction, dispatchMode, setDispatchMode } = useDemoMatching();
  const matchingMode = getMatchingMode(d.pwt);
  const isCritical = matchingMode === "CRITICAL_MATCHING";
  const isPriority = matchingMode === "PRIORITY_MATCHING";
  const mode = {
    NORMAL_MATCHING: "Normal Matching",
    PRIORITY_MATCHING: "Priority Matching",
    CRITICAL_MATCHING: "Critical Matching",
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
  const bestDriver = {
    id: activeTrip.driverId,
    vehicle: activeTrip.vehicleType,
    etaMin: activeTrip.etaMin,
    acceptanceRate: 94,
    capacityFit: `${activeTrip.passengerCount} pax / ${activeTrip.luggageCount} bags`,
    score: 92,
  };
  const matchingPassengers = [bestPassenger, ...SECONDARY_MATCHING_PASSENGERS];
  const matchingDrivers = [bestDriver, ...SECONDARY_MATCHING_DRIVERS];

  function handleRunMatching() {
    if (matchingMode === "CRITICAL_MATCHING") {
      setOpsAction(OPS_ACTION.OVERFLOW_ACTIVATED);
    } else if (matchingMode === "PRIORITY_MATCHING") {
      setOpsAction(OPS_ACTION.INCENTIVE_SENT);
    }
    assignMatch();
  }

  return (
    <section>
      <SectionHeading eyebrow={t("ops.dispatchIntelligence")} title={t("ops.matchingSimulation")} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#154aa8]/15 bg-[#e8f0fe] px-4 py-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#154aa8]">Dispatch Mode</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Auto assigns after booking. OPS Priority waits for manual dispatch.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {[
            ["auto", "Auto Dispatch"],
            ["priority", "OPS Priority Dispatch"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setDispatchMode(mode)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition-colors ${
                dispatchMode === mode
                  ? "bg-[#154aa8] text-white"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-bold text-slate-900">
            {activeTrip.status === "idle"
              ? "No active demo assignment"
              : `Assigned: ${activeTrip.passengerId} → ${activeTrip.driverId} · ETA ${activeTrip.etaMin} min`}
          </p>
          <p className="text-xs text-muted mt-0.5">Local demo state persists across OPS, Driver, and Passenger tabs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunMatching}
            className="rounded-xl bg-[#154aa8] px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#0f2f68] active:scale-95"
          >
            Run Priority Dispatch
          </button>
          <button
            onClick={resetMatch}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 active:scale-95"
          >
            Reset demo
          </button>
        </div>
      </div>
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
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Best Match</p>
              <p className="mt-1 text-lg font-black text-slate-900">{bestPassenger.id} → {bestDriver.id}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
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
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                {activeTrip.matchingReason}
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
      <DemandChart series={d.forecastSeries} />
      <ImpactSimulation sim={d.impactSimulation} />
    </section>
  );
}

function RootCauseTelemetry({ d, flightItems, supplyItems }) {
  return (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <DeficitBreakdown breakdown={d.deficitBreakdown} />
      <DataSection eyebrow="Flight wave" title="Arrivals driving demand" items={flightItems} />
      <DataSection eyebrow="Supply telemetry" title="Driver response pulse" items={supplyItems} />
    </section>
  );
}

// ── Live Monitoring View ───────────────────────────────────────────────────

function LiveMonitoring({ d, terminal, laneActivated, broadcastSent, onApproveAction }) {
  const severity = getPwtSeverity(d.pwt);
  const severityTone = getSeverityTone(severity);
  const isCritical = severity === PWT_SEVERITY.CRITICAL;
  const flightItems = d.flights.map((f) => ({
    primary: `${f.code} · ${f.origin}`,
    secondary: `${f.status} · ${f.terminal} · ETA ${f.eta}`,
    value: String(f.demand),
    caption: "forecast pax",
  }));
  const supplyItems = d.supplyItems.map((s) => ({
    primary: s.name,
    secondary: s.detail,
    value: String(s.value),
    caption: null,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500">OPS Dashboard · Suvarnabhumi</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isCritical ? "bg-red-50 text-red-700 ring-1 ring-red-200" : `${severityTone.bg} ${severityTone.text} ring-1 ring-gray-100`}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isCritical ? "bg-red-600" : severityTone.dot}`} />
          {isCritical ? "Critical · SLA breached" : severityTone.label}
        </span>
      </div>

      <AISituationBrief d={d} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-3">
          <HealthCard d={d} />
          <DemandChart series={d.forecastSeries} />
        </div>
        <div className="flex flex-col gap-3">
          <AlertCard
            d={d}
            laneActivated={laneActivated}
            broadcastSent={broadcastSent}
            onApproveAction={onApproveAction}
          />
          <ImpactSimulation sim={d.impactSimulation} />
        </div>
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
      "I’m ready to help with queue pressure, arrival-wave risk, driver supply, and next operational actions.",
    contextEyebrow: "Advisory context",
    contextTitle: "Current terminal context",
    chatTitle: "AI Advisory",
    terminal: "TERMINAL",
    pwt: "PWT",
    breachRate: "Breach Rate",
    confirmedQr: "Confirmed QR",
    taxis: "Taxis",
    flights: "Flights",
    subtitle: "Ask about deficits, arrival waves, driver supply, and next actions.",
    suggested: "Suggested operational questions",
    placeholder: "Ask about queue situation...",
    send: "Send",
    generating: "Generating advisory...",
    escalationPrefix: "Active demo escalation",
    prompts: [
      { id: "why-pwt", label: "Why is PWT high?" },
      { id: "next-action", label: "What should we do now?" },
      { id: "drivers", label: "Are drivers sufficient?" },
      { id: "arrival-risk", label: "What is the current risk?" },
    ],
    responses: {
      "why-pwt": `Terminal 1 is under arrival-wave pressure from EK374 and QR833.\nHolding supply is not enough for the next 15 minutes.\n\nRoot cause:\nPassenger demand is rising faster than curb taxi supply.\n\nRecommended action:\nApprove incentive + broadcast nearby drivers.\n\nExpected impact:\nProjected PWT improves from 52 → 34 min.`,
      "next-action": `The current queue state is critical and needs OPS approval.\n\nRoot cause:\nPWT is above the 30-min SLA breach threshold while lane load remains high.\n\nRecommended action:\nRun Priority Dispatch and approve driver broadcast.\n\nExpected impact:\nDriver supply reaches the pickup zone earlier and reduces queue pressure.`,
      drivers: `Drivers are not sufficient for the next demand window.\n\nRoot cause:\nInbound passenger volume is outpacing available curb taxis.\n\nRecommended action:\nBroadcast nearby drivers and prepare reassignment support.\n\nExpected impact:\nCoverage improves before the next arrival wave peaks.`,
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
      "why-pwt": `Terminal 1 กำลังเจอแรงกดดันจากเที่ยวบิน EK374 และ QR833 ที่ทับซ้อนกัน\nจำนวนแท็กซี่ในคิวไม่พอสำหรับ 15 นาทีถัดไป\n\nสาเหตุหลัก:\nผู้โดยสารเพิ่มเร็วกว่าจำนวนรถที่พร้อมรับริมทาง\n\nคำแนะนำ:\nอนุมัติโบนัสดึงคนขับ + แจ้งเตือนคนขับใกล้เคียง\n\nผลที่คาดว่าจะเกิดขึ้น:\nPWT ที่คาดการณ์ดีขึ้นจาก 52 → 34 นาที`,
      "next-action": `สถานการณ์คิวตอนนี้อยู่ในระดับวิกฤตและต้องให้ OPS อนุมัติ\n\nสาเหตุหลัก:\nPWT เกินเกณฑ์ SLA 30 นาที ขณะที่โหลดเลนยังสูง\n\nคำแนะนำ:\nRun Priority Dispatch และอนุมัติการแจ้งเตือนคนขับ\n\nผลที่คาดว่าจะเกิดขึ้น:\nคนขับเข้าถึงจุดรับเร็วขึ้นและลดแรงกดดันของคิว`,
      drivers: `จำนวนคนขับยังไม่เพียงพอสำหรับช่วงดีมานด์ถัดไป\n\nสาเหตุหลัก:\nปริมาณผู้โดยสารขาเข้าเพิ่มเร็วกว่าจำนวนแท็กซี่ที่พร้อมรับ\n\nคำแนะนำ:\nแจ้งเตือนคนขับใกล้เคียงและเตรียมแผน reassignment\n\nผลที่คาดว่าจะเกิดขึ้น:\nความครอบคลุมของรถดีขึ้นก่อนคลื่นผู้โดยสารรอบถัดไป`,
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

function AIAdvisoryWorkspace({ d }) {
  const { language } = useLanguage();
  const copy = ADVISORY_COPY[language] ?? ADVISORY_COPY.en;
  const { createEscalation, activeEscalation } = useDemoMatching();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  function getResponse(question, promptId) {
    const protocol = matchProtocol(question);
    if (protocol) {
      createEscalation({ protocol, message: question, sourceRole: "AI Advisory" });
      return copy.protocolResponse(protocol);
    }

    if (promptId && copy.responses[promptId]) {
      return copy.responses[promptId];
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

          {activeEscalation?.status === "open" && (
            <div className="mt-4 rounded-xl border border-red-100 border-l-4 border-l-red-500 bg-red-50 px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-700">
                  {activeEscalation.severity}
                </span>
                <p className="min-w-0 truncate text-sm font-bold text-slate-900">{activeEscalation.protocolName}</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{activeEscalation.recommendedAction}</p>
            </div>
          )}

          {activeEscalation?.status === "acknowledged" && (
            <div className="mt-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-slate-50 px-3 py-2.5">
              <p className="text-xs font-bold text-slate-700">Recent escalation acknowledged</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeEscalation.protocolName} · OPS acknowledged
              </p>
            </div>
          )}
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
      <MatchingSimulation d={d} />
      <EdgeCaseProtocolsSection />
      <MLPredictionCard terminal={terminal} />
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
  const { assignMatch, setOpsAction } = useDemoMatching();
  const currentTime = useCurrentThaiMinuteTime();
  const [opsLoggedIn, setOpsLoggedIn] = useState(getStoredOpsAuth);
  const terminal = "ALL";
  const [workspace, setWorkspace] = useState("monitoring");
  const [laneActivated, setLaneActivated] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  function handleSignOut() {
    window.localStorage.removeItem(OPS_AUTH_KEY);
    setOpsLoggedIn(false);
  }

  function handleApproveOpsAction(severity) {
    if (severity === PWT_SEVERITY.CRITICAL) {
      setLaneActivated(true);
      setBroadcastSent(true);
      setOpsAction(OPS_ACTION.OVERFLOW_ACTIVATED);
      assignMatch();
      return;
    }

    if (severity === PWT_SEVERITY.WARNING) {
      setBroadcastSent(true);
      setOpsAction(OPS_ACTION.INCENTIVE_SENT);
    }
  }

  if (!opsLoggedIn) {
    return <OPSLoginScreen onLogin={() => setOpsLoggedIn(true)} />;
  }

  const d = buildOpsView();

  const workspaceOptions = [
    { id: "monitoring", label: t("ops.liveMonitoring") },
    { id: "advisory", label: t("ops.aiAdvisory") },
  ];
  const workspaceTitle = workspace === "intelligence"
    ? t("ops.systemIntelligence")
    : workspaceOptions.find((item) => item.id === workspace)?.label ?? t("ops.liveMonitoring");

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
                  Live · Last updated {currentTime}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">{d.title} · {workspaceTitle}</p>
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
          {workspace === "advisory" && <AIAdvisoryWorkspace d={d} />}
          {workspace === "intelligence" && <SystemIntelligenceWorkspace d={d} terminal={terminal} />}
        </div>
      </main>
    </div>
  );
}
