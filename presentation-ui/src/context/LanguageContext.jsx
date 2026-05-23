import { useEffect, useMemo, useState } from "react";
import { dictionary } from "../i18n/dictionary.js";
import { LanguageContext } from "./LanguageContextCore.js";

const LANGUAGE_KEY = "helloRideLanguage";

function getInitialLanguage() {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LANGUAGE_KEY);
  return stored === "th" || stored === "en" ? stored : "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const value = useMemo(() => {
    function t(key) {
      return dictionary[language]?.[key] ?? dictionary.en[key] ?? key;
    }

    return { language, setLanguage, t };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
