import * as Avatar from "@radix-ui/react-avatar";
import * as Progress from "@radix-ui/react-progress";
import * as Separator from "@radix-ui/react-separator";
import { ArrowUpRight, PlaneLanding } from "lucide-react";
import { cn } from "../lib/utils";

export function AppBadge({ children, tone = "bg-white/12 text-white", className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
        tone,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SurfaceCard({ className, children }) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/60 bg-card/85 p-5 shadow-panel backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionEyebrow({ children }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
      {children}
    </p>
  );
}

export function MetricTile({
  label,
  value,
  delta,
  tone = "text-foreground",
  className,
}) {
  return (
    <div className={cn("rounded-[24px] border border-border/70 bg-white/70 p-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className={cn("font-display text-3xl font-extrabold", tone)}>{value}</p>
        {delta ? <p className="text-sm font-semibold text-muted-foreground">{delta}</p> : null}
      </div>
    </div>
  );
}

export function LinearProgress({ value, className, indicatorClassName }) {
  return (
    <Progress.Root
      value={value}
      className={cn("relative h-2.5 overflow-hidden rounded-full bg-slate-200/80", className)}
    >
      <Progress.Indicator
        className={cn("h-full rounded-full bg-primary transition-transform", indicatorClassName)}
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </Progress.Root>
  );
}

export function Divider({ className }) {
  return <Separator.Root className={cn("h-px bg-border/80", className)} decorative />;
}

export function PhoneShell({ tone = "passenger", children }) {
  const toneStyles = {
    passenger:
      "from-[#e8fff1] via-[#f8fbf8] to-[#eef4ff] before:bg-[radial-gradient(circle_at_top,_rgba(0,177,79,0.16),_transparent_55%)]",
    driver:
      "from-[#102316] via-[#142b1d] to-[#213540] text-white before:bg-[radial-gradient(circle_at_top,_rgba(8,255,130,0.18),_transparent_52%)]",
  };

  return (
    <div
      className={cn(
        "relative mx-auto min-h-[820px] w-full max-w-[390px] overflow-hidden rounded-[40px] border border-white/30 bg-gradient-to-b p-4 shadow-glow before:absolute before:inset-0 before:opacity-90 before:content-['']",
        toneStyles[tone],
      )}
    >
      <div className="absolute inset-0 bg-runway-grid bg-[size:26px_26px] opacity-40" />
      <div className="relative z-10 flex min-h-full flex-col">{children}</div>
    </div>
  );
}

export function DashboardShell({ children }) {
  return (
    <div className="rounded-[32px] border border-white/60 bg-white/80 shadow-panel backdrop-blur-xl">
      {children}
    </div>
  );
}

export function UserAvatar({ name, className }) {
  const initials =
    (name ?? "")
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "?";

  return (
    <Avatar.Root
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-primary/15",
        className,
      )}
    >
      <Avatar.Fallback className="font-display text-sm font-bold text-primary">
        {initials}
      </Avatar.Fallback>
    </Avatar.Root>
  );
}

export function HeaderBrand({ title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <PlaneLanding className="h-5 w-5" />
      </div>
      <div>
        <h1 className="font-display text-xl font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export function LinkArrow() {
  return <ArrowUpRight className="h-4 w-4" />;
}
