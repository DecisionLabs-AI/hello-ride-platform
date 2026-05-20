import { useState } from "react";
import { getOpsData, ADVISORY_RESPONSES } from "../data/mockOps.js";

const OPS_AUTH_KEY = "helloRideOpsAuth";
const OPS_DEMO_USERNAME = "ops_demo";
const OPS_DEMO_PASSWORD = "1234";

function getStoredOpsAuth() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(OPS_AUTH_KEY) === "true";
}

// ── Shared sub-components ───────────────────────────────────────────────────

function Eyebrow({ children }) {
  return (
    <p className="text-xs text-muted uppercase tracking-widest font-semibold">{children}</p>
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

function PWTGauge({ value, threshold = 10 }) {
  const isAbove = value > threshold;
  const max = 30;
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
          stroke={isAbove ? "rgba(180,30,30,0.15)" : "rgba(0,0,0,0.08)"} strokeWidth="11"
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeLinecap="round"
          transform="rotate(135 82 90)"
        />
        <circle
          cx="82" cy="90" r={r} fill="none"
          stroke={isAbove ? "#b91c1c" : "#00b14f"} strokeWidth="11"
          strokeDasharray={`${progressLen} ${circ - progressLen}`}
          strokeLinecap="round"
          transform="rotate(135 82 90)"
        />
        <text x="82" y="86" textAnchor="middle" fontSize="42" fontWeight="800"
          fill={isAbove ? "#b91c1c" : "#1a2b5e"} fontFamily="system-ui, sans-serif">
          {value}
        </text>
        <text x="82" y="108" textAnchor="middle" fontSize="12" fill="#94a3b8"
          fontFamily="system-ui, sans-serif" fontWeight="500">
          MIN PWT
        </text>
      </svg>
      <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
        isAbove ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isAbove ? "bg-red-500" : "bg-green-500"}`} />
        {isAbove ? "CRITICAL DELAY" : "WITHIN GUARDRAIL"}
      </span>
    </div>
  );
}

// ── KPI Metric Card ────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, trend, tone = "default" }) {
  const valueColor =
    tone === "danger" ? "text-danger" :
    tone === "brand" ? "text-brand" :
    tone === "ops" ? "text-ops" : "text-slate-900";
  const trendColor = trend && trend.startsWith("+") ? "text-brand" : "text-danger";
  const accentColor =
    tone === "danger" ? "bg-danger" :
    tone === "brand" ? "bg-brand" :
    tone === "ops" ? "bg-ops" : "bg-transparent";

  return (
    <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className={`h-0.5 ${accentColor}`} />
      <div className="p-5 flex flex-col gap-1 flex-1">
        <Eyebrow>{label}</Eyebrow>
        <div className="flex items-end gap-2 mt-1">
          <p className={`text-3xl font-bold leading-none ${valueColor}`}>{value}</p>
          {trend && <p className={`text-xs font-semibold pb-0.5 ${trendColor}`}>{trend}</p>}
        </div>
        {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Lane Load Progress ─────────────────────────────────────────────────────

function LaneLoadCard({ load }) {
  const color = load > 85 ? "bg-danger" : load > 70 ? "bg-amber-500" : "bg-brand";
  const textColor = load > 85 ? "text-danger" : load > 70 ? "text-amber-600" : "text-brand";
  return (
    <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
      <div className="h-0.5 bg-amber-400" />
      <div className="p-5">
        <Eyebrow>Lane 1 high-capacity mode</Eyebrow>
        <div className="flex items-center justify-between mt-1 mb-3">
          <p className="text-sm text-slate-600">System load</p>
          <p className={`text-sm font-bold ${textColor}`}>{load}%</p>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${load}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Health Card ────────────────────────────────────────────────────────

function HealthCard({ d }) {
  const loadTone = d.laneLoad >= 85
    ? { bar: "bg-red-500",     pill: "bg-red-50 text-red-700 border border-red-200",       label: "Near Capacity", hint: "Capacity is near limit; activate mitigation if demand rises." }
    : d.laneLoad >= 70
    ? { bar: "bg-amber-400",   pill: "bg-amber-50 text-amber-700 border border-amber-200",  label: "High Load",     hint: "Lane capacity is tight; prepare overflow option." }
    : { bar: "bg-brand",       pill: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "Normal Load", hint: "Lane capacity is stable." };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Live Situation</Eyebrow>
          <h2 className="text-xl font-black text-[#1a2b5e] mt-0.5">Curb load and queue health</h2>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${loadTone.pill}`}>
          {loadTone.label}
        </span>
      </div>

      {/* Gauge + KPI metrics: fixed gauge, then two equal metric cols on larger screens */}
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] items-center gap-5">
        <PWTGauge value={d.pwt} threshold={d.guardrailMin} />
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waiting Pax</p>
          <div className="flex items-end gap-1.5 mt-1.5">
            <p className="text-4xl font-bold text-[#1a2b5e] leading-none">{d.waitingPassengers.toLocaleString()}</p>
            <span className={`text-sm font-bold mb-0.5 ${d.waitingTrend?.startsWith("+") ? "text-red-500" : "text-green-600"}`}>
              {d.waitingTrend}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Est. clearing in 45m</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Holding Taxis</p>
          <div className="flex items-end gap-1.5 mt-1.5">
            <p className="text-4xl font-bold text-[#1a2b5e] leading-none">{d.holdingTaxis}</p>
            <span className={`text-sm font-bold mb-0.5 ${d.taxiTrend?.startsWith("-") ? "text-red-500" : "text-green-600"}`}>
              {d.taxiTrend}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Queue throughput: 14/m</p>
        </div>
      </div>

      {/* System load row */}
      <div className="pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Lane 1: System Load</p>
          </div>
          <p className="text-xs font-bold text-slate-600">{d.laneLoad}%</p>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${loadTone.bar}`} style={{ width: `${d.laneLoad}%` }} />
        </div>
        <p className="text-xs text-muted mt-1.5">{loadTone.hint}</p>
      </div>
    </div>
  );
}

// ── Projected Deficit Alert Card ────────────────────────────────────────────

function AlertCard({ d, laneActivated, setLaneActivated, broadcastSent, setBroadcastSent }) {
  return (
    <div className="bg-[#7d1a1a] text-white rounded-2xl shadow-lg p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white leading-none" style={{ fontSize: '14px' }}>warning</span>
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">Critical Alert / Action</p>
          <p className="text-[10px] uppercase tracking-widest text-red-200 font-bold mt-0.5">Recommended now</p>
        </div>
      </div>
      <p className="text-xs text-red-200 leading-snug -mt-1">
        Arrival wave projected in T-15 mins. Predicted passenger influx will exceed current lane capacity by {d.projectedDeficit}%.
      </p>
      <div className="bg-white/10 rounded-xl p-3">
        <p className="text-xs font-bold uppercase tracking-widest text-red-300 mb-1">Single action</p>
        <p className="text-sm text-white font-bold leading-snug">{d.impactSimulation.action}</p>
        <p className="text-xs text-white/75 leading-snug mt-1">AI advisory: {d.aiAdvice}</p>
      </div>
      <button
        onClick={() => setLaneActivated(true)}
        disabled={laneActivated}
        className="w-full bg-white text-[#7d1a1a] font-bold py-2.5 rounded-xl text-sm transition-colors hover:bg-red-50 disabled:bg-emerald-50 disabled:text-brand active:scale-95"
      >
        {laneActivated ? "Overflow Lane Active ✓" : "Activate Overflow Lane"}
      </button>
      <button
        onClick={() => setBroadcastSent(true)}
        disabled={broadcastSent}
        className="w-full border border-white/45 text-white font-bold py-2 rounded-xl text-xs transition-colors hover:bg-white/10 disabled:bg-white/10 disabled:text-white/60 active:scale-95 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined leading-none" style={{ fontSize: '16px' }}>broadcast_on_personal</span>
        {broadcastSent ? "Broadcast Sent ✓" : "Broadcast to Drivers"}
      </button>
    </div>
  );
}

// ── Demand Chart ───────────────────────────────────────────────────────────

function DemandChart({ series, criticalWindow }) {
  const W = 640, H = 300, padL = 50, padR = 20, padT = 20, padB = 44;
  const iW = W - padL - padR, iH = H - padT - padB;
  const allVals = series.flatMap((d) => [d.demand, d.supply]);
  const maxVal = Math.max(...allVals, 1);
  const xStep = iW / (series.length - 1);
  const toX = (i) => padL + i * xStep;
  const toY = (v) => padT + iH - (v / maxVal) * iH;

  const demandPts = series.map((d, i) => `${toX(i)},${toY(d.demand)}`).join(" ");
  const supplyPts = series.map((d, i) => `${toX(i)},${toY(d.supply)}`).join(" ");

  const startIdx = criticalWindow ? series.findIndex((s) => s.time === criticalWindow.start) : -1;
  const endIdx = criticalWindow ? series.findIndex((s) => s.time === criticalWindow.end) : -1;
  const cwX1 = startIdx >= 0 ? toX(startIdx) : null;
  const cwX2 = endIdx >= 0 ? toX(endIdx) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 pt-6 pb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Predictive Forecast</p>
          <h2 className="text-2xl font-bold text-[#1a2b5e] mt-0.5">Arrival Wave Analysis</h2>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-[#154AA8] shrink-0" />
            Demand Forecast
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block w-5 shrink-0" style={{ borderTop: "2px dashed #94a3b8", marginTop: "1px" }} />
            Holding Area Supply
          </div>
        </div>
      </div>
      {/* No explicit height on SVG — scales naturally from viewBox aspect ratio (640:300 ≈ 2.1) */}
      <div className="px-5 pb-6">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={padL} y1={padT + iH * (1 - t)} x2={W - padR} y2={padT + iH * (1 - t)}
              stroke="rgba(0,0,0,0.06)" strokeWidth={1} strokeDasharray="4 4" />
          ))}
          {cwX1 !== null && cwX2 !== null && (
            <>
              <rect x={cwX1} y={padT} width={cwX2 - cwX1} height={iH} fill="rgba(220,38,38,0.08)" />
              <text
                x={cwX1 + (cwX2 - cwX1) / 2} y={padT + iH / 2}
                textAnchor="middle" fontSize={8} fill="#dc2626"
                fontFamily="system-ui" fontWeight="600" letterSpacing="1"
                transform={`rotate(-90 ${cwX1 + (cwX2 - cwX1) / 2} ${padT + iH / 2})`}
              >
                CRITICAL DEFICIT WINDOW
              </text>
            </>
          )}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text key={t} x={padL - 6} y={padT + iH * (1 - t) + 4}
              textAnchor="end" fontSize={10} fill="#94a3b8" fontFamily="system-ui">
              {Math.round(maxVal * t)}
            </text>
          ))}
          <polyline points={supplyPts} fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinejoin="round" strokeDasharray="6 4" />
          <polyline points={demandPts} fill="none" stroke="#154AA8" strokeWidth={3} strokeLinejoin="round" />
          {series.map((d, i) => (
            <text key={i} x={toX(i)} y={H - 10} textAnchor="middle" fontSize={10} fill="#64748b" fontFamily="system-ui">{d.time}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Deficit Breakdown ──────────────────────────────────────────────────────

function DeficitBreakdown({ breakdown }) {
  function signalMeta(item) {
    const factor = item.factor.toLowerCase();
    if (factor.includes("qr")) {
      return {
        label: "QR surge",
        icon: "qr_code_scanner",
        accent: "border-red-200 bg-red-50/70 text-red-700",
        value: `+${item.impact} pax`,
      };
    }
    if (factor.includes("driver shortage")) {
      return {
        label: "Driver shortage",
        icon: "local_taxi",
        accent: "border-amber-200 bg-amber-50/70 text-amber-700",
        value: `${item.impact} taxis`,
      };
    }
    if (factor.includes("holding lane")) {
      return {
        label: "Holding lane congestion",
        icon: "traffic",
        accent: "border-amber-200 bg-amber-50/70 text-amber-700",
        value: `${item.impact} taxis`,
      };
    }
    return {
      label: "Flight wave",
      icon: "flight_land",
      accent: item.type === "demand"
        ? "border-red-200 bg-red-50/70 text-red-700"
        : "border-amber-200 bg-amber-50/70 text-amber-700",
      value: item.type === "demand" ? `+${item.impact} pax` : `${item.impact} taxis`,
    };
  }

  return (
    <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
      <div className="h-0.5 bg-danger" />
      <div className="p-5">
        <div className="mb-3">
          <Eyebrow>Root Cause</Eyebrow>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">Why the gap is forming</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {breakdown.map((item) => {
            const meta = signalMeta(item);
            return (
              <div key={item.factor} className={`rounded-xl border p-3.5 ${meta.accent}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined leading-none shrink-0" style={{ fontSize: "18px" }}>
                      {meta.icon}
                    </span>
                    <p className="text-sm font-black leading-tight">{meta.label}</p>
                  </div>
                  <p className="text-sm font-black shrink-0">{meta.value}</p>
                </div>
                <p className="text-xs text-slate-600 leading-snug mt-2">{item.factor}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Impact Simulation ──────────────────────────────────────────────────────

function ImpactSimulation({ sim }) {
  return (
    <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden h-full">
      <div className="h-0.5 bg-brand" />
      <div className="p-5 flex flex-col gap-4 h-full">
        <div>
          <Eyebrow>Impact Simulation</Eyebrow>
          <h2 className="text-xl font-bold text-[#1a2b5e] mt-0.5">If we act now</h2>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-xs text-emerald-700 uppercase tracking-widest font-bold">Recommended Action</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">{sim.action}</p>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4 border-b border-slate-100 bg-slate-50/80">
            <div>
              <p className="text-xs text-muted uppercase tracking-widest font-bold">Current PWT</p>
              <p className="text-3xl font-black text-danger mt-0.5">{sim.currentPwt} min</p>
            </div>
            <span className="material-symbols-outlined text-slate-300">arrow_forward</span>
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-widest font-bold">After Action</p>
              <p className="text-3xl font-black text-brand mt-0.5">{sim.projectedPwt} min</p>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-widest font-bold">Deficit</p>
              <p className="text-3xl font-black text-danger mt-0.5">{sim.currentDeficit}%</p>
            </div>
            <span className="material-symbols-outlined text-slate-300">arrow_forward</span>
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-widest font-bold">After Action</p>
              <p className="text-3xl font-black text-brand mt-0.5">{sim.projectedDeficit}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-auto">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <p className="text-xs text-emerald-700 uppercase tracking-widest font-bold">PWT Improvement</p>
            <p className="text-2xl font-black text-brand mt-0.5">−{sim.pwtReductionPct}%</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <p className="text-xs text-emerald-700 uppercase tracking-widest font-bold">Queue Time</p>
            <p className="text-2xl font-black text-brand mt-0.5">−{sim.queueTimeReduction} min</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ML Prediction ───────────────────────────────────────────────────────────

const ML_MOCK = {
  T1:  { predictedPWT: 19.0, breachProb: 78,   decision: "Activate extra lane and broadcast to drivers." },
  T2:  { predictedPWT: 13.8, breachProb: 12.5, decision: "Monitor closely — no extra lane required yet." },
  ALL: { predictedPWT: 16.4, breachProb: 49,   decision: "Stage overflow capacity and synchronize driver broadcast." },
};

function MLPredictionCard({ terminal }) {
  const { predictedPWT, breachProb, decision } = ML_MOCK[terminal] ?? ML_MOCK.T1;
  const SLA_THRESHOLD = 15;
  const buffer = +(SLA_THRESHOLD - predictedPWT).toFixed(1);

  const kpi = predictedPWT >= SLA_THRESHOLD
    ? { label: "SLA Breached",   dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",    border: "border-red-200",    bar: "bg-red-500",     desc: "Predicted wait time exceeds the SLA. Immediate intervention required." }
    : predictedPWT >= 12
    ? { label: "Near Threshold", dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",  border: "border-amber-200",  bar: "bg-amber-400",   desc: "Within 3 min of the SLA limit. Monitor closely and prepare actions." }
    : { label: "Within SLA",     dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-500", desc: "Predicted wait time remains comfortably below the operational SLA threshold." };

  const modelInputs = ["Flight wave", "QR demand", "Taxi supply", "Lane capacity", "Weather", "Time"];
  const decisionText = `Decision: ${decision}`;
  const modelStatus = "Offline model";

  return (
    <details className="group bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
        <div>
          <Eyebrow>ML Prediction Details</Eyebrow>
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
                <p className="text-xs text-muted mt-1">Predicts probability of PWT &gt; 15 min</p>
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
                  <span className="text-xs text-muted">Target SLA</span>
                  <span className="text-xs font-bold text-slate-600">&lt; {SLA_THRESHOLD} min</span>
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
                <p className="text-xs text-muted mt-1">vs {SLA_THRESHOLD} min SLA limit</p>
              </div>
            </div>

            {/* Breach Risk Probability */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-muted uppercase tracking-widest font-semibold">Breach Risk Probability</p>
              <p className="text-4xl font-bold text-slate-900 mt-1">{breachProb}%</p>
              <p className="text-xs text-muted mt-3 leading-relaxed">
                Probability PWT exceeds {SLA_THRESHOLD} min SLA in the next demand window.
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

// ── OPS Control Actions ────────────────────────────────────────────────────

function OpsControlActions({ laneActivated, setLaneActivated, broadcastSent, setBroadcastSent, lane2Active, setLane2Active }) {
  const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const actions = [
    {
      title: "Overflow Lane",
      subtitle: "Activate high-capacity overflow routing for Terminal 1 pickup zone",
      priority: "primary",
      activated: laneActivated,
      onActivate: () => setLaneActivated(true),
      activeLabel: "Overflow Lane Active ✓",
      inactiveLabel: "Activate Overflow Lane",
    },
    {
      title: "Driver Broadcast",
      subtitle: "Push a 6-minute head-start message to all holding and inbound drivers",
      priority: "secondary",
      activated: broadcastSent,
      onActivate: () => setBroadcastSent(true),
      activeLabel: `Sent ${now} ✓`,
      inactiveLabel: "Broadcast to Drivers",
    },
    {
      title: "Lane 2",
      subtitle: "Open secondary pickup lane to relieve primary lane congestion",
      priority: "tertiary",
      activated: lane2Active,
      onActivate: () => setLane2Active(true),
      activeLabel: "Lane 2 Open ✓",
      inactiveLabel: "Open Lane 2",
    },
  ];

  return (
    <div>
      <SectionHeading eyebrow="OPS Control Actions" title="Act now — these change live state" />
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
        <div className="h-0.5 bg-danger" />
        <div className="p-5">
          <Eyebrow>Dispatch Controls</Eyebrow>
          <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr_0.85fr] gap-3 mt-4">
            {actions.map((action) => {
              const buttonClass = action.activated
                ? "bg-emerald-50 text-brand border border-brand/30 cursor-default"
                : action.priority === "primary"
                ? "bg-danger text-white hover:bg-red-700 active:scale-95 shadow-sm"
                : action.priority === "secondary"
                ? "bg-white text-[#154aa8] border border-[#154aa8]/30 hover:bg-[#154aa8]/5 active:scale-95"
                : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 active:scale-95";
              const cardClass = action.priority === "primary"
                ? "bg-red-50/70 border-red-200 shadow-sm"
                : action.priority === "secondary"
                ? "bg-white border-[#154aa8]/20"
                : "bg-slate-50 border-slate-200 opacity-85";
              const labelClass = action.priority === "primary"
                ? "bg-danger text-white"
                : action.priority === "secondary"
                ? "bg-[#154aa8]/10 text-[#154aa8]"
                : "bg-slate-200 text-slate-500";
              const priorityLabel = action.priority === "primary"
                ? "Primary"
                : action.priority === "secondary"
                ? "Secondary"
                : "Optional";

              return (
                <div key={action.title} className={`flex flex-col gap-3 rounded-xl border p-4 ${cardClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-bold ${action.priority === "tertiary" ? "text-slate-600" : "text-slate-900"}`}>
                        {action.title}
                      </p>
                      <p className="text-xs text-muted leading-relaxed mt-1">{action.subtitle}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${labelClass}`}>
                      {priorityLabel}
                    </span>
                  </div>
                  <button
                    onClick={action.onActivate}
                    disabled={action.activated}
                    className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${buttonClass}`}
                  >
                    {action.activated ? action.activeLabel : action.inactiveLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Supporting Data: 3-column table ───────────────────────────────────────

function DataSection({ eyebrow, title, items }) {
  return (
    <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5">
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

function StickyActionBar({ terminal, d, laneActivated, setLaneActivated, broadcastSent, setBroadcastSent }) {
  const isCritical = d.pwt > d.guardrailMin;

  return (
    <div className={`sticky top-0 z-30 -mx-8 px-8 py-2 border-y backdrop-blur ${
      isCritical
        ? "bg-red-50/95 border-red-200"
        : "bg-white/95 border-slate-200"
    }`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isCritical ? "bg-danger" : "bg-brand"}`} />
          <p className={`text-xs sm:text-sm font-black tracking-wide ${isCritical ? "text-red-800" : "text-slate-700"}`}>
            {isCritical ? "CRITICAL" : "LIVE"} · {terminal} SLA breach projected in 15 min
          </p>
          <span className="hidden md:inline text-xs text-slate-500 truncate">
            PWT {d.pwt} min · {d.waitingPassengers.toLocaleString()} waiting pax
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLaneActivated(true)}
            disabled={laneActivated}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              laneActivated
                ? "bg-emerald-50 text-brand border border-brand/30"
                : "bg-danger text-white hover:bg-red-700 active:scale-95 shadow-sm"
            }`}
          >
            {laneActivated ? "Overflow Active" : "Activate Overflow Lane"}
          </button>
          <button
            onClick={() => setBroadcastSent(true)}
            disabled={broadcastSent}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              broadcastSent
                ? "bg-emerald-50 text-brand border border-brand/30"
                : "bg-white text-[#154aa8] border border-[#154aa8]/30 hover:bg-[#154aa8]/5 active:scale-95"
            }`}
          >
            {broadcastSent ? "Broadcast Sent" : "Broadcast Drivers"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommandCenter({ d, laneActivated, setLaneActivated, broadcastSent, setBroadcastSent }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-stretch">
      <HealthCard d={d} />
      <AlertCard
        d={d}
        laneActivated={laneActivated} setLaneActivated={setLaneActivated}
        broadcastSent={broadcastSent} setBroadcastSent={setBroadcastSent}
      />
    </section>
  );
}

function ForecastImpactSection({ d }) {
  return (
    <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.8fr)] gap-5 items-stretch">
      <DemandChart series={d.forecastSeries} criticalWindow={d.criticalWindow} />
      <ImpactSimulation sim={d.impactSimulation} />
    </section>
  );
}

function RootCauseTelemetry({ d, flightItems, signalItems, supplyItems }) {
  return (
    <section className="flex flex-col gap-4">
      <DeficitBreakdown breakdown={d.deficitBreakdown} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DataSection eyebrow="Flight wave" title="Arrivals driving demand" items={flightItems} />
        <DataSection eyebrow="Demand capture" title="QR scans in the last 20 minutes" items={signalItems} />
        <DataSection eyebrow="Supply telemetry" title="Driver response pulse" items={supplyItems} />
      </div>
    </section>
  );
}

// ── Live Monitoring View ───────────────────────────────────────────────────

function LiveMonitoring({ d, terminal, laneActivated, setLaneActivated, broadcastSent, setBroadcastSent, lane2Active, setLane2Active }) {
  const flightItems = d.flights.map((f) => ({
    primary: `${f.code} · ${f.origin}`,
    secondary: `${f.status} · ${f.terminal} · ETA ${f.eta}`,
    value: String(f.demand),
    caption: "forecast pax",
  }));

  const signalItems = d.demandSignals.map((s) => ({
    primary: s.zone,
    secondary: s.time,
    value: `${s.parties} parties`,
    caption: `${s.luggage} bags`,
  }));

  const supplyItems = d.supplyItems.map((s) => ({
    primary: s.name,
    secondary: s.detail,
    value: String(s.value),
    caption: null,
  }));

  return (
    <div className="flex flex-col gap-5">
      <StickyActionBar
        terminal={terminal}
        d={d}
        laneActivated={laneActivated} setLaneActivated={setLaneActivated}
        broadcastSent={broadcastSent} setBroadcastSent={setBroadcastSent}
      />

      {/* Command Center */}
      <CommandCenter
        d={d}
        laneActivated={laneActivated} setLaneActivated={setLaneActivated}
        broadcastSent={broadcastSent} setBroadcastSent={setBroadcastSent}
      />

      {/* Forecast + Impact Simulation */}
      <ForecastImpactSection d={d} />

      {/* Root Cause / Telemetry */}
      <RootCauseTelemetry
        d={d}
        flightItems={flightItems}
        signalItems={signalItems}
        supplyItems={supplyItems}
      />

      {/* OPS Control Actions */}
      <OpsControlActions
        laneActivated={laneActivated} setLaneActivated={setLaneActivated}
        broadcastSent={broadcastSent} setBroadcastSent={setBroadcastSent}
        lane2Active={lane2Active} setLane2Active={setLane2Active}
      />

      {/* ML Prediction Details */}
      <MLPredictionCard terminal={terminal} />
    </div>
  );
}

// ── AI Advisory Workspace ──────────────────────────────────────────────────

const DEFAULT_AI_MSG = {
  role: "assistant",
  text: "Hello Ride AI Advisory is ready. Ask about deficit risk, arrival-wave pressure, lane activation, or the next 15 minutes of BKK operations.",
};

const QUICK_PROMPTS = [
  "What is causing the projected deficit?",
  "Should we activate overflow capacity now?",
  "Summarize Terminal 1 status",
  "What should ops do in the next 15 minutes?",
  "Explain the arrival wave risk",
  "Are drivers sufficient for current demand?",
];

function AIAdvisoryWorkspace({ d }) {
  const [history, setHistory] = useState([DEFAULT_AI_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSend(question) {
    if (!question.trim()) return;
    const q = question.trim();
    setHistory((h) => [...h, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const response =
        ADVISORY_RESPONSES[q] ??
        `Based on current Terminal ${d.code} conditions (PWT: ${d.pwt} min, deficit: ${d.projectedDeficit}%), my recommendation is to ${d.aiAdvice}`;
      setHistory((h) => [...h, { role: "assistant", text: response }]);
      setLoading(false);
    }, 800);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Context Strip */}
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
        <div className="h-0.5 bg-ops" />
        <div className="p-5">
          <Eyebrow>Advisory context</Eyebrow>
          <p className="text-xs text-muted mt-0.5 mb-4">Live OPS context used by the assistant</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              ["Current terminal", d.title],
              ["PWT", `${d.pwt} min`],
              ["Projected deficit", `${d.projectedDeficit}%`],
              ["Waiting pax", String(d.waitingPassengers)],
              ["Holding taxis", String(d.holdingTaxis)],
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3">
                <Eyebrow>{label}</Eyebrow>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5">
        <Eyebrow>Quick prompts</Eyebrow>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="text-left text-sm text-slate-600 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-brand/40 hover:text-slate-900 hover:bg-brand/5 transition-all leading-snug"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5 flex flex-col gap-4">
        <Eyebrow>Advisory chat</Eyebrow>
        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
          {history.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                msg.role === "assistant" ? "bg-ops text-white" : "bg-brand text-white"
              }`}>
                {msg.role === "assistant" ? "AI" : "You"}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-slate-100 text-slate-700"
                  : "bg-brand/15 text-brand-deep font-medium"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-ops text-white flex items-center justify-center text-xs font-bold">AI</div>
              <div className="bg-slate-100 rounded-2xl px-4 py-2.5 text-muted text-sm animate-pulse">
                Generating advisory...
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
            placeholder="Ask about deficits, arrivals, supply, or the next actions"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10 transition-all"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className="px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-40 hover:bg-brand-deep transition-colors shadow-sm"
          >
            Send
          </button>
        </div>
      </div>
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
  const [opsLoggedIn, setOpsLoggedIn] = useState(getStoredOpsAuth);
  const [terminal, setTerminal] = useState("T1");
  const [workspace, setWorkspace] = useState("monitoring");
  const [laneActivated, setLaneActivated] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [lane2Active, setLane2Active] = useState(false);

  function handleSignOut() {
    window.localStorage.removeItem(OPS_AUTH_KEY);
    setOpsLoggedIn(false);
  }

  if (!opsLoggedIn) {
    return <OPSLoginScreen onLogin={() => setOpsLoggedIn(true)} />;
  }

  const d = getOpsData(terminal);

  const terminalOptions = ["T1", "T2", "ALL"];
  const workspaceOptions = [
    { id: "monitoring", label: "Live Monitoring" },
    { id: "advisory", label: "AI Advisory" },
  ];

  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#f5f8fb]">
      {/* Sidebar */}
      <aside className="w-44 shrink-0 bg-white border-r border-slate-200 flex flex-col py-4 overflow-y-auto">
        <div className="px-3 mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Terminal</p>
          <div className="flex flex-col gap-1">
            {terminalOptions.map((t) => (
              <button
                key={t}
                onClick={() => setTerminal(t)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  terminal === t ? "bg-[#154aa8]/10 text-[#154aa8]" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "T1" ? "Terminal 1" : t === "T2" ? "Terminal 2" : "All Terminals"}
              </button>
            ))}
          </div>
        </div>
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
        <div className="px-3 pt-4 border-t border-slate-100 space-y-1">
          <p className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">Documentation</p>
          <p className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">Support</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#f5f8fb]">
        <div className="px-8 py-7 max-w-6xl mx-auto flex flex-col gap-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-headline font-black text-2xl text-[#1a2b5e]">Hello Ride Console</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-brand">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  Live · Last updated 14:35
                </span>
              </div>
              <p className="text-xs text-muted mt-1">{d.title} · {workspace === "advisory" ? "AI Advisory" : "Live Monitoring"}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm hover:border-[#154aa8]/30 hover:text-[#154aa8] transition-colors"
            >
              <span className="material-symbols-outlined leading-none" style={{ fontSize: "16px" }}>logout</span>
              Sign out
            </button>
          </div>
          {workspace === "monitoring" && (
            <LiveMonitoring
              d={d}
              terminal={terminal}
              laneActivated={laneActivated} setLaneActivated={setLaneActivated}
              broadcastSent={broadcastSent} setBroadcastSent={setBroadcastSent}
              lane2Active={lane2Active} setLane2Active={setLane2Active}
            />
          )}
          {workspace === "advisory" && <AIAdvisoryWorkspace d={d} />}
        </div>
      </main>
    </div>
  );
}
