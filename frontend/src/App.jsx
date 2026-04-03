import { ArrowRight, BrainCircuit, CarFront, LayoutDashboard, PlaneLanding } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import DriverPage from "./components/driver-page";
import OpsPage from "./components/ops-page";
import PassengerPage from "./components/passenger-page";
import { navigationCards } from "./data/mockData";
import { AppBadge, LinkArrow, SurfaceCard } from "./components/ui";

function LandingPage() {
  const icons = {
    passenger: PlaneLanding,
    driver: CarFront,
    ops: LayoutDashboard,
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(10,147,53,0.12),_transparent_30%),linear-gradient(180deg,#fbfffc_0%,#eef5ff_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-panel backdrop-blur-xl md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <AppBadge tone="bg-primary/10 text-primary">Hello Ride prototype</AppBadge>
              <h1 className="mt-5 font-display text-5xl font-extrabold tracking-tight text-foreground md:text-7xl">
                Predictive Dispatching + Signaling for Proactive Taxi Operations in BKK Airport
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                A frontend prototype for the three operating surfaces that matter most:
                passenger demand capture, driver dispatch readiness, and the ops control tower.
              </p>
            </div>
            <div className="rounded-[30px] border border-primary/15 bg-[linear-gradient(135deg,rgba(0,177,79,0.12),rgba(255,255,255,0.96))] p-6 lg:max-w-sm">
              <div className="flex items-center gap-3 text-primary">
                <BrainCircuit className="h-5 w-5" />
                <p className="text-sm font-bold uppercase tracking-[0.22em]">Design intent</p>
              </div>
              <p className="mt-4 text-base leading-7 text-foreground">
                Shift the airport queue from reactive dispatching to a signal-driven system that
                mobilizes supply before passengers reach the pickup curb.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {navigationCards.map((card) => {
              const Icon = icons[card.color];

              return (
                <NavLink key={card.path} to={card.path} className="group block">
                  <SurfaceCard className="h-full rounded-[30px] bg-white transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
                    <div className="flex items-center justify-between">
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <LinkArrow />
                    </div>
                    <p className="mt-5 text-sm font-bold uppercase tracking-[0.24em] text-primary">
                      {card.label}
                    </p>
                    <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground">
                      {card.title}
                    </h2>
                    <p className="mt-4 text-base leading-7 text-muted-foreground">{card.description}</p>
                  </SurfaceCard>
                </NavLink>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <NavLink
              to="/passenger"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/20"
            >
              Open prototype
              <ArrowRight className="h-4 w-4" />
            </NavLink>
            <p className="text-sm text-muted-foreground">
              Built for the next step: connect data, dispatch logic, and AI agents without changing the shell.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-8xl font-extrabold text-foreground/10">404</p>
      <p className="font-display text-2xl font-extrabold text-foreground">Page not found</p>
      <p className="text-base text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <NavLink
        to="/"
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/20"
      >
        Back to overview
        <ArrowRight className="h-4 w-4" />
      </NavLink>
    </div>
  );
}

function ShellNav() {
  const links = [
    { to: "/", label: "Overview" },
    { to: "/passenger", label: "Passenger" },
    { to: "/driver", label: "Driver" },
    { to: "/ops", label: "Ops" },
  ];

  return (
    <div className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
        <NavLink to="/" className="font-display text-2xl font-extrabold tracking-tight text-primary">
          Hello Ride
        </NavLink>
        <nav className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-slate-100"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ShellNav />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/passenger" element={<PassengerPage />} />
        <Route path="/driver" element={<DriverPage />} />
        <Route path="/ops" element={<OpsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
