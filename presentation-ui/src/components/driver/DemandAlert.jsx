import Badge from "../shared/Badge.jsx";

export default function DemandAlert({ alert }) {
  return (
    <div className="bg-danger/8 border border-danger/25 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted uppercase tracking-widest font-medium">Demand Alert</p>
        <Badge
          label={alert.intensity + " Demand"}
          tone={alert.intensity === "High" ? "danger" : "warning"}
        />
      </div>
      <p className="text-sm font-semibold text-white mb-1">Wave at {alert.wave}</p>
      <p className="text-sm text-slate-400">{alert.note}</p>
    </div>
  );
}
