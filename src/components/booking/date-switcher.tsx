import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { tomorrowDateInput, todayDateInput } from "@/lib/dates";
import { intlLocale } from "@/lib/i18n";

type DateSwitcherProps = {
  value: string;
  onChange: (value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function DateSwitcher({ value, onChange, onPrevious, onNext }: DateSwitcherProps) {
  const { locale, t } = useLanguage();
  const formatted = new Intl.DateTimeFormat(intlLocale(locale), {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(`${value}T00:00:00+08:00`));
  const prefix = value === tomorrowDateInput()
    ? t("date.tomorrow")
    : value === todayDateInput()
      ? t("date.today")
      : t("date.registration");

  return (
    <div className="flex h-14 items-stretch overflow-hidden rounded-[7px] border border-stone-200 bg-white">
      <button
        type="button"
        className="grid w-14 shrink-0 place-items-center text-stone-600 transition-colors hover:bg-stone-50 active:bg-stone-100"
        onClick={onPrevious}
        aria-label={t("date.previous")}
      >
        <ChevronLeft size={22} aria-hidden="true" />
      </button>
      <label className="relative flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 border-x border-stone-200 px-2 text-center">
        <CalendarDays size={17} className="shrink-0 text-emerald-800" aria-hidden="true" />
        <span className="truncate text-sm font-semibold text-stone-900">
          {prefix} <span className="font-normal text-stone-600">{formatted}</span>
        </span>
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={t("date.select")}
        />
      </label>
      <button
        type="button"
        className="grid w-14 shrink-0 place-items-center text-stone-600 transition-colors hover:bg-stone-50 active:bg-stone-100"
        onClick={onNext}
        aria-label={t("date.next")}
      >
        <ChevronRight size={22} aria-hidden="true" />
      </button>
    </div>
  );
}
