import { useLanguage } from "../../context/useLanguage.js";

export default function LanguageToggle({ className = "" }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`inline-flex rounded-full border border-slate-200 bg-white p-0.5 shadow-sm ${className}`}>
      {["en", "th"].map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase transition-colors ${
            language === option
              ? "bg-[#154aa8] text-white"
              : "text-slate-400 hover:text-slate-700"
          }`}
          aria-pressed={language === option}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
