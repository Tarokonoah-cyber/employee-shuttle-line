"use client";

import { Languages } from "lucide-react";
import { localeOptions, type AppLocale } from "@/lib/i18n";
import { useLanguage } from "./language-provider";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[7px] border border-stone-200 bg-white px-2 text-stone-700 ${className}`}>
      <Languages size={16} aria-hidden="true" />
      <span className="sr-only">{t("language.label")}</span>
      <select
        className="max-w-[8.5rem] cursor-pointer bg-transparent py-2 text-sm font-semibold outline-none"
        value={locale}
        onChange={(event) => setLocale(event.target.value as AppLocale)}
        aria-label={t("language.label")}
      >
        {localeOptions.map((option) => (
          <option value={option.value} key={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
