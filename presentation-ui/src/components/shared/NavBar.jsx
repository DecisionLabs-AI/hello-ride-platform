import { HelloRideWordmark } from "./MobileShell.jsx";
import LanguageToggle from "./LanguageToggle.jsx";
import { useLanguage } from "../../context/useLanguage.js";

export default function NavBar({ page, setPage }) {
  const { t } = useLanguage();
  const navItems = [
    { id: "ops", label: t("nav.ops") },
    { id: "passenger", label: t("nav.passenger") },
    { id: "driver", label: t("nav.driver") },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <HelloRideWordmark size="sm" />
        <div className="h-4 w-px bg-slate-200" />
        <span className="text-xs text-muted bg-slate-100 px-2 py-0.5 rounded-full font-medium tracking-wide">BKK Demo</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                page === item.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <LanguageToggle />
      </div>
    </nav>
  );
}
