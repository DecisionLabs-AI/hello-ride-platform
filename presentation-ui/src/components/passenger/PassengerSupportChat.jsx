import { useState, useRef, useEffect } from "react";

const CHIPS = [
  { label: "Pickup point",       text: "Where is my pickup zone?" },
  { label: "Luggage support",    text: "I have large luggage" },
  { label: "Special assistance", text: "I need special assistance" },
  { label: "Change destination", text: "I want to change my destination" },
  { label: "Contact staff",      text: "How do I contact airport staff?" },
];

function getBotResponse(msg) {
  const m = msg.toLowerCase();
  if (m.includes("pickup") || m.includes("zone"))
    return "Your pickup point is Pickup Zone C2 at Suvarnabhumi Airport, Terminal 1. Follow the taxi pickup signs after baggage claim.";
  if (m.includes("luggage") || m.includes("bag"))
    return "For large luggage, please update your luggage count before confirming. The system will recommend a larger vehicle if needed.";
  if (
    m.includes("wheelchair") || m.includes("assistance") ||
    m.includes("help") || m.includes("staff") || m.includes("contact")
  )
    return "We can flag your request for special assistance. Airport staff will be notified before pickup.";
  if (m.includes("destination") || m.includes("change"))
    return "You can update your destination before confirming pickup. After confirmation, please contact staff for changes.";
  return "I can help with pickup point, luggage, special assistance, or destination changes.";
}

export default function PassengerSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 320);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function send(text) {
    const t = text.trim();
    if (!t) return;
    setMessages((prev) => [...prev, { role: "user", text: t }]);
    setInputValue("");
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "bot", text: getBotResponse(t) }]);
    }, 400);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(inputValue);
    }
  }

  return (
    <>
      {/* FAB — absolute so it's scoped to the phone shell, not the viewport */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open support chat"
        className={`absolute bottom-24 right-5 z-50 w-12 h-12 rounded-full bg-white border border-brand/15
          shadow-[0_10px_26px_rgba(15,23,42,0.14),0_2px_8px_rgba(21,74,168,0.08)]
          flex items-center justify-center
          hover:scale-105 active:scale-95 transition-all duration-150
          ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <span className="material-symbols-outlined text-brand text-[1.35rem]">support_agent</span>
      </button>

      {/* Backdrop — absolute inset-0 covers exactly the phone shell */}
      <div
        className={`absolute inset-0 z-50 bg-slate-900/35 transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Bottom sheet — absolute bottom-0, always mounted for smooth slide-out.
          The shell's overflow:hidden clips the translate-y-full state invisibly. */}
      <div
        className={`absolute bottom-0 inset-x-0 z-50 transition-transform duration-300 ease-out
          ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* No max-w-md needed — the shell is already max-w-md */}
        <div className="flex h-[70vh] max-h-[70vh] min-h-0 flex-col overflow-hidden rounded-t-3xl border-t border-slate-200 bg-[#f5f8fb] shadow-[0_-8px_40px_rgba(15,23,42,0.16)]">

          {/* Header */}
          <div className="flex-none border-b border-slate-200/70 bg-[#f5f8fb] px-5 pb-3 pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[1.05rem] font-extrabold text-[#1a2b5e] leading-tight">Hello Ride Support</p>
                <p className="text-xs text-muted mt-0.5">Airport pickup assistance</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close support chat"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain py-4 pl-4 pr-2">
            {messages.length === 0 ? (
              <p className="text-xs text-muted text-center m-auto py-4">
                Hi! How can we help with your airport pickup?
              </p>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
                      msg.role === "user"
                        ? "bg-brand text-white rounded-br-[0.3rem]"
                        : "bg-white text-slate-900 border border-slate-200/80 shadow-sm rounded-bl-[0.3rem]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips */}
          <div className="flex-none overflow-hidden bg-[#f5f8fb]">
            <div
              className="flex gap-2 overflow-x-auto px-4 pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => send(chip.text)}
                  className="shrink-0 whitespace-nowrap rounded-full border border-brand-mid/25 bg-brand-mid/10 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-mid/20 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input row */}
          <div className="flex-none border-t border-slate-200/70 bg-[#f5f8fb] px-4 pb-5 pt-2">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                autoComplete="off"
                className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-all"
              />
              <button
                onClick={() => send(inputValue)}
                aria-label="Send"
                className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shrink-0 hover:bg-brand-deep active:scale-90 transition-all"
              >
                <span className="material-symbols-outlined text-white text-[1.1rem]">send</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
