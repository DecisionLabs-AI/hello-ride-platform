import { useState } from "react";

export default function ActionButtons() {
  const [laneActivated, setLaneActivated] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  return (
    <div className="bg-card rounded-2xl p-5">
      <p className="text-xs text-muted uppercase tracking-widest font-medium mb-4">
        OPS Actions
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setLaneActivated(true)}
          disabled={laneActivated}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            laneActivated
              ? "bg-brand/20 text-brand border border-brand/40 cursor-default"
              : "bg-brand text-white hover:bg-brand-deep active:scale-95"
          }`}
        >
          {laneActivated ? "✓ Lane 2 Activated" : "Activate Lane 2"}
        </button>

        <button
          onClick={() => setBroadcastSent(true)}
          disabled={broadcastSent}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            broadcastSent
              ? "bg-ops/20 text-blue-300 border border-ops/40 cursor-default"
              : "bg-ops text-white hover:bg-blue-700 active:scale-95"
          }`}
        >
          {broadcastSent ? "✓ Broadcast Sent" : "Broadcast Drivers"}
        </button>
      </div>

      {(laneActivated || broadcastSent) && (
        <p className="text-xs text-brand mt-3">
          Actions logged · estimated PWT reduction: −4 min
        </p>
      )}
    </div>
  );
}
