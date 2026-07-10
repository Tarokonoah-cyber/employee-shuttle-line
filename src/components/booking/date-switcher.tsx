import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { tomorrowDateInput, todayDateInput } from "@/lib/dates";

type DateSwitcherProps = {
  value: string;
  onChange: (value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
};

const weekdayFormatter = new Intl.DateTimeFormat("zh-TW", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
  timeZone: "Asia/Taipei",
});

function datePrefix(value: string) {
  if (value === tomorrowDateInput()) return "明日";
  if (value === todayDateInput()) return "今日";
  return "登記日期";
}

export function DateSwitcher({ value, onChange, onPrevious, onNext }: DateSwitcherProps) {
  const formatted = weekdayFormatter.format(new Date(`${value}T00:00:00+08:00`));

  return (
    <div className="flex h-14 items-stretch overflow-hidden rounded-[7px] border border-stone-200 bg-white">
      <button
        type="button"
        className="grid w-14 shrink-0 place-items-center text-stone-600 transition-colors hover:bg-stone-50 active:bg-stone-100"
        onClick={onPrevious}
        aria-label="前一天"
      >
        <ChevronLeft size={22} aria-hidden="true" />
      </button>
      <label className="relative flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 border-x border-stone-200 px-2 text-center">
        <CalendarDays size={17} className="shrink-0 text-emerald-800" aria-hidden="true" />
        <span className="truncate text-sm font-semibold text-stone-900">
          {datePrefix(value)} <span className="font-normal text-stone-600">{formatted}</span>
        </span>
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="選擇登記日期"
        />
      </label>
      <button
        type="button"
        className="grid w-14 shrink-0 place-items-center text-stone-600 transition-colors hover:bg-stone-50 active:bg-stone-100"
        onClick={onNext}
        aria-label="後一天"
      >
        <ChevronRight size={22} aria-hidden="true" />
      </button>
    </div>
  );
}
