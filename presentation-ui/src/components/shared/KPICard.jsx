export default function KPICard({ label, value, sub, tone = "default" }) {
  const valueColor =
    tone === "danger"
      ? "text-danger"
      : tone === "brand"
      ? "text-brand"
      : tone === "ops"
      ? "text-blue-300"
      : "text-white";

  return (
    <div className="bg-card rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-xs text-muted uppercase tracking-widest font-medium">{label}</p>
      <p className={`text-3xl font-bold leading-none mt-1 ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}
