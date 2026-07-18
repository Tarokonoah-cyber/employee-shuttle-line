import { clsx } from "clsx";
import { Clock3, Loader2, MapPin, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Schedule } from "./types";
import type { LineProfileView } from "@/lib/line-profile-view";

type BookingFormPanelProps = {
  schedule: Schedule | null;
  error: string;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  mode: "mobile" | "desktop";
  onClose?: () => void;
  profile?: LineProfileView | null;
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

export function BookingFormPanel({ schedule, error, submitting, onSubmit, mode, onClose, profile }: BookingFormPanelProps) {
  const [requiredErrors, setRequiredErrors] = useState({ employeeName: "", department: "" });
  const disabled = !schedule || submitting;
  const isWaitlist = Boolean(schedule?.isFull && schedule.waitlistEnabled);

  function submitWithValidation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextErrors = {
      employeeName: String(formData.get("employeeName") ?? "").trim() ? "" : "請填寫員工姓名",
      department: String(formData.get("department") ?? "").trim() ? "" : "請填寫部門",
    };

    setRequiredErrors(nextErrors);
    const firstInvalidName = nextErrors.employeeName ? "employeeName" : nextErrors.department ? "department" : "";
    if (firstInvalidName) {
      const firstInvalidElement = event.currentTarget.elements.namedItem(firstInvalidName) as HTMLInputElement | null;
      firstInvalidElement?.scrollIntoView({ block: "center" });
      firstInvalidElement?.focus();
      return;
    }

    onSubmit(event);
  }

  function clearRequiredError(name: "employeeName" | "department") {
    if (!requiredErrors[name]) return;
    setRequiredErrors((current) => ({ ...current, [name]: "" }));
  }

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

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitWithValidation} noValidate>
        <div className={clsx("space-y-4 px-5 py-4", mode === "mobile" && "overscroll-contain overflow-y-auto scroll-pb-5")}>
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

          {profile && (
            <div className="rounded-[6px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-6 text-emerald-900">
              已驗證 LINE 身分{profile.lineDisplayName ? `：${profile.lineDisplayName}` : ""}。系統會記住本次資料，下次使用同一個 LINE 帳號開啟時自動帶入。
            </div>
          )}

          <FormField label="員工姓名" name={`${mode}-employeeName`} required>
            <input
              id={`${mode}-employeeName`}
              name="employeeName"
              className={clsx("field min-h-12", requiredErrors.employeeName && "border-red-400 bg-red-50")}
              autoComplete="name"
              defaultValue={profile?.employeeName ?? ""}
              required
              disabled={disabled}
              aria-invalid={Boolean(requiredErrors.employeeName)}
              aria-describedby={requiredErrors.employeeName ? `${mode}-employeeName-error` : undefined}
              onChange={() => clearRequiredError("employeeName")}
            />
            {requiredErrors.employeeName && (
              <span id={`${mode}-employeeName-error`} className="mt-1.5 block text-sm font-medium text-red-700">
                {requiredErrors.employeeName}
              </span>
            )}
          </FormField>
          <FormField label="部門" name={`${mode}-department`} required>
            <input
              id={`${mode}-department`}
              name="department"
              className={clsx("field min-h-12", requiredErrors.department && "border-red-400 bg-red-50")}
              defaultValue={profile?.department ?? ""}
              required
              disabled={disabled}
              aria-invalid={Boolean(requiredErrors.department)}
              aria-describedby={requiredErrors.department ? `${mode}-department-error` : undefined}
              onChange={() => clearRequiredError("department")}
            />
            {requiredErrors.department && (
              <span id={`${mode}-department-error`} className="mt-1.5 block text-sm font-medium text-red-700">
                {requiredErrors.department}
              </span>
            )}
          </FormField>
          <FormField label="員工編號" name={`${mode}-employeeNo`} optional>
            <input id={`${mode}-employeeNo`} name="employeeNo" className="field min-h-12" autoComplete="off" defaultValue={profile?.employeeNo ?? ""} disabled={disabled} />
          </FormField>
          <FormField label="手機" name={`${mode}-phone`} optional>
            <input
              id={`${mode}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              className="field min-h-12"
              autoComplete="tel"
              defaultValue={profile?.phone ?? ""}
              disabled={disabled}
            />
          </FormField>
          <FormField label="上車點" name={`${mode}-pickupPoint`}>
            <input
              id={`${mode}-pickupPoint`}
              className="field min-h-12 bg-stone-100"
              value={schedule?.pickupPoint ?? profile?.defaultPickupLocation ?? "請先選擇車班"}
              readOnly
              aria-describedby={`${mode}-pickupPoint-help`}
            />
            <span id={`${mode}-pickupPoint-help`} className="mt-1.5 block text-xs leading-5 text-stone-500">上車點依所選車班設定，送出後會記為常用上車點。</span>
          </FormField>
          <FormField label="備註" name={`${mode}-note`} optional>
            <textarea id={`${mode}-note`} name="note" className="field min-h-20 resize-y" disabled={disabled} />
          </FormField>
        </div>

        <div className="mt-auto shrink-0 border-t border-stone-200 bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 lg:pb-5">
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
