import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Clock3, MinusCircle } from "lucide-react";
import type { ComponentType } from "react";

const labels: Record<string, string> = {
  confirmed: "正取",
  waitlist: "候補",
  cancelled: "已取消",
  open: "可登記",
  full: "額滿候補",
  closed: "已關閉",
  overbooked: "已超收",
};

const colors: Record<string, string> = {
  confirmed: "border-green-700/25 bg-green-700/10 text-green-800",
  waitlist: "border-amber-700/25 bg-amber-700/10 text-amber-800",
  cancelled: "border-stone-500/25 bg-stone-500/10 text-stone-700",
  open: "border-green-700/25 bg-green-700/10 text-green-800",
  full: "border-amber-700/25 bg-amber-700/10 text-amber-800",
  closed: "border-stone-500/25 bg-stone-500/10 text-stone-700",
  overbooked: "border-orange-800/25 bg-orange-800/10 text-orange-900",
};

const icons: Record<string, ComponentType<{ size?: number }>> = {
  confirmed: CheckCircle2,
  waitlist: Clock3,
  cancelled: MinusCircle,
  open: CheckCircle2,
  full: Clock3,
  closed: MinusCircle,
  overbooked: AlertTriangle,
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
