import { CalendarX2, RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

type EmptyScheduleStateProps = {
  onTomorrow: () => void;
  onRefresh: () => void;
  showSeedHint?: boolean;
};

export function EmptyScheduleState({ onTomorrow, onRefresh, showSeedHint }: EmptyScheduleStateProps) {
  const { t } = useLanguage();

  return (
    <div className="rounded-[8px] border border-stone-200 bg-white px-5 py-10 text-center">
      <CalendarX2 size={28} className="mx-auto text-stone-400" aria-hidden="true" />
      <h2 className="mt-3 text-base font-bold text-stone-900">{t("schedule.none")}</h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">{t("schedule.noneBody")}</p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={onTomorrow}>{t("schedule.backTomorrow")}</button>
        <button type="button" className="btn btn-secondary" onClick={onRefresh} aria-label={t("schedule.refreshAria")}>
          <RefreshCw size={16} aria-hidden="true" />
          {t("common.refresh")}
        </button>
      </div>
      {showSeedHint && <p className="mt-4 font-mono text-xs text-stone-400">npm run seed:demo</p>}
    </div>
  );
}
