export default function ETicket({ ticket, destination }) {
  return (
    <div className="bg-card border border-brand/30 rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-xs bg-brand/20 text-brand px-2.5 py-1 rounded-full font-semibold">
          Booking Confirmed
        </span>
        <span className="text-xs text-muted font-mono">{ticket.bookingId}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-medium mb-1">Pickup</p>
          <p className="text-sm text-white">{ticket.lane}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-medium mb-1">Destination</p>
          <p className="text-sm text-white">{destination}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-medium mb-1">Driver</p>
          <p className="text-sm text-white">{ticket.driver}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-medium mb-1">Vehicle</p>
          <p className="text-sm text-white">{ticket.vehicle}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-medium mb-1">Plate</p>
          <p className="text-sm font-mono text-white">{ticket.plate}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-medium mb-1">ETA</p>
          <p className="text-2xl font-bold text-brand">{ticket.eta}</p>
        </div>
      </div>

      <p className="text-xs text-muted text-center border-t border-white/10 pt-4">
        Please proceed to {ticket.lane} · Your driver is on the way
      </p>
    </div>
  );
}
