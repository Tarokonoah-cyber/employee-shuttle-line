"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  resolveLocale,
  translate,
  type AppLocale,
  type TranslationKey,
} from "@/lib/i18n";

type TranslationValues = Record<string, string | number>;

type LanguageContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyDocumentLocale(locale: AppLocale) {
  document.documentElement.lang = locale;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    let storedLocale: AppLocale | null = null;
    try {
      storedLocale = resolveLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    } catch {
      // Language selection still works for this page when storage is blocked.
    }
    const browserLocale = navigator.languages
      .map((language) => resolveLocale(language))
      .find((language): language is AppLocale => Boolean(language));
    const initialLocale = storedLocale ?? browserLocale ?? DEFAULT_LOCALE;
    setLocaleState(initialLocale);
    applyDocumentLocale(initialLocale);
  }, []);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    applyDocumentLocale(nextLocale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Keep the selection in memory when storage is unavailable.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    t: (key, values) => translate(locale, key, values),
  }), [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
