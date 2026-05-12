export default function DestinationInput({ value, onChange, suggestions }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-muted uppercase tracking-widest font-medium">
        Where are you going?
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter destination..."
        className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-muted text-sm focus:outline-none focus:border-brand/60 transition-colors"
      />
      {!value && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onChange(s)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/8 text-muted hover:text-white hover:bg-white/15 border border-white/10 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
