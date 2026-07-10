import { CalendarX2, RefreshCw } from "lucide-react";

type EmptyScheduleStateProps = {
  onTomorrow: () => void;
  onRefresh: () => void;
  showSeedHint?: boolean;
};

export function EmptyScheduleState({ onTomorrow, onRefresh, showSeedHint }: EmptyScheduleStateProps) {
  return (
    <div className="rounded-[8px] border border-stone-200 bg-white px-5 py-10 text-center">
      <CalendarX2 size={28} className="mx-auto text-stone-400" aria-hidden="true" />
      <h2 className="mt-3 text-base font-bold text-stone-900">此日期尚無車班</h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">請切換日期，或稍後再查看。</p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={onTomorrow}>返回明日</button>
        <button type="button" className="btn btn-secondary" onClick={onRefresh} aria-label="重新整理車班">
          <RefreshCw size={16} aria-hidden="true" />
          重新整理
        </button>
      </div>
      {showSeedHint && <p className="mt-4 font-mono text-xs text-stone-400">npm run seed:demo</p>}
    </div>
  );
}
