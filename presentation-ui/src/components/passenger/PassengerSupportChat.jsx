import { useState, useRef, useEffect } from "react";
import { matchProtocol } from "../../lib/protocolMatcher.js";

const ESCALATION_STORAGE_KEY = "helloride_activeEscalation";

const MENU_OPTIONS = [
  {
    id: "emergency",
    icon: "🚨",
    title: "Emergency / Safety",
    subtitle: "ขอความช่วยเหลือด่วน",
    triggerText: "ช่วยด้วย",
    cardStyle: "border-red-200 bg-red-50 hover:bg-red-100",
    titleColor: "text-red-700",
    subtitleColor: "text-red-500",
  },
  {
    id: "health",
    icon: "🤒",
    title: "Health / Unwell",
    subtitle: "ผู้โดยสารไม่สบาย",
    triggerText: "ป่วย",
    cardStyle: "border-amber-200 bg-amber-50 hover:bg-amber-100",
    titleColor: "text-amber-700",
    subtitleColor: "text-amber-500",
  },
  {
    id: "pickup",
    icon: "📍",
    title: "Pickup & Luggage Info",
    subtitle: "จุดรับและข้อมูลกระเป๋า",
    triggerText: null,
    cardStyle: "border-blue-200 bg-blue-50 hover:bg-blue-100",
    titleColor: "text-blue-700",
    subtitleColor: "text-blue-500",
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

function getMenuResponse(option) {
  if (option.id === "pickup") return PICKUP_RESPONSE;

  const protocol = matchProtocol(option.triggerText);
  if (protocol) {
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
    const userLabel = `${option.icon} ${option.title} / ${option.subtitle}`;
    setMessages((prev) => [...prev, { role: "user", text: userLabel }]);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "bot", text: getMenuResponse(option) }]);
    }, 400);
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
        <div className="flex h-[70vh] max-h-[70vh] min-h-0 flex-col overflow-hidden rounded-t-3xl border-t border-slate-200 bg-[#f5f8fb] shadow-[0_-8px_40px_rgba(15,23,42,0.16)]">

          {/* Header */}
          <div className="flex-none border-b border-slate-200/70 bg-[#f5f8fb] px-5 pb-3 pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[1.05rem] font-extrabold text-[#1a2b5e] leading-tight">Support Menu</p>
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
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain py-4 pl-4 pr-2">
            {messages.length === 0 ? (
              <p className="text-xs text-muted text-center m-auto py-4">
                Select an option below / เลือกหัวข้อที่ต้องการความช่วยเหลือ
              </p>
            ) : (
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

          {/* Menu cards */}
          <div className="flex-none border-t border-slate-200/70 bg-[#f5f8fb] px-4 pb-5 pt-3 flex flex-col gap-2">
            {MENU_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOption(option)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.98] ${option.cardStyle}`}
              >
                <p className={`text-sm font-extrabold leading-tight ${option.titleColor}`}>
                  {option.icon} {option.title}
                </p>
                <p className={`text-xs mt-0.5 ${option.subtitleColor}`}>{option.subtitle}</p>
              </button>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
