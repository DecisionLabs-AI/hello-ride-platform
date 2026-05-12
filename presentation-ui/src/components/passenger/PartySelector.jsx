function Counter({ label, value, onChange, min = 0, max = 9 }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-sm font-bold"
        >
          −
        </button>
        <span className="text-white font-semibold w-4 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-sm font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function PartySelector({ passengers, luggage, onPassengers, onLuggage }) {
  return (
    <div className="flex flex-col gap-2">
      <Counter label="Passengers" value={passengers} onChange={onPassengers} min={1} max={6} />
      <Counter label="Luggage bags" value={luggage} onChange={onLuggage} min={0} max={8} />
    </div>
  );
}
