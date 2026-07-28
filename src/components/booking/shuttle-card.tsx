import { clsx } from "clsx";
import { Check, Clock3, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { taipeiDateTimeShort } from "@/lib/dates";
import { SeatProgressBar } from "./seat-progress-bar";
import { canRegisterSchedule, getEmployeeScheduleState, type Schedule } from "./types";

type ShuttleCardProps = {
  schedule: Schedule;
  selected: boolean;
  onSelect: (schedule: Schedule) => void;
};

export function ShuttleCard({ schedule, selected, onSelect }: ShuttleCardProps) {
  const state = getEmployeeScheduleState(schedule);
  const enabled = canRegisterSchedule(schedule);

  return (
    <button
      type="button"
      className={clsx(
        "relative w-full rounded-[8px] border bg-white p-4 text-left transition-[border-color,background-color,box-shadow] duration-150",
        enabled && "active:bg-stone-50",
        selected ? "border-emerald-700 shadow-[0_0_0_1px_#047857]" : "border-stone-200",
        !enabled && "cursor-not-allowed bg-stone-100 opacity-65",
      )}
      onClick={() => onSelect(schedule)}
      disabled={!enabled}
      aria-pressed={selected}
    >
      {selected && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-700 text-white">
          <Check size={13} strokeWidth={3} aria-hidden="true" />
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="font-mono text-2xl font-bold text-stone-950">{schedule.departureTime}</span>
          <span className="truncate text-base font-semibold text-stone-800">{schedule.routeName}</span>
        </div>
        <StatusBadge value={state} className="shrink-0" />
      </div>

      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-600">
        <MapPin size={15} aria-hidden="true" />
        <span className="truncate">{schedule.pickupPoint}</span>
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500">
        <Clock3 size={14} aria-hidden="true" />
        <span>報名／取消截止 {taipeiDateTimeShort(schedule.registrationDeadline)}</span>
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-sm">
        <div>
          <span className="block text-xs text-stone-500">正取</span>
          <strong className="font-mono text-stone-900">{schedule.confirmedCount} / {schedule.capacity}</strong>
        </div>
        <div>
          <span className="block text-xs text-stone-500">剩餘名額</span>
          <strong className={clsx("font-mono", state === "near-full" ? "text-amber-700" : "text-stone-900")}>
            {schedule.remainingCount}
          </strong>
        </div>
        <div>
          <span className="block text-xs text-stone-500">候補人數</span>
          <strong className="font-mono text-stone-900">{schedule.waitlistCount}</strong>
        </div>
      </div>

      <div className="mt-3">
        <SeatProgressBar confirmed={schedule.confirmedCount} capacity={schedule.capacity} state={state} />
      </div>
    </button>
  );
}
