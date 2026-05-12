export default function AIAdvisoryCard({ advisory }) {
  return (
    <div className="bg-card border border-brand/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded-full font-semibold">
          AI Advisory
        </span>
        <span className="text-xs text-muted">Hello Ride Intelligence</span>
      </div>

      <p className="text-sm text-slate-200 leading-relaxed mb-4">{advisory.summary}</p>

      <div>
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">
          Recommended Actions
        </p>
        <ul className="flex flex-col gap-2">
          {advisory.actions.map((action, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="text-brand mt-0.5 shrink-0">→</span>
              {action}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
