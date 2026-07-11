import { ArrowRight } from "lucide-react";
import type { Schedule } from "./types";

type BottomActionBarProps = {
  schedule: Schedule;
  onContinue: () => void;
};

export function BottomActionBar({ schedule, onContinue }: BottomActionBarProps) {
  return (
    <div className="bottom-action-enter fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-4px_12px_rgba(28,25,23,0.06)] lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-stone-500">已選車班</p>
          <p className="truncate text-sm font-semibold text-stone-900">
            <span className="font-mono">{schedule.departureTime}</span> · {schedule.routeName}
          </p>
        </div>
        <button type="button" className="btn btn-primary min-h-11 shrink-0 px-4" onClick={onContinue}>
          繼續登記
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
