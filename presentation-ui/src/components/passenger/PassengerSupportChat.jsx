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
  const msgsRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 320);
      return () => clearTimeout(t);
    }
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
        className={`absolute bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-white border border-[#00b14f]/25
          shadow-[0_4px_20px_rgba(0,177,79,0.22),0_2px_8px_rgba(0,0,0,0.08)]
          flex items-center justify-center
          hover:scale-105 active:scale-95 transition-all duration-150
          ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <span className="material-symbols-outlined text-[#006e2e] text-[1.5rem]">support_agent</span>
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
        <div className="bg-[#f8fafc] rounded-t-3xl shadow-[0_-8px_40px_rgba(15,23,42,0.16)] flex flex-col max-h-[80%]">

          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-slate-200/70 shrink-0">
            <div>
              <p className="text-[1.05rem] font-extrabold text-slate-900 leading-tight">Hello Ride Support</p>
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

          {/* Messages */}
          <div
            ref={msgsRef}
            className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5 min-h-28"
          >
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
                        ? "bg-[#00b14f] text-white rounded-br-[0.3rem]"
                        : "bg-white text-slate-900 border border-slate-200/80 shadow-sm rounded-bl-[0.3rem]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick chips */}
          <div
            className="flex gap-2 px-4 pb-2 overflow-x-auto shrink-0"
            style={{ scrollbarWidth: "none" }}
          >
            {CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => send(chip.text)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-[#00b14f]/10 border border-[#00b14f]/25 text-[#0c7d35] text-xs font-bold whitespace-nowrap hover:bg-[#00b14f]/20 transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex gap-2 items-center px-4 pt-2 pb-5 border-t border-slate-200/70 shrink-0 bg-[#f8fafc]">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              autoComplete="off"
              className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00b14f]/50 focus:ring-2 focus:ring-[#00b14f]/10 transition-all"
            />
            <button
              onClick={() => send(inputValue)}
              aria-label="Send"
              className="w-10 h-10 rounded-full bg-[#00b14f] flex items-center justify-center shrink-0 hover:bg-[#009942] active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined text-white text-[1.1rem]">send</span>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
