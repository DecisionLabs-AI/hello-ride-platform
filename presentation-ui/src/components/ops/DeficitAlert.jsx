export default function DeficitAlert({ deficit, breakdown }) {
  return (
    <div className="bg-danger/10 border border-danger/30 rounded-2xl p-5 flex flex-col gap-4 h-full">
      <div>
        <p className="text-xs text-danger/80 uppercase tracking-widest font-medium">Projected Deficit</p>
        <p className="text-4xl font-bold text-danger mt-1">{deficit}%</p>
        <p className="text-xs text-muted mt-1">Peak window: 14:30 – 15:00</p>
      </div>

      <div>
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">Breakdown</p>
        <ul className="flex flex-col gap-2">
          {breakdown.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-2 text-xs">
              <span className="text-slate-300">{item.factor}</span>
              <span
                className={`font-semibold shrink-0 ${
                  item.type === "demand" ? "text-danger" : "text-blue-300"
                }`}
              >
                {item.impact}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
