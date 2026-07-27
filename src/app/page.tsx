"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { BookingFormPanel } from "@/components/booking/booking-form-panel";
import { BottomActionBar } from "@/components/booking/bottom-action-bar";
import { DateSwitcher } from "@/components/booking/date-switcher";
import { EmptyScheduleState } from "@/components/booking/empty-schedule-state";
import { LoadingScheduleSkeleton } from "@/components/booking/loading-schedule-skeleton";
import { MobilePageHeader } from "@/components/booking/mobile-page-header";
import { ShuttleCard } from "@/components/booking/shuttle-card";
import type { Schedule } from "@/components/booking/types";
import { addDaysToDateInput, tomorrowDateInput } from "@/lib/dates";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";
import type { LineProfileView } from "@/lib/line-profile-view";
import Link from "next/link";

export function BookingPortal({ profile = null }: { profile?: LineProfileView | null }) {
  const router = useRouter();
  const [date, setDate] = useState(tomorrowDateInput());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [formError, setFormError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    const controller = new AbortController();

    async function loadSchedules() {
      setLoading(true);
      setScheduleError("");

      try {
        const response = await fetchWithTimeout(`/api/schedules?date=${date}`, { signal: controller.signal });
        const data = await readJsonResponse<{ schedules: Schedule[]; error?: string }>(response, "讀取車班失敗");
        if (!response.ok) throw new Error(data.error ?? "讀取車班失敗");
        setSchedules(data.schedules);
        setSelected((current) => data.schedules.find((schedule: Schedule) => schedule.id === current?.id) ?? null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setScheduleError(error instanceof Error ? error.message : "讀取車班失敗");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadSchedules();
    return () => controller.abort();
  }, [date, reloadKey]);

  function changeDate(nextDate: string) {
    if (!nextDate) return;
    setDate(nextDate);
    setSelected(null);
    setFormOpen(false);
    setFormError("");
  }

  function selectSchedule(schedule: Schedule) {
    setSelected(schedule);
    setFormError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    setSubmitting(true);
    setFormError("");
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetchWithTimeout("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: selected.id,
          employeeName: String(formData.get("employeeName") ?? ""),
          department: String(formData.get("department") ?? ""),
          employeeNo: String(formData.get("employeeNo") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          note: String(formData.get("note") ?? ""),
        }),
      });
      const data = await readJsonResponse<{
        successUrl?: string;
        error?: string;
      }>(response, "登記失敗");
      if (!response.ok) throw new Error(data.error ?? "登記失敗");
      if (!data.successUrl) throw new Error("登記完成，但無法開啟報名結果");
      router.push(new URL(data.successUrl).pathname);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "登記失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f3] text-stone-950">
      <MobilePageHeader />

      <div className={`mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:py-6 ${selected ? "pb-28 lg:pb-6" : ""}`}>
        <section className="min-w-0">
          <DateSwitcher
            value={date}
            onChange={changeDate}
            onPrevious={() => changeDate(addDaysToDateInput(date, -1))}
            onNext={() => changeDate(addDaysToDateInput(date, 1))}
          />

          <div className="mb-3 mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-emerald-800">步驟 1</p>
              <h2 className="mt-0.5 text-lg font-bold">選擇車班</h2>
            </div>
            {!loading && !scheduleError && <p className="text-sm text-stone-500">共 {schedules.length} 班</p>}
          </div>

          {loading && <LoadingScheduleSkeleton />}

          {!loading && scheduleError && (
            <div className="rounded-[8px] border border-red-200 bg-white px-5 py-6 text-center">
              <AlertCircle size={25} className="mx-auto text-red-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-red-800">{scheduleError}</p>
              <button type="button" className="btn btn-secondary mt-4" onClick={() => setReloadKey((value) => value + 1)}>
                <RefreshCw size={16} aria-hidden="true" />重新整理
              </button>
            </div>
          )}

          {!loading && !scheduleError && schedules.length === 0 && (
            <EmptyScheduleState
              onTomorrow={() => changeDate(tomorrowDateInput())}
              onRefresh={() => setReloadKey((value) => value + 1)}
              showSeedHint={isDevelopment}
            />
          )}

          {!loading && !scheduleError && schedules.length > 0 && (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <ShuttleCard
                  key={schedule.id}
                  schedule={schedule}
                  selected={selected?.id === schedule.id}
                  onSelect={selectSchedule}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="hidden lg:block lg:sticky lg:top-6 lg:h-fit">
          <BookingFormPanel
            mode="desktop"
            schedule={selected}
            error={formError}
            submitting={submitting}
            onSubmit={submit}
            profile={profile}
          />
        </aside>
      </div>

      {selected && <BottomActionBar schedule={selected} onContinue={() => setFormOpen(true)} />}

      <Dialog.Root open={formOpen} onOpenChange={setFormOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] lg:hidden" />
          <Dialog.Content className="sheet-enter fixed inset-x-0 bottom-0 z-50 outline-none lg:hidden" aria-describedby={undefined}>
            <Dialog.Title className="sr-only">完成員工車登記</Dialog.Title>
            <BookingFormPanel
              mode="mobile"
              schedule={selected}
              error={formError}
              submitting={submitting}
              onSubmit={submit}
              onClose={() => setFormOpen(false)}
              profile={profile}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

export default function Home() {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim();
  if (!liffId) return <BookingPortal />;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-12">
      <section className="panel w-full max-w-md p-6 text-center">
        <AlertCircle className="mx-auto text-primary" size={32} aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold">請從 LINE 官方帳號開啟</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">員工車登記需要驗證 LINE 身分，請回到「太魯閣員工服務台」點選員工車登記。</p>
        <Link className="btn btn-primary mt-5" href={`https://liff.line.me/${encodeURIComponent(liffId)}`}>開啟 LINE 員工車登記</Link>
      </section>
    </main>
  );
}
