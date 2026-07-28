import { BusFront } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLanguage } from "@/components/i18n/language-provider";

export function MobilePageHeader() {
  const { t } = useLanguage();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[7px] bg-emerald-800 text-white">
            <BusFront size={21} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight text-stone-950 sm:text-xl">{t("booking.title")}</h1>
            <p className="mt-1 text-xs leading-5 text-stone-600 sm:text-sm">{t("booking.subtitle")}</p>
          </div>
        </div>
        <LanguageSwitcher className="self-start sm:self-auto" />
      </div>
    </header>
  );
}
