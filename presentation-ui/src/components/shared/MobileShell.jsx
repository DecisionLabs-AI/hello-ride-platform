export function HelloRideWordmark({ size = "md" }) {
  const textSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <div className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-brand-mid shadow-[0_0_0_4px_rgba(0,177,79,0.12)]" />
      <span className={`${textSize} font-black text-brand font-headline tracking-normal leading-none`}>
        Hello Ride
      </span>
    </div>
  );
}

export function MobileShell({ children, className = "" }) {
  return (
    <div className="mx-auto w-full max-w-[420px] px-3 py-3 sm:py-5">
      <div
        className={`relative h-[calc(100vh-76px)] max-h-[860px] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[#f5f8fb] shadow-[0_24px_70px_rgba(15,35,68,0.16)] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function MobileScrollArea({ children, className = "" }) {
  return (
    <div className={`h-full overflow-y-auto px-5 py-4 ${className}`}>
      {children}
    </div>
  );
}
