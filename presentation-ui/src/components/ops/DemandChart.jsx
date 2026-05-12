export default function DemandChart({ series }) {
  const W = 560;
  const H = 200;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 32;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const allValues = series.flatMap((d) => [d.demand, d.supply]);
  const maxVal = Math.max(...allValues, 1);

  const xStep = innerW / (series.length - 1);
  const toX = (i) => padL + i * xStep;
  const toY = (v) => padT + innerH - (v / maxVal) * innerH;

  const demandPoints = series.map((d, i) => `${toX(i)},${toY(d.demand)}`).join(" ");
  const supplyPoints = series.map((d, i) => `${toX(i)},${toY(d.supply)}`).join(" ");

  // Gap polygon (area between demand and supply where demand > supply)
  const gapPoints = [
    ...series.map((d, i) => `${toX(i)},${toY(Math.max(d.demand, d.supply))}`),
    ...series
      .slice()
      .reverse()
      .map((d, i) => `${toX(series.length - 1 - i)},${toY(d.supply)}`),
  ].join(" ");

  return (
    <div className="bg-card rounded-2xl p-5">
      <p className="text-xs text-muted uppercase tracking-widest font-medium mb-3">
        Demand vs Supply Forecast
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        aria-label="Demand vs supply forecast chart"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}

        {/* Gap fill (demand > supply) */}
        <polygon points={gapPoints} fill="rgba(213,75,114,0.15)" />

        {/* Supply line */}
        <polyline
          points={supplyPoints}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Demand line */}
        <polyline
          points={demandPoints}
          fill="none"
          stroke="#00b14f"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* X-axis labels */}
        {series.map((d, i) => (
          <text
            key={i}
            x={toX(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#94a3b8"
          >
            {d.time}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block w-3 h-0.5 bg-brand rounded" />
          Demand
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block w-3 h-0.5 bg-blue-400 rounded" />
          Supply
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block w-3 h-2 rounded" style={{ background: "rgba(213,75,114,0.35)" }} />
          Gap
        </div>
      </div>
    </div>
  );
}
