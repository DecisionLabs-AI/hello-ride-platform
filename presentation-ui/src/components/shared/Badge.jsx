export default function Badge({ label, tone = "brand" }) {
  const toneClasses = {
    brand: "bg-brand/20 text-brand border border-brand/30",
    danger: "bg-danger/20 text-danger border border-danger/30",
    ops: "bg-ops/20 text-blue-300 border border-ops/30",
    muted: "bg-white/10 text-muted border border-white/10",
    success: "bg-brand/20 text-brand border border-brand/30",
    warning: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${toneClasses[tone] ?? toneClasses.muted}`}
    >
      {label}
    </span>
  );
}
