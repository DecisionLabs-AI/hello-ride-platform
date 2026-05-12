export default function VehicleCard({ vehicle, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(vehicle.id)}
      className={`w-full text-left rounded-2xl p-4 border transition-all ${
        selected
          ? "border-brand bg-brand/10"
          : "border-white/10 bg-white/5 hover:border-white/25"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white text-sm">{vehicle.label}</p>
          <p className="text-xs text-muted mt-0.5">{vehicle.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-bold text-sm ${selected ? "text-brand" : "text-white"}`}>
            {vehicle.price}
          </p>
          <p className="text-xs text-muted">{vehicle.eta}</p>
        </div>
      </div>
      <p className="text-xs text-muted mt-2">{vehicle.capacity}</p>
    </button>
  );
}
