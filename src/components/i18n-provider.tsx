"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { type Locale, type Translations, translations } from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
};

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: translations.en,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let resolved: Locale = "en";
    try {
      const stored = localStorage.getItem("ski-locale");
      if (stored === "en" || stored === "zh") {
        resolved = stored;
      } else {
        resolved = navigator.language.startsWith("zh") ? "zh" : "en";
      }
    } catch {}
    setLocaleState(resolved);
    setMounted(true);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    try { localStorage.setItem("ski-locale", l); } catch {}
  }

  const t = mounted ? translations[locale] : translations.en;

  return (
    <I18nContext.Provider value={{ locale: mounted ? locale : "en", setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale() {
  return useContext(I18nContext);
}
