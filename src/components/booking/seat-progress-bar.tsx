import { clsx } from "clsx";
import type { EmployeeScheduleState } from "./types";

type SeatProgressBarProps = {
  confirmed: number;
  capacity: number;
  state: EmployeeScheduleState;
};

const barColors: Record<EmployeeScheduleState, string> = {
  open: "bg-emerald-700",
  "near-full": "bg-amber-500",
  full: "bg-red-600",
  overbooked: "bg-red-700",
  closed: "bg-stone-400",
};

export function SeatProgressBar({ confirmed, capacity, state }: SeatProgressBarProps) {
  const percentage = capacity > 0 ? Math.min((confirmed / capacity) * 100, 100) : 0;

  return (
    <div
      className="h-1 overflow-hidden rounded-full bg-stone-200"
      role="progressbar"
      aria-label="正取名額使用狀況"
      aria-valuemin={0}
      aria-valuemax={capacity}
      aria-valuenow={Math.min(confirmed, capacity)}
    >
      <span
        className={clsx("block h-full rounded-full transition-[width] duration-200", barColors[state])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
