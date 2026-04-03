import * as Switch from "@radix-ui/react-switch";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BookOpen,
  Camera,
  CarFront,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  FileBadge,
  FileText,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Play,
  Shield,
  UserCircle2,
} from "lucide-react";
import { driverExperience } from "../data/mockData";
import { AppBadge, SurfaceCard } from "./ui";

// Destructure at module scope so all render functions reference these names unchanged.
const { guideTrip, activeTrip } = driverExperience;

function DriverFrame({ children, dark = false }) {
  return (
    <div className="w-[390px] flex-none overflow-hidden rounded-[40px] border border-white/50 bg-white shadow-glow">
      <div className={dark ? "bg-[#183945]" : "bg-[#f7f7f2]"}>{children}</div>
    </div>
  );
}

function HeaderBar({
  left,
  title,
  right,
  dark = false,
  titleClassName = "text-[#00b14f]",
  border = true,
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-4 ${border ? "border-b border-black/5" : ""} ${
        dark ? "bg-[#eaf2f5]" : "bg-white/60"
      }`}
    >
      <div className="flex min-w-[64px] items-center gap-2 text-sm font-semibold text-slate-600">{left}</div>
      <div className={`text-2xl font-extrabold tracking-tight ${titleClassName}`}>{title}</div>
      <div className="flex min-w-[64px] justify-end text-sm font-semibold text-slate-600">{right}</div>
    </div>
  );
}

function StatusRow({ icon, title, subtitle, tone = "default" }) {
  const toneClasses = {
    default: "bg-white text-slate-900",
    muted: "bg-[#f1f1ed] text-slate-500",
    success: "bg-white text-slate-900",
  };

  return (
    <div className={`rounded-[24px] border border-black/5 p-4 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-[#f4f4ef] p-3 text-[#00b14f]">{icon}</div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function DriverPage() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [currentStep, setCurrentStep] = useState("home");
  const [faceScanStarted, setFaceScanStarted] = useState(false);
  const [countdown, setCountdown] = useState(12);
  const [registrationForm, setRegistrationForm] = useState({ firstName: "", lastName: "", phone: "" });

  useEffect(() => {
    if (currentStep !== "jobRequest") return;

    // Reset to full duration each time the job-request screen is entered.
    let remaining = 12;
    setCountdown(remaining);

    const id = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        // Auto-reject: driver did not respond in time.
        setCurrentStep("guide");
      }
    }, 1000);

    return () => clearInterval(id);
  }, [currentStep]);

  const handleRegister = () => {
    setCurrentStep("registration");
  };

  const handleLogin = () => {
    setIsRegistered(true);
    setIsVerified(true);
    setIsApproved(true);
    setCurrentStep("guide");
  };

  const handleSubmitDocument = () => {
    setIsRegistered(true);
    setCurrentStep("verification");
  };

  const handleStartFaceScan = () => {
    setFaceScanStarted(true);
    setIsVerified(true);
  };

  const handleVerificationDone = () => {
    setCurrentStep("applicationStatus");
  };

  const handleCompleteAcademy = () => {
    if (isRegistered && isVerified) {
      setIsApproved(true);
    }
  };

  const handleReadyToGoOnline = () => {
    setCurrentStep("guide");
  };

  const handleOnlineChange = (checked) => {
    setIsOnline(checked);
    if (checked) {
      setCurrentStep("jobRequest");
    }
  };

  const handleAcceptJob = () => {
    setCurrentStep("tripNavigation");
  };

  const handleArrived = () => {
    setCurrentStep("paymentComplete");
  };

  const handleConfirmPayment = () => {
    setIsOnline(true);
    setCurrentStep("guide");
  };

  // Mid-trip toggle: only updates online status, never triggers a screen transition.
  // handleOnlineChange is reserved for the guide screen where going online starts a job request.
  const handleTripOnlineChange = (checked) => {
    setIsOnline(checked);
  };

  const renderHome = () => (
    <>
      <HeaderBar
        left={<Menu className="h-5 w-5 text-[#00b14f]" />}
        title="Hello Ride"
        right={<UserCircle2 className="h-7 w-7 text-[#00b14f]" />}
      />
      <div className="min-h-[760px] bg-[radial-gradient(circle_at_top,_rgba(209,248,214,0.9),_transparent_34%),linear-gradient(180deg,#f4f8ef_0%,#f5f7ef_100%)] px-5 pb-8 pt-10">
        <div className="rounded-full bg-[#62ec8a] px-4 py-2 text-center text-xs font-extrabold uppercase tracking-[0.24em] text-[#087f32]">
          Partner Program
        </div>
        <h1 className="mt-8 text-[56px] font-extrabold leading-[0.95] tracking-tight text-slate-900">
          Drive Your Career Forward with <span className="text-[#00b14f]">Hello Ride</span>
        </h1>
        <p className="mt-8 text-center text-[17px] leading-9 text-slate-600">
          Join the community of elite partners. Enjoy the freedom to earn on your terms with premium support every mile of the way.
        </p>
        <div className="mt-14 space-y-4">
          <button
            type="button"
            onClick={handleRegister}
            className="flex w-full items-center justify-center gap-3 rounded-[18px] bg-[#00b14f] px-5 py-5 text-2xl font-bold text-white"
          >
            Register with Partner
            <ChevronRight className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={handleLogin}
            className="w-full rounded-[18px] bg-[#e7ebe2] px-5 py-5 text-2xl font-bold text-slate-800"
          >
            Log In
          </button>
        </div>
      </div>
    </>
  );

  const renderRegistration = () => (
    <>
      <HeaderBar
        left={
          <button type="button" onClick={() => setCurrentStep("home")} className="flex items-center gap-1 text-slate-500">
            <ChevronLeft className="h-4 w-4" />
          </button>
        }
        title="Hello Ride"
        right={
          <button type="button" onClick={handleLogin} className="text-[#2563eb]">
            Log In
          </button>
        }
      />
      <div className="bg-[#f7f7f3] px-4 pb-8 pt-6 text-slate-900">
        <SurfaceCard className="rounded-[24px] bg-[linear-gradient(180deg,#eef3ff_0%,#e7ecf7_100%)] p-5">
          <AppBadge tone="bg-[#e7efff] text-[#2d6bff]">New Driver Registration</AppBadge>
          <h2 className="mt-4 text-[34px] font-extrabold leading-tight">Drive with Hello Ride.</h2>
          <p className="mt-2 text-base leading-7 text-slate-500">
            Start your journey today. Complete your profile and documents to get verified.
          </p>
        </SurfaceCard>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Join us</p>
          <h3 className="mt-2 text-[30px] font-extrabold">Create Your Driver Account</h3>
        </div>

        <SurfaceCard className="mt-4 rounded-[24px] p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-[#f5f5f2] p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">First name</p>
              <input
                type="text"
                value={registrationForm.firstName}
                onChange={(e) => setRegistrationForm((prev) => ({ ...prev, firstName: e.target.value }))}
                placeholder="Enter first name"
                maxLength={50}
                className="mt-2 w-full bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                aria-label="First name"
              />
            </div>
            <div className="rounded-[18px] bg-[#f5f5f2] p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Last name</p>
              <input
                type="text"
                value={registrationForm.lastName}
                onChange={(e) => setRegistrationForm((prev) => ({ ...prev, lastName: e.target.value }))}
                placeholder="Enter last name"
                maxLength={50}
                className="mt-2 w-full bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                aria-label="Last name"
              />
            </div>
          </div>
          <div className="mt-3 rounded-[18px] bg-[#f5f5f2] p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Mobile phone</p>
            <input
              type="tel"
              value={registrationForm.phone}
              onChange={(e) => setRegistrationForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+66 081 234 5678"
              maxLength={20}
              className="mt-2 w-full bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400"
              aria-label="Mobile phone"
            />
          </div>
        </SurfaceCard>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Qualify</p>
          <h3 className="mt-2 text-[30px] font-extrabold">Are you eligible?</h3>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            "Thai Nationality",
            "18-70 years old",
            "No criminal record",
            "Car under 9 years old",
          ].map((item) => (
            <SurfaceCard key={item} className="rounded-[24px] p-4">
              <p className="text-lg font-bold text-slate-900">{item}</p>
            </SurfaceCard>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Documents</p>
            <h3 className="mt-2 text-[30px] font-extrabold">Checklist</h3>
          </div>
          <p className="text-sm font-semibold text-slate-400">5 required</p>
        </div>
        <div className="mt-4 space-y-3">
          {["ID card", "Car registration", "Insurance/ACT", "Driver's License", "Bank book"].map((item) => (
            <SurfaceCard key={item} className="rounded-[22px] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-2xl bg-[#f4f4ef] p-3 text-slate-500">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="min-w-0 text-lg font-bold text-slate-900">{item}</p>
                </div>
                <CircleAlert className="h-5 w-5 shrink-0 text-slate-300" />
              </div>
            </SurfaceCard>
          ))}
        </div>

        <SurfaceCard className="mt-4 rounded-[22px] bg-[#dfe8ff] p-4 text-[#2041a8]">
          <p className="font-bold">Need help with documents?</p>
          <p className="mt-1 text-sm">Our support team is available 24/7 to guide you.</p>
        </SurfaceCard>

        <button
          type="button"
          onClick={handleSubmitDocument}
          className="mt-6 w-full rounded-[18px] bg-[#2d6bff] px-5 py-5 text-xl font-bold text-white"
        >
          Submit Document
        </button>
      </div>
    </>
  );

  const renderVerification = () => (
    <>
      <HeaderBar
        left={
          <button type="button" onClick={() => setCurrentStep("registration")} className="flex items-center gap-2 text-slate-700">
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
        }
        title="Hello Ride"
        right={null}
        titleClassName="text-[#0b68d7]"
        border={false}
      />
      <div className="bg-[#f7f7f3] px-5 pb-8 pt-4 text-slate-900">
        <h2 className="text-[44px] font-extrabold leading-tight">Verify Your Identity</h2>
        <p className="mt-3 text-xl leading-9 text-slate-500">
          Please complete the face scan to verify your Hello Ride driver profile credentials.
        </p>

        <div className="mt-8 flex justify-center">
          <div className="relative flex h-[290px] w-[290px] items-center justify-center rounded-full border-4 border-dashed border-slate-300 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.06),_rgba(0,0,0,0.02))]">
            <div className="absolute inset-[34px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.12),_rgba(255,255,255,0.9))]" />
            <div className="absolute inset-[74px] rounded-[28px] border-4 border-[#0b68d7]" />
            <div className="relative z-10 text-center text-[#0b68d7]">
              <Shield className="mx-auto h-10 w-10" />
              <p className="mt-4 text-sm font-bold uppercase tracking-[0.24em]">Position face within frame</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <SurfaceCard className="rounded-[22px] p-4">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0b68d7]">Good Lighting</p>
            <p className="mt-2 text-lg font-semibold text-slate-700">Ensure your face is clearly visible without harsh shadows.</p>
          </SurfaceCard>
          <SurfaceCard className="rounded-[22px] p-4">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0b68d7]">No Accessories</p>
            <p className="mt-2 text-lg font-semibold text-slate-700">Remove sunglasses, hats, or masks before scanning.</p>
          </SurfaceCard>
        </div>

        <button
          type="button"
          onClick={handleStartFaceScan}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-[18px] bg-[#0b68d7] px-5 py-5 text-2xl font-bold text-white"
        >
          <Camera className="h-6 w-6" />
          Start Face Scan
        </button>
        <button
          type="button"
          onClick={handleVerificationDone}
          disabled={!faceScanStarted}
          className={`mt-4 flex w-full items-center justify-center gap-3 rounded-[18px] px-5 py-5 text-2xl font-bold ${
            faceScanStarted ? "bg-[#e7e4df] text-slate-800" : "bg-[#f1efeb] text-slate-400"
          }`}
        >
          <CheckCircle2 className="h-6 w-6" />
          Done
        </button>
      </div>
    </>
  );

  const renderApplicationStatus = () => (
    <>
      <HeaderBar
        left={<Menu className="h-5 w-5 text-slate-500" />}
        title="Hello Ride"
        right={<UserCircle2 className="h-6 w-6 text-slate-500" />}
      />
      <div className="bg-[#f7f7f3] px-4 pb-8 pt-6 text-slate-900">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#4aa055]">Application Status</p>
        <h2 className="mt-3 text-[46px] font-extrabold leading-tight">You're almost there, Partner.</h2>
        <p className="mt-3 text-xl leading-8 text-slate-500">Complete your training to unlock the road.</p>

        <SurfaceCard className="mt-6 rounded-[24px] bg-[#ecebe7] p-5">
          <div className="flex items-center justify-between gap-2">
            {[
              ["Submitted", true],
              ["Verifying", isVerified],
              ["Training", true],
              ["Background", isApproved],
              ["Active", isApproved],
            ].map(([label, done]) => (
              <div key={label} className="flex flex-1 flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${done ? "bg-[#00b14f] text-white" : "bg-[#dbdad5] text-slate-400"}`}>
                  <Check className="h-5 w-5" />
                </div>
                <p className={`mt-2 text-[10px] font-bold uppercase tracking-[0.12em] ${done ? "text-slate-900" : "text-slate-400"}`}>{label}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <div className="mt-6 space-y-4">
          <StatusRow icon={<Clock3 className="h-5 w-5" />} title="Document Check" subtitle={isApproved ? "Completed" : "Estimated completion: 3-7 days"} />
          <StatusRow icon={<Shield className="h-5 w-5" />} title="Academy Learning" subtitle={isApproved ? "Completed" : "2/5 lessons completed"} />
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <h3 className="min-w-0 text-[34px] font-extrabold">Academy</h3>
          <AppBadge tone={`${isApproved ? "bg-[#dff5e7] text-[#0f8a3f]" : "bg-[#e9f6ea] text-[#4aa055]"}`}>
            {isApproved ? "5/5 LESSONS" : "2/5 LESSONS"}
          </AppBadge>
        </div>

        <button type="button" onClick={handleCompleteAcademy} className="mt-4 w-full text-left">
          <div className="overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#2b2b2b_0%,#1d1d1d_100%)] p-5 text-white">
            <AppBadge tone="bg-[#1b7a39] text-[#9cf7b7]">Featured</AppBadge>
            <div className="mt-20 flex items-end justify-between gap-4">
              <p className="text-[34px] font-extrabold leading-tight">Passenger Safety & 5-Star Standards</p>
              <div className="rounded-full bg-[#00b14f] p-3 text-white">
                <Play className="h-6 w-6 fill-current" />
              </div>
            </div>
          </div>
        </button>

        <SurfaceCard className="mt-6 rounded-[24px] bg-[#efeeea] p-5 text-slate-500">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[#d9d8d3] p-3 text-slate-400">
              <Clock3 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-slate-700">{isApproved ? "Approval Complete" : "Approval Pending"}</p>
              <p className="mt-2 text-base leading-7">
                {isApproved
                  ? "Your account is approved and ready for activation."
                  : "Your account is currently under review. Complete your lessons to expedite the process. Up to 3 business days."}
              </p>
            </div>
          </div>
        </SurfaceCard>

        {isApproved ? (
          <button
            type="button"
            onClick={handleReadyToGoOnline}
            className="mt-6 w-full rounded-[18px] bg-[#00b14f] px-5 py-5 text-2xl font-bold text-white"
          >
            Ready to Go Online
          </button>
        ) : null}
      </div>
    </>
  );

  const renderGuide = () => (
    <>
      <HeaderBar
        left={<Menu className="h-5 w-5 text-[#00b14f]" />}
        title="Hello Ride"
        right={
          <div className="flex items-center gap-3">
            <AppBadge tone={isOnline ? "bg-[#dff5e7] text-[#0f8a3f]" : "bg-[#efefef] text-slate-500"}>
              {isOnline ? "Online" : "Offline"}
            </AppBadge>
            <UserCircle2 className="h-6 w-6 text-[#00b14f]" />
          </div>
        }
      />
      <div className="bg-[#f7f7f3] px-4 pb-8 pt-8 text-slate-900">
        <h2 className="text-[44px] font-extrabold leading-tight">Good Morning, Partner</h2>
        <p className="mt-3 text-xl leading-8 text-slate-500">Complete your daily checklist and stay ahead of the demand.</p>

        <SurfaceCard className="mt-6 rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="rounded-full bg-[#dff5e7] p-4 text-[#00b14f]">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-[36px] font-extrabold leading-none">Go Online</p>
                <p className="mt-2 text-lg text-slate-500">Ready to start earning?</p>
              </div>
            </div>
            <Switch.Root
              checked={isOnline}
              onCheckedChange={handleOnlineChange}
              className="relative h-12 w-20 rounded-full bg-[#d6d9d9] transition data-[state=checked]:bg-[#00b14f]"
            >
              <Switch.Thumb className="block h-10 w-10 translate-x-1 rounded-full bg-white shadow transition data-[state=checked]:translate-x-9" />
            </Switch.Root>
          </div>
        </SurfaceCard>

        <SurfaceCard className="mt-6 rounded-[28px] border-[#bbe7c8] bg-[#e7f7eb] p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 text-[#067c37]">
              <Banknote className="h-6 w-6" />
              <p className="text-[30px] font-extrabold">Active Incentives</p>
            </div>
            <AppBadge tone="bg-white text-[#00b14f]">Live Now</AppBadge>
          </div>
          <div className="mt-4 rounded-[20px] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-500">Area Bonus</p>
                <p className="mt-1 text-2xl font-extrabold text-[#00b14f]">+฿50 per trip in Sukhumvit</p>
              </div>
              <ChevronRight className="h-6 w-6 text-[#00b14f]" />
            </div>
          </div>
          <div className="mt-4 rounded-[20px] bg-white p-4">
            <div className="flex items-center justify-between text-xl font-bold text-slate-700">
              <p>Morning Quest</p>
              <p>฿200 bonus</p>
            </div>
            <div className="mt-4 h-3 rounded-full bg-[#dfe6df]">
              <div className="h-3 w-3/4 rounded-full bg-[#00b14f]" />
            </div>
            <p className="mt-3 text-base font-bold uppercase tracking-[0.1em] text-slate-500">Complete 2 more trips</p>
          </div>
        </SurfaceCard>

        <SurfaceCard className="mt-6 rounded-[28px] p-5">
          <div className="flex items-center gap-3 text-slate-800">
            <MapPin className="h-6 w-6 text-[#2d6bff]" />
            <p className="text-[32px] font-extrabold">High Demand Lanes</p>
          </div>
          <div className="mt-4 space-y-4">
            {[ ["Silom District", "Peak: 8:00 AM - 10:00 AM", "High"], ["Siam Square", "Expected: From 11:30 AM", "Rising"] ].map(([name, detail, badge]) => (
              <div key={name} className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f7f7f3] p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="rounded-full bg-[#eef2f1] p-3 text-slate-500">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-slate-800">{name}</p>
                    <p className="mt-1 text-base text-slate-500">{detail}</p>
                  </div>
                </div>
                <AppBadge tone={badge === "High" ? "bg-[#e3f0ff] text-[#2d6bff]" : "bg-[#efefef] text-slate-500"}>{badge}</AppBadge>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <div className="mt-10 grid grid-cols-4 border-t border-black/5 pt-4 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {[
            ["Home", true],
            ["Earnings", false],
            ["Activity", false],
            ["Account", false],
          ].map(([label, active]) => (
            <div key={label} className={active ? "text-[#00b14f]" : ""}>{label}</div>
          ))}
        </div>
      </div>
    </>
  );

  const renderJobRequest = () => (
    <>
      <HeaderBar
        left={<Menu className="h-5 w-5 text-[#00b14f]" />}
        title="Hello Ride"
        right={
          <div className="flex items-center gap-3">
            <AppBadge tone="bg-[#dff5e7] text-[#0f8a3f]">Online</AppBadge>
            <UserCircle2 className="h-6 w-6 text-slate-500" />
          </div>
        }
        dark
      />
      <div className="min-h-[760px] bg-[linear-gradient(180deg,#2e464a_0%,#1e2f33_100%)] px-4 pb-8 pt-10 text-white">
        <div className="rounded-full bg-[#0c7d35] px-5 py-3 text-base font-bold uppercase tracking-[0.18em]">High Demand</div>
        <SurfaceCard className="mt-6 rounded-[30px] bg-white p-6 text-slate-900">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-[38px] font-extrabold text-[#00b14f]">Hello Ride</h3>
                <AppBadge tone="bg-[#e7f7eb] text-[#067c37]">Plus</AppBadge>
              </div>
              <p className="mt-2 text-xl text-slate-600">{guideTrip.distance} ({guideTrip.eta})</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Net Earnings</p>
              <p className="mt-2 whitespace-nowrap text-[54px] font-extrabold leading-none">{guideTrip.payout}</p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <div
              className="relative flex h-44 w-44 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(#0c7d35 ${Math.round((countdown / 12) * 360)}deg, #ece9e9 0deg)` }}
            >
              <div className="absolute inset-[10px] rounded-full bg-white" />
              <div className="relative text-center">
                <p className="text-[54px] font-extrabold leading-none">{countdown}</p>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Secs</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <div className="flex flex-col items-center pt-1">
              <span className="h-3 w-3 rounded-full bg-[#00b14f]" />
              <span className="h-16 w-px bg-slate-200" />
              <span className="h-3 w-3 rounded-sm bg-[#d54b72]" />
            </div>
            <div className="min-w-0 space-y-4 text-slate-800">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Pickup</p>
                <p className="mt-2 text-2xl font-extrabold">{guideTrip.pickup}</p>
                <p className="mt-1 text-lg text-slate-500">{guideTrip.pickupAddress}</p>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Drop-off</p>
                <p className="mt-2 text-2xl font-extrabold">{guideTrip.dropoff}</p>
                <p className="mt-1 text-lg text-slate-500">{guideTrip.dropoffAddress}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAcceptJob}
            className="mt-8 w-full rounded-[18px] bg-[#00b14f] px-5 py-5 text-2xl font-bold text-white"
          >
            Accept Job
          </button>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" className="rounded-[18px] bg-[#efebe9] px-4 py-4 text-xl font-bold text-slate-500">Reject</button>
            <button type="button" className="rounded-[18px] bg-[#efebe9] px-4 py-4 text-xl font-bold text-slate-500">More Info</button>
          </div>
        </SurfaceCard>
      </div>
    </>
  );

  const renderTripNavigation = () => (
    <>
      <HeaderBar
        left={<Menu className="h-5 w-5 text-[#00b14f]" />}
        title="Hello Ride"
        right={
          <div className="flex items-center gap-3">
            <AppBadge tone="bg-[#dff5e7] text-[#0f8a3f]">Online</AppBadge>
            <UserCircle2 className="h-6 w-6 text-[#00b14f]" />
          </div>
        }
        dark
      />
      <div className="min-h-[760px] bg-[linear-gradient(180deg,#7da5b5_0%,#8fb3bc_22%,#6d928b_100%)] px-4 pb-8 pt-6">
        <SurfaceCard className="rounded-[22px] bg-white p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-[16px] bg-[#0c7d35] px-4 py-3 text-center text-white">
              <p className="text-[28px] font-extrabold leading-none">200</p>
              <p className="mt-1 text-sm font-bold uppercase tracking-[0.18em]">M</p>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Head north toward</p>
              <p className="mt-1 text-[28px] font-extrabold leading-tight text-slate-900">Robinson Rd / Marina Blvd</p>
            </div>
          </div>
        </SurfaceCard>

        <div className="mt-4 flex justify-end">
          <div className="flex items-center gap-4 rounded-full bg-white px-5 py-3 shadow-sm">
            <p className="text-base font-bold uppercase tracking-[0.18em] text-slate-500">Stay Online</p>
            <Switch.Root checked={isOnline} onCheckedChange={handleTripOnlineChange} className="relative h-8 w-14 rounded-full bg-[#d9d9d5] data-[state=checked]:bg-[#00b14f]">
              <Switch.Thumb className="block h-6 w-6 translate-x-1 rounded-full bg-white shadow transition data-[state=checked]:translate-x-7" />
            </Switch.Root>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <div className="rounded-full bg-white p-5 shadow-sm"><MessageCircle className="h-7 w-7 text-[#067c37]" /></div>
          <div className="rounded-full bg-white p-5 shadow-sm"><Phone className="h-7 w-7 text-[#067c37]" /></div>
        </div>

        <SurfaceCard className="mt-40 rounded-[28px] bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="rounded-[18px] bg-[linear-gradient(135deg,#f7aa67,#f26b5f)] p-3 text-white">
                <UserCircle2 className="h-10 w-10" />
              </div>
              <div className="min-w-0">
                <p className="text-[34px] font-extrabold text-slate-900">{activeTrip.driver}</p>
                <p className="mt-1 text-2xl text-slate-500">{activeTrip.service}</p>
                <AppBadge tone="mt-3 bg-[#0c7d35] text-white">4.9 ★</AppBadge>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[34px] font-extrabold text-[#067c37]">{activeTrip.payout}</p>
              <p className="mt-1 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Cash Payment</p>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <div className="flex flex-col items-center pt-1">
              <span className="h-3 w-3 rounded-full border-2 border-[#00b14f]" />
              <span className="h-16 w-px bg-slate-200" />
              <span className="h-3 w-3 rounded-sm bg-[#d54b72]" />
            </div>
            <div className="min-w-0 space-y-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Pick-up</p>
                <p className="mt-1 text-[30px] font-extrabold text-slate-900">{activeTrip.pickup}</p>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Drop-off</p>
                <p className="mt-1 text-[30px] font-extrabold text-slate-900">{activeTrip.dropoff}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleArrived}
            className="mt-8 w-full rounded-[18px] bg-[#00b14f] px-5 py-5 text-2xl font-bold text-white"
          >
            Arrived at Pick-up
          </button>
        </SurfaceCard>
      </div>
    </>
  );

  const renderPaymentComplete = () => (
    <>
      <HeaderBar
        left={<button type="button" onClick={() => setCurrentStep("guide")}><ChevronLeft className="h-6 w-6 text-[#00b14f]" /></button>}
        title="Hello Ride"
        right={<p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Trip Ended</p>}
      />
      <div className="min-h-[760px] bg-[#f7f7f3] pb-8">
        <div className="bg-[linear-gradient(135deg,#067c37_0%,#0f8a3f_58%,#13763b_100%)] px-5 pb-28 pt-8 text-white">
          <AppBadge tone="bg-white/12 text-white">Journey Complete</AppBadge>
          <h2 className="mt-5 text-[56px] font-extrabold leading-[0.92]">Arrived at destination</h2>
          <p className="mt-4 text-xl leading-8 text-white/80">You have successfully dropped off the passenger.</p>
        </div>

        <SurfaceCard className="-mt-20 mx-5 rounded-[28px] bg-white p-5 text-slate-900">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Total Fare</p>
              <p className="mt-2 text-[66px] font-extrabold leading-none">{activeTrip.payout}</p>
            </div>
            <AppBadge tone="bg-[#dff5e7] text-[#0f8a3f]">Cash</AppBadge>
          </div>
          <div className="mt-6 space-y-4 text-xl text-slate-500">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><span className="min-w-0">Distance ({activeTrip.fareBreakdown.distanceKm} km)</span><span className="font-semibold text-slate-800">{activeTrip.fareBreakdown.distanceFare}</span></div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><span className="min-w-0">Time ({activeTrip.fareBreakdown.durationMin} mins)</span><span className="font-semibold text-slate-800">{activeTrip.fareBreakdown.durationFare}</span></div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><span className="min-w-0">Booking Fee</span><span className="font-semibold text-slate-800">{activeTrip.fareBreakdown.bookingFee}</span></div>
          </div>
        </SurfaceCard>

        <div className="px-5 pt-40">
          <button
            type="button"
            onClick={handleConfirmPayment}
            className="w-full rounded-[18px] bg-[#0c7d35] px-5 py-5 text-2xl font-bold text-white"
          >
            Confirm Payment Received
          </button>
        </div>
      </div>
    </>
  );

  const screens = {
    home: renderHome,
    registration: renderRegistration,
    verification: renderVerification,
    applicationStatus: renderApplicationStatus,
    guide: renderGuide,
    jobRequest: renderJobRequest,
    tripNavigation: renderTripNavigation,
    paymentComplete: renderPaymentComplete,
  };

  const isDarkScreen = currentStep === "jobRequest" || currentStep === "tripNavigation";
  const Screen = screens[currentStep];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_35%),linear-gradient(180deg,#f6fff9_0%,#edf4ff_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto flex justify-center">
        <DriverFrame dark={isDarkScreen}>
          <Screen />
        </DriverFrame>
      </div>
    </div>
  );
}
