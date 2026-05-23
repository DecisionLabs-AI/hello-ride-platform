import { useState, useEffect } from "react";
import { DRIVER, DEFAULT_CREDENTIALS } from "../data/mockDriver.js";
import { demandChartData, kpiSummary } from "../data/index.js";
import { HelloRideWordmark, MobileScrollArea, MobileShell } from "../components/shared/MobileShell.jsx";
import { useDemoMatching } from "../context/useDemoMatching.js";
import { OPS_ACTION, canRecommendIncentive, getPwtSeverity } from "../lib/businessLogic.js";
import { useLanguage } from "../context/useLanguage.js";

const D = DRIVER;

const FORECAST_HOURS = new Set([14, 16, 18, 20, 22, 0]);
const forecastBars = demandChartData
  .filter((item) => FORECAST_HOURS.has(item.hour))
  .map((item) => ({
    time: item.label,
    height: Math.min(Math.round((item.confirmedQR / 70) * 100), 100),
    type: item.avgWaitMin > 60 ? "peak" : item.avgWaitMin > 45 ? "surge" : "normal",
    label: item.avgWaitMin > 60 ? "ช่วงพีค" : item.avgWaitMin > 45 ? "ช่วงหนาแน่น" : null,
  }));

function fareLabel(activeTrip) {
  return `THB ${activeTrip.fareTHB}`;
}

function fullPickup(activeTrip) {
  return activeTrip.pickupGate;
}

function fullDestination(activeTrip) {
  return activeTrip.destinationName || activeTrip.selectedDestination || "ยังไม่ได้เลือกปลายทาง";
}

// ── Shared ─────────────────────────────────────────────────────────────────

function AppHeader({ isOnline, onLogout }) {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-50 flex items-center gap-3 px-5 py-3 bg-white/95 backdrop-blur border-b border-slate-100 -mx-5 mb-4">
      <div className="flex-1">
        <HelloRideWordmark />
      </div>
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isOnline ? "bg-brand-mid/15 text-brand" : "bg-slate-100 text-slate-500"
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-brand-mid" : "bg-slate-400"}`} />
        {isOnline ? t("driver.online") : t("driver.offline")}
      </div>
      <button onClick={onLogout} className="flex items-center justify-center hover:opacity-70 transition-opacity">
        <span className="material-symbols-outlined text-slate-500 text-2xl">account_circle</span>
      </button>
    </header>
  );
}

function InfoCard({ eyebrow, title, body, tone = "default" }) {
  const cardStyle = {
    driver: { wrap: "bg-brand/5 border border-brand/10 shadow-sm", accent: "bg-brand-mid", body: "text-slate-700" },
    danger: { wrap: "bg-red-50 border border-red-200 shadow-sm", accent: "bg-danger", body: "text-red-800" },
    neutral: { wrap: "bg-slate-50 border border-slate-200 shadow-sm", accent: "bg-slate-300", body: "text-slate-600" },
    default: { wrap: "bg-white border border-slate-200 shadow-sm", accent: "bg-transparent", body: "text-slate-600" },
  }[tone] ?? { wrap: "bg-white border border-slate-200 shadow-sm", accent: "bg-transparent", body: "text-slate-600" };

  return (
    <div className={`${cardStyle.wrap} rounded-2xl overflow-hidden`}>
      <div className={`h-0.5 ${cardStyle.accent}`} />
      <div className="p-5">
        {eyebrow && <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-1">{eyebrow}</p>}
        {title && <p className="text-base font-bold text-slate-900">{title}</p>}
        {body && <p className={`text-sm mt-1 ${cardStyle.body}`}>{body}</p>}
      </div>
    </div>
  );
}

function RouteTimeline({ pickup, pickupAddress, dropoff, dropoffAddress }) {
  return (
    <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
      <div className="flex gap-3">
        <div className="flex flex-col items-center pt-1">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-brand" />
          <div className="w-px flex-1 bg-slate-300 my-1" />
          <div className="w-2.5 h-2.5 rounded-sm bg-danger" />
        </div>
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <p className="text-sm font-semibold text-slate-900">{pickup}</p>
            <p className="text-xs text-muted">{pickupAddress}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{dropoff}</p>
            <p className="text-xs text-muted">{dropoffAddress}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Status Strip (onboarding progress) ────────────────────────────────────

function StatusStrip({ steps }) {
  const completed = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done)?.label ?? "เริ่มงาน";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-muted">
        ความคืบหน้า: {completed}/{steps.length} · ถัดไป: {next}
      </p>
    </div>
  );
}

// ── Login Screen ───────────────────────────────────────────────────────────

function LoginScreen({ onLogin, onRegister }) {
  const [username, setUsername] = useState(DEFAULT_CREDENTIALS.username);
  const [password, setPassword] = useState(DEFAULT_CREDENTIALS.password);
  const [error, setError] = useState("");

  function handleLogin() {
    if (!username || !password) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    onLogin();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-center pt-4 pb-2">
        <HelloRideWordmark size="lg" />
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_14px_36px_rgba(21,74,168,0.08)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-brand flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-white text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}>local_taxi</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-brand uppercase tracking-widest">ลงชื่อเข้าใช้สำหรับคนขับ</span>
            <p className="text-lg font-bold text-slate-900 leading-tight mt-0.5">ยินดีต้อนรับกลับ, พาร์ทเนอร์</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          เข้าสู่ระบบเพื่อออนไลน์ รับคิวสนามบิน และติดตามช่วงเวลาทำเงินที่ดีที่สุด
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-bold mb-2">ชื่อผู้ใช้</p>
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            placeholder="somchai.driver"
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          />
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-bold mb-2">รหัสผ่าน</p>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="กรอกรหัสผ่าน"
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          />
        </div>
      </div>

      {error && <p className="text-xs text-danger -mt-1">{error}</p>}

      <button
        onClick={handleLogin}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand to-brand-deep text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(21,74,168,0.28)] hover:shadow-[0_12px_28px_rgba(21,74,168,0.34)] active:scale-95 transition-all"
      >
        เข้าสู่ระบบ
      </button>

      <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-200 px-1.5 py-0.5 rounded">Demo</span>
        <span className="text-xs text-slate-500">driver_demo / 1234</span>
      </div>

      <button
        onClick={onRegister}
        className="w-full py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:border-brand/35 hover:text-brand hover:shadow-sm transition-all"
      >
        สมัครบัญชีพาร์ทเนอร์
      </button>
    </div>
  );
}

// ── Registration Screen ─────────────────────────────────────────────────────

function RegistrationScreen({ onBack, onLogin }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);

  const eligibility = ["สัญชาติไทย", "อายุ 18–70 ปี", "ไม่มีประวัติอาชญากรรม", "รถยนต์อายุไม่เกิน 9 ปี"];
  const documents = ["บัตรประชาชน", "ทะเบียนรถ", "ประกันภัย / พ.ร.บ.", "ใบขับขี่", "สมุดบัญชีธนาคาร"];

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between py-3 mb-2">
          <button onClick={onLogin} className="text-sm text-slate-500 hover:text-slate-900">← เข้าสู่ระบบ</button>
          <HelloRideWordmark size="sm" />
          <div className="w-16" />
        </div>
        <InfoCard eyebrow="สถานะใบสมัคร" title="เกือบเสร็จแล้ว พาร์ทเนอร์" body="ทำการฝึกอบรมให้เสร็จเพื่อเริ่มงาน" tone="driver" />
        <StatusStrip
          steps={[
            { label: "ยื่นใบสมัคร", done: true },
            { label: "ตรวจสอบ", done: false },
            { label: "ฝึกอบรม", done: false },
            { label: "ตรวจสอบประวัติ", done: false },
            { label: "เริ่มงาน", done: false },
          ]}
        />
        <InfoCard eyebrow="ตรวจสอบเอกสาร" title="รีวิวการตรวจสอบ" body="ประมาณ 3-7 วัน" />
        <InfoCard eyebrow="การเรียนรู้ Academy" title="ความคืบหน้าการฝึกอบรม" body="เสร็จ 2/5 บทเรียน" />
        <button onClick={onLogin} className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand to-brand-deep text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(21,74,168,0.28)] active:scale-95 transition-all">
          กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between py-3 mb-2">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-900">← กลับ</button>
        <HelloRideWordmark size="sm" />
        <button onClick={onLogin} className="text-sm text-slate-500 hover:text-slate-900">เข้าสู่ระบบ</button>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900">ขับรถกับ Hello Ride</h2>
        <p className="text-sm text-muted mt-1">
          เข้าร่วมเครือข่ายสหกรณ์แท็กซี่สุวรรณภูมิ กรอกข้อมูลเพื่อเริ่มกระบวนการสมัคร
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {[
          { key: "firstName", label: "ชื่อ", placeholder: "สมชาย" },
          { key: "lastName", label: "นามสกุล", placeholder: "ใจดี" },
          { key: "phone", label: "เบอร์โทรศัพท์", placeholder: "+66 081 234 5678" },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">{label}</p>
            <input
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all shadow-sm"
            />
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">เกณฑ์คุณสมบัติ</p>
        <div className="grid grid-cols-2 gap-1.5">
          {eligibility.map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="text-brand">✓</span> {item}
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-muted uppercase tracking-widest font-medium mb-2">เอกสารที่ต้องใช้</p>
        <div className="flex flex-col gap-1.5">
          {documents.map((doc) => (
            <div key={doc} className="flex justify-between text-xs">
              <span className="text-slate-700">{doc}</span>
              <span className="text-muted">รอการอัปโหลด</span>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => setSubmitted(true)}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand to-brand-deep text-white font-headline font-extrabold text-base shadow-[0_8px_24px_rgba(21,74,168,0.28)] active:scale-95 transition-all"
      >
        ดำเนินการสมัครต่อ
      </button>
      <p className="text-xs text-muted text-center">ต้องการความช่วยเหลือ? แชทกับเราตลอด 24 ชั่วโมง หรือโทรในเวลาทำการ</p>
    </div>
  );
}

// ── Forecast Bars ──────────────────────────────────────────────────────────

function ForecastBars({ bars }) {
  const colors = { normal: "bg-brand/50", surge: "bg-amber-400", peak: "bg-danger" };
  return (
    <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
      <div className="h-0.5 bg-brand" />
      <div className="p-5">
        <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-0.5">พยากรณ์ความต้องการวันนี้</p>
        <p className="text-sm text-slate-600 mb-4">แนวโน้มความหนาแน่นของคิว</p>
        <div className="flex gap-1 px-3 mb-1">
          {bars.map((bar, i) => (
            <div key={i} className="flex-1 flex justify-center h-4">
              {bar.label && <span className="text-xs text-amber-600 font-semibold leading-none">{bar.label}</span>}
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1 px-3 bg-slate-50 rounded-xl" style={{ height: '88px' }}>
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-lg ${colors[bar.type]}`}
              style={{ height: `${bar.height}%` }}
            />
          ))}
        </div>
        <div className="flex gap-1 px-3 mt-1">
          {bars.map((bar, i) => (
            <div key={i} className="flex-1 flex justify-center">
              <span className="text-xs text-muted">{bar.time}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">ช่วงเวลาที่ดีที่สุด: 18:00–20:00 ความต้องการสูงสุด</p>
      </div>
    </div>
  );
}

// ── Driver Workspace ───────────────────────────────────────────────────────

function DriverMetric({ label, value, tone = "default" }) {
  const toneClass = tone === "brand" ? "text-brand" : tone === "danger" ? "text-danger" : "text-[#1a2b5e]";

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 text-xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-gradient-to-r from-brand to-brand-deep py-4 text-base font-black text-white shadow-[0_10px_24px_rgba(21,74,168,0.28)] transition-all active:scale-95 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 active:scale-95"
    >
      {children}
    </button>
  );
}

function StatusToggle({ isOnline, onToggle }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">{t("driver.driverStatus")}</p>
          <p className="mt-0.5 text-xl font-black text-slate-900">{isOnline ? `${t("driver.online")}, สมชาย` : t("driver.offline")}</p>
          <p className="mt-1 text-xs text-muted">ยืนยันตัวตนแล้ว · มีสิทธิ์เข้าคิวสนามบิน</p>
        </div>
        <button
          onClick={onToggle}
          className={`relative h-10 w-[68px] shrink-0 rounded-full transition-colors ${isOnline ? "bg-brand-mid" : "bg-slate-200"}`}
          aria-label={isOnline ? "ออฟไลน์" : "ออนไลน์"}
        >
          <span className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition-all ${isOnline ? "left-[32px]" : "left-1"}`} />
        </button>
      </div>
    </div>
  );
}

function DemandTeasers() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-[#154aa8]/10 bg-[#e8f0fe] p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#154aa8]">ความต้องการ</p>
        <p className="mt-1 text-sm font-bold text-slate-900">ต้องการรถ 50+ คัน</p>
        <p className="mt-0.5 text-xs text-muted">จุดบริการแท็กซี่สาธารณะ ชั้น 1</p>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-brand">โบนัส</p>
        <p className="mt-1 text-sm font-bold text-slate-900">มีโบนัส 450 บาท</p>
        <p className="mt-0.5 text-xs text-muted">ช่วงเวลาคิวสนามบิน</p>
      </div>
    </div>
  );
}

function QueueHome({ isOnline, onOnlineToggle, inQueue, onJoinQueue, showIncentive }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-4">
      <StatusToggle isOnline={isOnline} onToggle={onOnlineToggle} />

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">{t("driver.airportQueue")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <DriverMetric label={inQueue ? t("driver.queuePosition") : t("driver.airportQueue")} value={inQueue ? `#${D.queue.position}` : "--"} />
          <DriverMetric label={t("driver.expectedWait")} value={inQueue ? `${D.queue.waitMin} นาที` : "--"} />
        </div>
        <div className="mt-4">
          {!inQueue ? (
            <PrimaryButton onClick={onJoinQueue} disabled={!isOnline}>{t("driver.acceptNext")}</PrimaryButton>
          ) : (
            <div className="rounded-2xl border border-[#154aa8]/15 bg-[#e8f0fe] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">Waiting for airport dispatch</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    You are online and eligible. The next assigned airport job will appear here.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#154aa8] shadow-sm">
                  Waiting
                </span>
              </div>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          {isOnline
            ? inQueue ? "รอบริเวณชั้น 1 ประตู 4 เพื่อรับการ dispatch จากระบบ" : "เข้าร่วมคิวเพื่อรับงานรับส่งผู้โดยสาร"
            : "เปิดออนไลน์เพื่อเข้าร่วมคิว"}
        </p>
      </div>

      {showIncentive && <DemandTeasers />}
      <ForecastBars bars={forecastBars} />
    </div>
  );
}

// ── Countdown Timer Ring ───────────────────────────────────────────────────

function TimerRing({ seconds, total = 12 }) {
  const progress = seconds / total;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const progressLen = circ * progress;
  const isLow = seconds <= 3;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={isLow ? "#dc2626" : "#00a36c"} strokeWidth="8"
          strokeDasharray={`${progressLen} ${circ - progressLen}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
        />
        <text x="55" y="51" textAnchor="middle" fontSize="26" fontWeight="bold"
          fill={isLow ? "#dc2626" : "#0f172a"} fontFamily="system-ui">
          {seconds}
        </text>
        <text x="55" y="67" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="system-ui">
          วินาที
        </text>
      </svg>
      <p className="text-xs text-muted">กรุณายืนยันก่อนหมดเวลา</p>
    </div>
  );
}

// ── Job Request Screen ─────────────────────────────────────────────────────

function JobOfferHome({ activeTrip, onAccept, onReject }) {
  const { t } = useLanguage();
  const [seconds, setSeconds] = useState(12);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-brand/10 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-brand">{t("driver.newJobOffer")}</p>
            <p className="font-headline font-black text-3xl text-brand">{fareLabel(activeTrip)}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{activeTrip.passengerName}</p>
            <p className="text-xs text-muted">สหกรณ์แท็กซี่สุวรรณภูมิ · แจ้งเตือนอัตโนมัติ</p>
          </div>
          <TimerRing seconds={seconds} total={12} />
        </div>

        <RouteTimeline
          pickup={fullPickup(activeTrip)}
          pickupAddress={activeTrip.pickupAddress}
          dropoff={fullDestination(activeTrip)}
          dropoffAddress={activeTrip.destinationArea}
        />

        <div className="mt-4 grid grid-cols-3 gap-2">
          <DriverMetric label="เวลาถึง" value={`${activeTrip.etaMin} นาที`} />
          <DriverMetric label="ผู้โดยสาร" value={activeTrip.passengerCount} />
          <DriverMetric label="กระเป๋า" value={activeTrip.luggageCount} />
        </div>
        <p className="mt-4 rounded-2xl bg-brand/5 p-3 text-xs leading-relaxed text-slate-600">{activeTrip.matchingReason}</p>
        <div className="mt-5 flex flex-col gap-2">
          <PrimaryButton onClick={onAccept}>{t("driver.acceptJob")}</PrimaryButton>
          <SecondaryButton onClick={onReject}>{t("driver.reject")}</SecondaryButton>
        </div>
      </div>
    </div>
  );
}

function NavigationHome({ activeTrip, onArrived }) {
  const { t } = useLanguage();
  return (
    <div className="-mx-5 -mb-4 -mt-4 flex min-h-[calc(100vh-164px)] flex-col bg-[#edf3f7]">
      <div className="relative h-[300px] overflow-hidden bg-[#e7efed]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(0,177,79,0.12),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(21,74,168,0.10),transparent_30%),linear-gradient(135deg,#edf4f2_0%,#e7eef4_100%)]" />
        <div className="absolute -left-12 top-16 h-20 w-[520px] rotate-[-18deg] rounded-full bg-white/85 shadow-sm" />
        <div className="absolute left-2 top-[156px] h-16 w-[460px] rotate-[14deg] rounded-full bg-white/85 shadow-sm" />
        <div className="absolute left-32 -top-14 h-[390px] w-16 rotate-[8deg] rounded-full bg-white/80 shadow-sm" />
        <div className="absolute right-[-72px] top-36 h-20 w-[360px] rotate-[-32deg] rounded-full bg-white/65 shadow-sm" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 390 300" aria-hidden="true">
          <path
            d="M 88 224 C 124 188, 132 145, 180 132 S 250 116, 286 72"
            fill="none"
            stroke="#154aa8"
            strokeWidth="13"
            strokeLinecap="round"
            opacity="0.14"
          />
          <path
            d="M 88 224 C 124 188, 132 145, 180 132 S 250 116, 286 72"
            fill="none"
            stroke="#154aa8"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute left-[68px] top-[204px] flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-4 ring-white">
          <span className="material-symbols-outlined text-[24px]">navigation</span>
        </div>
        <div className="absolute right-[76px] top-[46px] flex h-12 w-12 items-center justify-center rounded-full bg-danger text-white shadow-lg ring-4 ring-white">
          <span className="material-symbols-outlined text-[25px]">location_on</span>
        </div>
        <div className="absolute left-5 top-5 rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-sm font-black leading-none text-slate-900">{activeTrip.etaMin} นาที · 200 เมตร ถึงจุดรับผู้โดยสาร</p>
          <p className="mt-1 text-xs leading-none text-slate-500">{activeTrip.pickupGate}</p>
        </div>
      </div>

      <div className="relative -mt-7 flex-1 rounded-t-[2rem] bg-white px-5 pb-6 pt-5 shadow-[0_-18px_42px_rgba(15,35,68,0.16)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />

        <p className="text-xs font-black uppercase tracking-widest text-brand">การนำทาง</p>
        <h2 className="mt-1 text-2xl font-black leading-snug text-slate-900">{t("driver.headPickup")}</h2>
        <p className="mt-1 text-sm text-muted">{activeTrip.etaMin} นาที ถึง {activeTrip.pickupGate}</p>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-1">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-brand flex-shrink-0" />
              <div className="w-px flex-1 bg-slate-200 my-1.5" />
              <div className="w-2.5 h-2.5 rounded-sm bg-danger flex-shrink-0" />
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">จุดรับ</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{activeTrip.pickupGate}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{activeTrip.pickupAddress}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">ปลายทาง</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{fullDestination(activeTrip)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-slate-400 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{activeTrip.passengerName}</p>
            <p className="text-xs text-muted">{activeTrip.passengerCount} คน · {activeTrip.luggageCount} กระเป๋า</p>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <button className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined text-[17px]">chat</span>
            ข้อความ
          </button>
          <button className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined text-[17px]">call</span>
            โทร
          </button>
        </div>

        <div className="mt-3">
          <PrimaryButton onClick={onArrived}>{t("driver.arrivedPickup")}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function TripInProgressHome({ activeTrip, onComplete }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-4">
      <InfoCard
        eyebrow="กำลังเดินทาง"
        title={`มุ่งหน้าไป ${fullDestination(activeTrip)}`}
        body={`${activeTrip.distanceKM} กม. · ประมาณ ${activeTrip.tripTimeMin} นาที`}
        tone="driver"
      />
      <RouteTimeline
        pickup={fullPickup(activeTrip)}
        pickupAddress={activeTrip.pickupAddress}
        dropoff={fullDestination(activeTrip)}
        dropoffAddress={activeTrip.destinationArea}
      />
      <InfoCard
        eyebrow="ผู้โดยสาร"
        title={activeTrip.passengerName}
        body={`${activeTrip.passengerCount} คน · ${activeTrip.luggageCount} กระเป๋า`}
        tone="neutral"
      />
      <PrimaryButton onClick={onComplete}>{t("driver.completeTrip")}</PrimaryButton>
    </div>
  );
}

function CompletedTripHome({ activeTrip, onConfirmPayment }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-brand px-5 py-7 text-center text-white shadow-lg">
        <span className="material-symbols-outlined mb-2 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        <p className="font-headline text-2xl font-black">{t("driver.tripComplete")}</p>
        <p className="mt-1 text-sm text-white/80">{activeTrip.paymentStatus}</p>
      </div>
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">สรุปค่าโดยสาร</p>
        {[
          [`ค่าโดยสารรวม`, fareLabel(activeTrip), true],
          [`ระยะทาง (${activeTrip.distanceKM} กม.)`, "รวมในค่าโดยสาร"],
          [`เวลาเดินทาง (${activeTrip.tripTimeMin} นาที)`, "รวมในค่าโดยสาร"],
          ["ค่าธรรมเนียมการจอง", `THB ${activeTrip.bookingFeeTHB}`],
          ["ปลายทาง", fullDestination(activeTrip)],
          ["ประเภทรถ", activeTrip.vehicleType],
        ].map(([label, value, isTotal]) => (
          <div key={label} className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
            <p className={isTotal ? "text-sm font-bold text-slate-900" : "text-sm text-muted"}>{label}</p>
            <p className={isTotal ? "font-headline text-xl font-black text-brand" : "text-sm font-semibold text-slate-700"}>{value}</p>
          </div>
        ))}
      </div>
      <PrimaryButton onClick={onConfirmPayment}>{t("driver.confirmPayment")}</PrimaryButton>
    </div>
  );
}

function DriverHome({ activeTrip, isOnline, onOnlineToggle, inQueue, onJoinQueue, onAccept, onReject, onArrived, onComplete, onConfirmPayment, showIncentive }) {
  if (activeTrip.status === "assigned") {
    return <JobOfferHome activeTrip={activeTrip} onAccept={onAccept} onReject={onReject} />;
  }

  if (activeTrip.status === "accepted") {
    return <NavigationHome activeTrip={activeTrip} onArrived={onArrived} />;
  }

  if (activeTrip.status === "arrived") {
    return <TripInProgressHome activeTrip={activeTrip} onComplete={onComplete} />;
  }

  if (activeTrip.status === "completed") {
    return <CompletedTripHome activeTrip={activeTrip} onConfirmPayment={onConfirmPayment} />;
  }

  return (
    <QueueHome
      isOnline={isOnline}
      onOnlineToggle={onOnlineToggle}
      inQueue={inQueue}
      onJoinQueue={onJoinQueue}
      showIncentive={showIncentive}
    />
  );
}

function TripsTab({ activeTrip }) {
  const hasTrip = activeTrip.status !== "idle";
  const timeline = ["assigned", "accepted", "arrived", "completed"];
  const currentIndex = timeline.indexOf(activeTrip.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">งานปัจจุบัน</p>
        {hasTrip ? (
          <>
            <p className="mt-1 text-lg font-black text-slate-900">{activeTrip.passengerName} ไป {fullDestination(activeTrip)}</p>
            <p className="mt-1 text-sm text-muted">{fareLabel(activeTrip)} · {activeTrip.vehicleType} · {activeTrip.status}</p>
            <div className="mt-4 flex items-center gap-2">
              {timeline.map((item, index) => (
                <div key={item} className="flex flex-1 items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${index <= currentIndex ? "bg-brand" : "bg-slate-200"}`} />
                  {index < timeline.length - 1 && <div className={`h-px flex-1 ${index < currentIndex ? "bg-brand" : "bg-slate-200"}`} />}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">ไม่มีงานสนามบินในปัจจุบัน</p>
        )}
      </div>
      {[
        ["ท่าอากาศยาน → สยาม", "420 บาท · เสร็จสิ้น 13:20"],
        ["ท่าอากาศยาน → สาทร", "360 บาท · เสร็จสิ้น 11:45"],
        ["ท่าอากาศยาน → อารีย์", "310 บาท · เสร็จสิ้น 09:10"],
      ].map(([title, body]) => (
        <InfoCard key={title} eyebrow="งานล่าสุด" title={title} body={body} tone="neutral" />
      ))}
    </div>
  );
}

function WalletTab({ activeTrip, showIncentive }) {
  const today = activeTrip.fareTHB + 760;
  const bonusValue = showIncentive ? "THB 450" : "THB 0";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-brand p-5 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">รายได้วันนี้</p>
        <p className="mt-1 font-headline text-4xl font-black">THB {today}</p>
        <p className="mt-1 text-sm text-white/75">รวมงานสนามบินและโบนัสที่อนุมัติแล้ว</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DriverMetric label="โบนัส" value={bonusValue} tone="brand" />
        <DriverMetric label="เงินสด" value={fareLabel(activeTrip)} />
      </div>
      <InfoCard eyebrow="สรุปการจ่ายเงิน" title="รับเงิน: วันศุกร์" body="เดินทางชำระผ่านบัตร/กระเป๋าเงินจะตัดอัตโนมัติ งานเงินสดจะค้างในยอดของคนขับ" tone="neutral" />
    </div>
  );
}

function ProfileTab({ isOnline, onOnlineToggle, onLogout }) {
  return (
    <div className="flex flex-col gap-4">
      <StatusToggle isOnline={isOnline} onToggle={onOnlineToggle} />
      <InfoCard eyebrow="คนขับ" title={D.profile.name} body={`${D.profile.score} · ยืนยันตัวตนแล้ว`} tone="driver" />
      <InfoCard eyebrow="ยานพาหนะ" title={D.profile.vehicle} body="มีสิทธิ์รับงานสนามบิน · พาร์ทเนอร์ Hello Ride" tone="neutral" />
      <div className="rounded-3xl border border-slate-100 bg-white p-2 shadow-sm">
        {["ตั้งค่าบัญชี", "ศูนย์ช่วยเหลือ", "เอกสารการฝึกอบรม"].map((item) => (
          <button key={item} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
            {item}
            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
          </button>
        ))}
      </div>
      <SecondaryButton onClick={onLogout}>ออกจากระบบ</SecondaryButton>
    </div>
  );
}

const DRIVER_TABS = [
  { id: "home", labelKey: "nav.driver", icon: "home" },
  { id: "trips", labelKey: "driver.trips", icon: "route" },
  { id: "wallet", labelKey: "driver.wallet", icon: "account_balance_wallet" },
  { id: "profile", labelKey: "driver.profile", icon: "person" },
];

function DriverBottomNav({ activeTab, onTabChange }) {
  const { t } = useLanguage();
  return (
    <nav className="absolute inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-2 pt-1.5 backdrop-blur">
      <div className="grid grid-cols-4 gap-1">
        {DRIVER_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition-colors ${
                active ? "bg-brand/10 text-brand" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              <span className="material-symbols-outlined text-[22px] leading-none">{tab.icon}</span>
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function DriverWorkspace({
  activeTrip,
  activeTab,
  setActiveTab,
  isOnline,
  onOnlineToggle,
  inQueue,
  onJoinQueue,
  onAccept,
  onReject,
  onArrived,
  onComplete,
  onConfirmPayment,
  onLogout,
  showIncentive,
}) {
  return (
    <>
      <MobileScrollArea className="pb-24">
        <AppHeader isOnline={isOnline} onLogout={onLogout} />
        {activeTab === "home" && (
          <DriverHome
            activeTrip={activeTrip}
            isOnline={isOnline}
            onOnlineToggle={onOnlineToggle}
            inQueue={inQueue}
            onJoinQueue={onJoinQueue}
            onAccept={onAccept}
            onReject={onReject}
            onArrived={onArrived}
            onComplete={onComplete}
            onConfirmPayment={onConfirmPayment}
            showIncentive={showIncentive}
          />
        )}
        {activeTab === "trips" && <TripsTab activeTrip={activeTrip} />}
        {activeTab === "wallet" && <WalletTab activeTrip={activeTrip} showIncentive={showIncentive} />}
        {activeTab === "profile" && <ProfileTab isOnline={isOnline} onOnlineToggle={onOnlineToggle} onLogout={onLogout} />}
      </MobileScrollArea>
      <DriverBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

// ── Main Driver App ────────────────────────────────────────────────────────

export default function DriverApp() {
  const [step, setStep] = useState("login");
  const [activeTab, setActiveTab] = useState("home");
  const [isOnline, setIsOnline] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const { activeTrip, acceptMatch, markArrived, completeMatch, confirmDriverPayment, resetMatch } = useDemoMatching();
  const driverSeverity = getPwtSeverity(kpiSummary.currentPWTPrediction);
  const showIncentive =
    canRecommendIncentive(driverSeverity) &&
    [OPS_ACTION.INCENTIVE_SENT, OPS_ACTION.OVERFLOW_ACTIVATED, OPS_ACTION.MAX_INCENTIVE_SENT].includes(activeTrip.opsAction);

  function handleLogout() {
    setStep("login");
    setActiveTab("home");
    setIsOnline(false);
    setInQueue(false);
  }

  function handleJoinQueue() {
    setInQueue(true);
  }

  function handleReject() {
    resetMatch();
    setInQueue(false);
    setActiveTab("home");
  }

  function handleConfirmPayment() {
    confirmDriverPayment();
    setInQueue(true);
    setActiveTab("home");
  }

  const driverViewTrip =
    activeTrip.status === "completed" && activeTrip.driverPaymentConfirmed
      ? { ...activeTrip, status: "idle" }
      : activeTrip;
  const visibleTab = ["assigned", "accepted", "arrived"].includes(activeTrip.status) ? "home" : activeTab;

  const shouldShowWorkspace = step === "app" || ["assigned", "accepted", "arrived", "completed"].includes(activeTrip.status);

  return (
    <MobileShell>
      {shouldShowWorkspace ? (
        <DriverWorkspace
          activeTrip={driverViewTrip}
          activeTab={visibleTab}
          setActiveTab={setActiveTab}
          isOnline={isOnline || activeTrip.status !== "idle"}
          onOnlineToggle={() => setIsOnline((v) => !v)}
          inQueue={inQueue}
          onJoinQueue={handleJoinQueue}
          onAccept={acceptMatch}
          onReject={handleReject}
          onArrived={markArrived}
          onComplete={completeMatch}
          onConfirmPayment={handleConfirmPayment}
          onLogout={handleLogout}
          showIncentive={showIncentive}
        />
      ) : (
        <MobileScrollArea className="pb-8">
          {step === "login" && (
            <LoginScreen
              onLogin={() => setStep("app")}
              onRegister={() => setStep("registration")}
            />
          )}
          {step === "registration" && (
            <RegistrationScreen
              onBack={() => setStep("login")}
              onLogin={() => setStep("login")}
            />
          )}
        </MobileScrollArea>
      )}
    </MobileShell>
  );
}
