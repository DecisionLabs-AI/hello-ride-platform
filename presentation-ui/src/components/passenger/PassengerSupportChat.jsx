import { useState, useRef, useEffect } from "react";
import { matchProtocol } from "../../lib/protocolMatcher.js";

const ESCALATION_STORAGE_KEY = "helloride_activeEscalation";
const PASSENGER_MESSAGES_KEY = "helloride_passengerMessages";

const MENU_OPTIONS = [
  {
    id: "emergency",
    icon: "emergency_home",
    title: "Emergency / Safety",
    subtitle: "Urgent help from airport staff",
    triggerText: "ช่วยด้วย",
    iconColor: "text-red-500",
  },
  {
    id: "pickup",
    icon: "luggage",
    title: "Pickup / Luggage Help",
    subtitle: "Pickup point, driver, or baggage",
    triggerText: null,
    iconColor: "text-blue-500",
  },
  {
    id: "message",
    icon: "chat",
    title: "Message OPS Staff",
    subtitle: "Send a general message",
    triggerText: null,
    iconColor: "text-slate-500",
  },
];

const PICKUP_RESPONSE =
  "📍 Pickup Zone: Level 1, Gate 4 — Public Taxi Queue\n" +
  "สถานที่รับรถ: ชั้น 1 ประตู 4 คิวแท็กซี่สาธารณะ\n\n" +
  "🧳 Baggage belts: Claim Area B–D. Follow the green taxi signs after collecting your bags.\n" +
  "สายพานกระเป๋า: แถวรับกระเป๋า B–D ตามป้ายสีเขียวไปยังเคาน์เตอร์แท็กซี่";

function createPassengerEscalation(protocol, message) {
  const escalation = {
    id: `ESC-${Date.now()}`,
    protocolId: protocol.id,
    protocolName: protocol.name,
    severity: protocol.severity,
    sourceRole: "Passenger Support Chat",
    message,
    recommendedAction: protocol.recommendedAction,
    opsAction: protocol.opsAction,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(ESCALATION_STORAGE_KEY, JSON.stringify(escalation));
  window.dispatchEvent(new CustomEvent("helloride:activeEscalation", { detail: escalation }));
}

function recordPassengerMessage({ text, quickOption }) {
  const nextMessage = {
    id: `MSG-${Date.now()}`,
    timestamp: Date.now(),
    text,
    quickOption,
  };
  let messages = [];
  try {
    const stored = window.localStorage.getItem(PASSENGER_MESSAGES_KEY);
    messages = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(messages)) messages = [];
  } catch {
    messages = [];
  }
  const nextMessages = [...messages, nextMessage];
  window.localStorage.setItem(PASSENGER_MESSAGES_KEY, JSON.stringify(nextMessages));
  window.dispatchEvent(new CustomEvent("helloride:passengerMessages", { detail: nextMessages }));
}

function getMenuResponse(option) {
  if (option.id === "pickup") {
    recordPassengerMessage({
      text: "Pickup or luggage help requested",
      quickOption: option.title,
    });
    return PICKUP_RESPONSE;
  }

  if (option.id === "message") {
    recordPassengerMessage({
      text: "Passenger asked to message OPS staff",
      quickOption: option.title,
    });
    return "Airport OPS staff have received your message request. Please stay near the pickup zone so staff can assist if needed.";
  }

  const protocol = matchProtocol(option.triggerText);
  if (protocol) {
    recordPassengerMessage({
      text: option.triggerText,
      quickOption: option.title,
    });
    createPassengerEscalation(protocol, option.triggerText);
    const urgency = protocol.severity === "HIGH" ? "High / เร่งด่วน" : "Normal / ปกติ";
    return (
      "Received · Notifying staff · Please wait\n" +
      "รับทราบแล้ว · กำลังแจ้งเจ้าหน้าที่ · โปรดรอสักครู่\n\n" +
      `Priority: ${urgency}`
    );
  }
  return "We have received your request. Staff will be with you shortly.";
}

export default function PassengerSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showInput, setShowInput] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  function handleOption(option) {
    if (option.id === "message") {
      setShowInput(true);
      return;
    }
    const userLabel = option.title;
    setMessages((prev) => [...prev, { role: "user", text: userLabel }]);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "bot", text: getMenuResponse(option) }]);
    }, 400);
  }

  function handleSendMessage() {
    const text = input.trim();
    if (!text) return;
    recordPassengerMessage({
      text,
      quickOption: "Message OPS Staff",
    });
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "bot", text: "Airport OPS staff have received your message. Please stay near the pickup zone so staff can assist if needed." },
    ]);
    setInput("");
    setShowInput(false);
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open support menu"
        className={`absolute bottom-24 right-5 z-50 w-12 h-12 rounded-full bg-white border border-brand/15
          shadow-[0_10px_26px_rgba(15,23,42,0.14),0_2px_8px_rgba(21,74,168,0.08)]
          flex items-center justify-center
          hover:scale-105 active:scale-95 transition-all duration-150
          ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <span className="material-symbols-outlined text-brand text-[1.35rem]">support_agent</span>
      </button>

      {/* Backdrop */}
      <div
        className={`absolute inset-0 z-50 bg-slate-900/35 transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Bottom sheet */}
      <div
        className={`absolute bottom-0 inset-x-0 z-50 transition-transform duration-300 ease-out
          ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex max-h-[70vh] min-h-0 flex-col overflow-hidden rounded-t-3xl border-t border-slate-200 bg-slate-50 shadow-[0_-8px_40px_rgba(15,23,42,0.16)]">

          {/* Header */}
          <div className="flex-none border-b border-slate-200/70 bg-white px-5 pb-3 pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[1.05rem] font-extrabold text-[#1a2b5e] leading-tight">Passenger Support</p>
                <p className="text-xs text-muted mt-0.5">Airport pickup assistance</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close support menu"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-none bg-slate-50 px-5 pb-2 pt-3">
            <p className="text-base font-extrabold text-slate-900">How can we help?</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Choose a topic so our airport team can assist faster.
            </p>
          </div>

          {(messages.length > 0 || showInput) && (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-2">
              {messages.length > 0 && (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-brand text-white rounded-br-[0.3rem]"
                      : "bg-white text-slate-900 border border-slate-200/80 shadow-sm rounded-bl-[0.3rem]"
                  }`}>
                    {msg.text}
                  </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Menu rows */}
          <div className="flex-none bg-slate-50 px-4 pb-4 pt-2">
            <div className="flex flex-col gap-2">
              {MENU_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOption(option)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.99]"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 ${option.iconColor}`}>
                    <span className="material-symbols-outlined text-[19px]">{option.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold leading-tight text-slate-900">{option.title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{option.subtitle}</p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-slate-300">chevron_right</span>
                </button>
              ))}
            </div>
            {showInput && (
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  autoFocus
                  placeholder="Type your message..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors disabled:bg-slate-300"
                  aria-label="Send support message"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
