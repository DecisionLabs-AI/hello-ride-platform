export default function QueueStatus({ position, estimatedWait, total = 10 }) {
  const progress = Math.max(0, Math.min(100, ((total - position) / total) * 100));

  return (
    <div className="bg-card rounded-2xl p-5">
      <p className="text-xs text-muted uppercase tracking-widest font-medium mb-4">Queue Status</p>
      <div className="flex items-end gap-4 mb-4">
        <div>
          <p className="text-xs text-muted mb-1">Position</p>
          <p className="text-5xl font-bold text-white leading-none">#{position}</p>
        </div>
        <div className="pb-1">
          <p className="text-xs text-muted mb-1">Est. wait</p>
          <p className="text-2xl font-semibold text-brand">{estimatedWait}</p>
        </div>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted mt-2">{total - position} drivers ahead of you</p>
    </div>
  );
}
