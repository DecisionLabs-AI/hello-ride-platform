export default function IncentiveMessage({ message }) {
  return (
    <div className="bg-brand/10 border border-brand/30 rounded-2xl px-5 py-4 flex items-center gap-3">
      <span className="text-xl">⚡</span>
      <p className="text-sm text-brand font-semibold">{message}</p>
    </div>
  );
}
