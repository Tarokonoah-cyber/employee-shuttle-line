import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Clock3, MinusCircle } from "lucide-react";
import type { ComponentType } from "react";

const labels: Record<string, string> = {
  confirmed: "正取",
  waitlist: "候補",
  cancelled: "已取消",
  open: "可登記",
  "near-full": "即將額滿",
  full: "候補登記",
  closed: "登記已關閉",
  overbooked: "已超收",
  promoted: "候補已遞補",
  schedule_cancelled: "班次已取消",
  cancellation_closed: "已超過可取消時間",
};

const colors: Record<string, string> = {
  confirmed: "border-green-700/25 bg-green-700/10 text-green-800",
  waitlist: "border-amber-700/25 bg-amber-700/10 text-amber-800",
  cancelled: "border-stone-500/25 bg-stone-500/10 text-stone-700",
  open: "border-green-700/25 bg-green-700/10 text-green-800",
  "near-full": "border-amber-700/25 bg-amber-50 text-amber-800",
  full: "border-red-700/20 bg-red-50 text-red-800",
  closed: "border-stone-500/25 bg-stone-500/10 text-stone-700",
  overbooked: "border-orange-800/25 bg-orange-800/10 text-orange-900",
  promoted: "border-emerald-700/25 bg-emerald-50 text-emerald-800",
  schedule_cancelled: "border-red-700/20 bg-red-50 text-red-800",
  cancellation_closed: "border-stone-500/25 bg-stone-100 text-stone-700",
};

const icons: Record<string, ComponentType<{ size?: number }>> = {
  confirmed: CheckCircle2,
  waitlist: Clock3,
  cancelled: MinusCircle,
  open: CheckCircle2,
  "near-full": AlertTriangle,
  full: Clock3,
  closed: MinusCircle,
  overbooked: AlertTriangle,
  promoted: CheckCircle2,
  schedule_cancelled: MinusCircle,
  cancellation_closed: Clock3,
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const Icon = icons[value];
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-[5px] border px-2 py-0.5 text-xs font-semibold", colors[value] ?? colors.closed, className)}>
      {Icon && <Icon size={13} />}
      {labels[value] ?? value}
    </span>
  );
}
