import { clsx } from "clsx";
import { Clock3, Loader2, MapPin, X } from "lucide-react";
import type { FormEvent } from "react";
import type { Schedule } from "./types";

type BookingFormPanelProps = {
  schedule: Schedule | null;
  error: string;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  mode: "mobile" | "desktop";
  onClose?: () => void;
};

function FormField({
  label,
  name,
  required,
  optional,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={name} className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-stone-800">
        {label}
        {optional && <span className="text-xs font-normal text-stone-500">選填</span>}
      </span>
      {children}
      {required && <span className="sr-only">必填</span>}
    </label>
  );
}

export function BookingFormPanel({ schedule, error, submitting, onSubmit, mode, onClose }: BookingFormPanelProps) {
  const disabled = !schedule || submitting;
  const isWaitlist = Boolean(schedule?.isFull && schedule.waitlistEnabled);

  return (
    <section
      className={clsx(
        "flex min-h-0 flex-col bg-white",
        mode === "desktop" && "overflow-hidden rounded-[8px] border border-stone-200",
        mode === "mobile" && "max-h-[88dvh] rounded-t-[10px]",
      )}
    >
      <div className="flex items-start justify-between border-b border-stone-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold text-emerald-800">步驟 2</p>
          <h2 className="mt-0.5 text-xl font-bold text-stone-950">填寫登記資料</h2>
        </div>
        {mode === "mobile" && (
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-[6px] text-stone-500 hover:bg-stone-100"
            onClick={onClose}
            aria-label="關閉登記表單"
          >
            <X size={21} aria-hidden="true" />
          </button>
        )}
      </div>

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
        <div className={clsx("space-y-4 px-5 py-4", mode === "mobile" && "overflow-y-auto")}>
          <div className="rounded-[7px] bg-emerald-50 px-4 py-3">
            {schedule ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-emerald-900">{schedule.departureTime}</span>
                  <span className="font-semibold text-stone-900">{schedule.routeName}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
                  <span className="flex items-center gap-1"><Clock3 size={14} />{schedule.serviceDate.slice(0, 10)}</span>
                  <span className="flex items-center gap-1"><MapPin size={14} />{schedule.pickupPoint}</span>
                </div>
                {isWaitlist && <p className="mt-2 text-sm font-semibold text-red-700">此班已額滿，送出後將加入候補。</p>}
              </>
            ) : (
              <p className="text-sm text-stone-600">請先從左側選擇車班。</p>
            )}
          </div>

          {error && (
            <div role="alert" className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
              {error}
            </div>
          )}

          <FormField label="員工姓名" name={`${mode}-employeeName`} required>
            <input
              id={`${mode}-employeeName`}
              name="employeeName"
              className="field min-h-12"
              autoComplete="name"
              required
              disabled={disabled}
            />
          </FormField>
          <FormField label="部門" name={`${mode}-department`} required>
            <input id={`${mode}-department`} name="department" className="field min-h-12" required disabled={disabled} />
          </FormField>
          <FormField label="員工編號" name={`${mode}-employeeNo`} optional>
            <input id={`${mode}-employeeNo`} name="employeeNo" className="field min-h-12" autoComplete="off" disabled={disabled} />
          </FormField>
          <FormField label="手機" name={`${mode}-phone`} optional>
            <input
              id={`${mode}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              className="field min-h-12"
              autoComplete="tel"
              disabled={disabled}
            />
          </FormField>
          <FormField label="備註" name={`${mode}-note`} optional>
            <textarea id={`${mode}-note`} name="note" className="field min-h-20 resize-y" disabled={disabled} />
          </FormField>
        </div>

        <div className="mt-auto border-t border-stone-200 bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 lg:pb-5">
          <button type="submit" className="btn btn-primary min-h-12 w-full" disabled={disabled}>
            {submitting && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
            {submitting ? "送出中" : isWaitlist ? "送出候補登記" : "送出登記"}
          </button>
          <p className="mt-2 text-center text-xs text-stone-500">送出後如需取消，請洽 GRO。</p>
        </div>
      </form>
    </section>
  );
}
