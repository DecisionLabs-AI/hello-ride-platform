import * as Tabs from "@radix-ui/react-tabs";
import {
  AlertTriangle,
  Bell,
  BrainCircuit,
  CableCar,
  ChevronRight,
  Clock3,
  Plane,
  Settings2,
  UsersRound,
} from "lucide-react";
import { opsExperience } from "../data/mockData";
import {
  AppBadge,
  DashboardShell,
  HeaderBrand,
  LinearProgress,
  MetricTile,
  SectionEyebrow,
  SurfaceCard,
} from "./ui";

function ForecastChart({ series }) {
  const width = 720;
  const height = 260;
  const padding = 24;
  const maxY = Math.max(...series.flatMap((point) => [point.demand, point.supply])) + 10;

  const toX = (index) =>
    padding + (index * (width - padding * 2)) / Math.max(series.length - 1, 1);
  const toY = (value) =>
    height - padding - ((value - 0) / maxY) * (height - padding * 2);

  const line = (key) =>
    series
      .map((point, index) => `${index === 0 ? "M" : "L"} ${toX(index)} ${toY(point[key])}`)
      .join(" ");

  return (
    <div className="rounded-[28px] border border-border/60 bg-white p-5">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <SectionEyebrow>Predictive forecast</SectionEyebrow>
          <h3 className="mt-1 font-display text-4xl font-extrabold tracking-tight">
            Arrival Wave Analysis
          </h3>
        </div>
        <div className="flex gap-4 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#154aa8]" />
            Demand forecast
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-slate-300" />
            Holding supply
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {Array.from({ length: 4 }).map((_, index) => {
          const y = padding + (index * (height - padding * 2)) / 3;
          return <line key={y} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e6eaf0" />;
        })}
        <rect
          x={toX(3.2)}
          y={padding / 2}
          width={toX(4.7) - toX(3.2)}
          height={height - padding}
          fill="rgba(165, 28, 48, 0.06)"
          stroke="rgba(165, 28, 48, 0.15)"
        />
        <path d={line("supply")} fill="none" stroke="#cbd5e1" strokeDasharray="6 6" strokeWidth="4" />
        <path d={line("demand")} fill="none" stroke="#154aa8" strokeWidth="5" strokeLinecap="round" />
        {series.map((point, index) => (
          <g key={point.time}>
            <circle cx={toX(index)} cy={toY(point.demand)} r="5" fill="#154aa8" />
            <text x={toX(index)} y={height - 6} textAnchor="middle" fontSize="11" fill="#6b7280">
              {point.time}
            </text>
          </g>
        ))}
        <text
          x={toX(3.95)}
          y={height / 2}
          textAnchor="middle"
          fontSize="11"
          fill="#9f1239"
          transform={`rotate(90 ${toX(3.95)} ${height / 2})`}
        >
          CRITICAL DEFICIT WINDOW
        </text>
      </svg>
    </div>
  );
}

function TerminalTab({ value, children }) {
  return (
    <Tabs.Trigger
      value={value}
      className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
    >
      {children}
    </Tabs.Trigger>
  );
}

export default function OpsPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff5fb_0%,#f7f9fc_100%)] p-4 md:p-6">
      <DashboardShell>
        <div className="grid min-h-[900px] lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-border/70 bg-[#edf2f8] p-5 lg:border-b-0 lg:border-r">
            <HeaderBrand title="Terminal 1" subtitle="Precision dispatch" />

            <Tabs.Root defaultValue="t1" className="mt-8">
              <Tabs.List className="flex flex-wrap gap-2 rounded-full bg-white/70 p-1">
                <TerminalTab value="t1">T1</TerminalTab>
                <TerminalTab value="t2">T2</TerminalTab>
                <TerminalTab value="all">All</TerminalTab>
              </Tabs.List>
            </Tabs.Root>

            <div className="mt-8 space-y-3">
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left font-semibold text-primary shadow-sm">
                <CableCar className="h-4 w-4" />
                Live Monitoring
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-muted-foreground transition hover:bg-white/70">
                <BrainCircuit className="h-4 w-4" />
                AI Advisory
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold text-muted-foreground transition hover:bg-white/70">
                <UsersRound className="h-4 w-4" />
                Fleet Readiness
              </button>
            </div>

            <div className="mt-10 rounded-[28px] bg-white p-5">
              <SectionEyebrow>PWT guardrail</SectionEyebrow>
              <p className="mt-2 font-display text-4xl font-extrabold text-primary">10 min</p>
              <p className="mt-2 text-sm text-muted-foreground">
                AI interventions escalate when projected wait exceeds this threshold.
              </p>
            </div>

            <div className="mt-10 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4" />
                Documentation
              </div>
              <div className="flex items-center gap-3">
                <Settings2 className="h-4 w-4" />
                Support
              </div>
            </div>
          </aside>

          <main className="p-5 md:p-7">
            <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-center md:justify-between">
              <HeaderBrand title="Hello Ride Console" subtitle="Suvarnabhumi Airport · BKK" />
              <div className="flex items-center gap-3">
                <button type="button" className="rounded-2xl bg-white p-3 text-muted-foreground shadow-sm">
                  <Bell className="h-5 w-5" />
                </button>
                <button type="button" className="rounded-2xl bg-white p-3 text-muted-foreground shadow-sm">
                  <Settings2 className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
              <SurfaceCard className="rounded-[30px] bg-white p-6">
                <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                  <div className="flex flex-col items-center justify-center rounded-[30px] bg-[#fff8f8] p-5">
                    <div className="flex h-52 w-52 items-center justify-center rounded-full border-[14px] border-[#a30c12] border-r-[#f1d6d7] border-t-[#f1d6d7]">
                      <div className="text-center">
                        <p className="font-display text-5xl font-extrabold text-[#991b1b]">
                          {opsExperience.pwt}
                        </p>
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.24em] text-[#991b1b]">
                          PWT
                        </p>
                      </div>
                    </div>
                    <AppBadge tone="mt-4 bg-[#fee2e2] text-[#b91c1c]">Critical delay</AppBadge>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <MetricTile
                        label="Waiting pax"
                        value={opsExperience.waitingPassengers}
                        delta={opsExperience.waitingTrend}
                        tone="text-[#154aa8]"
                      />
                      <MetricTile
                        label="Holding taxis"
                        value={opsExperience.holdingTaxis}
                        delta={opsExperience.taxiTrend}
                      />
                    </div>
                    <div className="rounded-[24px] border border-border/70 bg-[#f8fafc] p-4">
                      <div className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
                        <span>Lane 1 high-capacity mode</span>
                        <span>System load {opsExperience.laneLoad}%</span>
                      </div>
                      <LinearProgress value={opsExperience.laneLoad} className="mt-3 h-3" indicatorClassName="bg-[#154aa8]" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <MetricTile label="Fleet readiness" value={`${opsExperience.fleetReadiness}%`} />
                      <MetricTile label="Projected deficit" value={`${opsExperience.projectedDeficit}%`} tone="text-[#b91c1c]" />
                    </div>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard className="rounded-[30px] border-0 bg-[linear-gradient(180deg,#c10d17_0%,#990c13_100%)] p-6 text-white shadow-[0_24px_60px_rgba(165,28,48,0.24)]">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-display text-2xl font-extrabold">Projected Deficit Alert</h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-white/80">
                  Arrival wave projected in T-15 minutes. Predicted passenger influx will exceed
                  current lane capacity by {opsExperience.projectedDeficit}%.
                </p>
                <div className="mt-6 rounded-[24px] border border-white/15 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-white/70">
                    <BrainCircuit className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-[0.22em]">AI Advisory</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold leading-7">{opsExperience.aiAdvice}</p>
                </div>
                <div className="mt-6 grid gap-3">
                  <button type="button" className="rounded-2xl bg-white px-4 py-3 font-bold text-[#a30c12]">
                    Activate Extra Lane
                  </button>
                  <button type="button" className="rounded-2xl border border-white/25 px-4 py-3 font-bold text-white">
                    Broadcast to Drivers
                  </button>
                </div>
              </SurfaceCard>
            </div>

            <div className="mt-6">
              <ForecastChart series={opsExperience.forecast} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <SurfaceCard className="rounded-[28px] bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <SectionEyebrow>Flight wave</SectionEyebrow>
                    <h3 className="mt-1 font-display text-2xl font-extrabold">Arrivals driving demand</h3>
                  </div>
                  <Plane className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-5 space-y-3">
                  {opsExperience.flights.map((flight) => (
                    <div key={flight.code} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">
                            {flight.code} · {flight.origin}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {flight.status} · {flight.terminal} · ETA {flight.eta}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-2xl font-extrabold text-primary">{flight.demand}</p>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            forecast pax
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard className="rounded-[28px] bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <SectionEyebrow>Demand capture</SectionEyebrow>
                    <h3 className="mt-1 font-display text-2xl font-extrabold">QR scans in the last 20 minutes</h3>
                  </div>
                  <Clock3 className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-5 space-y-3">
                  {opsExperience.demandSignals.map((signal) => (
                    <div key={`${signal.time}-${signal.zone}`} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{signal.zone}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{signal.time}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-foreground">{signal.parties} parties</p>
                          <p className="text-muted-foreground">{signal.luggage} bags</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard className="rounded-[28px] bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <SectionEyebrow>Supply telemetry</SectionEyebrow>
                    <h3 className="mt-1 font-display text-2xl font-extrabold">Driver response pulse</h3>
                  </div>
                  <UsersRound className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-5 space-y-3">
                  {opsExperience.supply.map((item) => (
                    <div key={item.name} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="mt-4 font-display text-3xl font-extrabold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            </div>
          </main>
        </div>
      </DashboardShell>
    </div>
  );
}
