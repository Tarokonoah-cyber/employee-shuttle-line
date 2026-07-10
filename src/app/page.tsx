"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, Clock, ClipboardList, MapPin, RefreshCw, ShieldCheck, Timer, Users } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button, Card, EmptyState, FieldLabel } from "@/components/ui";
import { tomorrowDateInput } from "@/lib/dates";

type Schedule = {
  id: string;
  serviceDate: string;
  routeName: string;
  departureTime: string;
  pickupPoint: string;
  capacity: number;
  registrationOpen: boolean;
  waitlistEnabled: boolean;
  note?: string | null;
  confirmedCount: number;
  waitlistCount: number;
  remainingCount: number;
  isFull: boolean;
  isOverbooked: boolean;
};

function scheduleState(schedule: Schedule) {
  if (schedule.isOverbooked) return "overbooked";
  if (!schedule.registrationOpen) return "closed";
  if (schedule.isFull) return schedule.waitlistEnabled ? "full" : "closed";
  return "open";
}

function bookingButtonText(schedule: Schedule) {
  if (!schedule.registrationOpen || (!schedule.waitlistEnabled && schedule.isFull)) return "已關閉";
  if (schedule.isFull && schedule.waitlistEnabled) return "登記候補";
  return "選擇車班";
}

export default function Home() {
  const router = useRouter();
  const [date, setDate] = useState(tomorrowDateInput());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const isDevelopment = process.env.NODE_ENV === "development";

  const totals = useMemo(
    () =>
      schedules.reduce(
        (acc, item) => {
          acc.remaining += item.remainingCount;
          acc.waitlist += item.waitlistCount;
          acc.confirmed += item.confirmedCount;
          acc.capacity += item.capacity;
          return acc;
        },
        { remaining: 0, waitlist: 0, confirmed: 0, capacity: 0 },
      ),
    [schedules],
  );

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/schedules?date=${date}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "讀取車班失敗");
        setSchedules(data.schedules);
        setSelected((current) => data.schedules.find((schedule: Schedule) => schedule.id === current?.id) ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [date, reloadKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      scheduleId: selected.id,
      employeeName: String(formData.get("employeeName") ?? ""),
      department: String(formData.get("department") ?? ""),
      employeeNo: String(formData.get("employeeNo") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      note: String(formData.get("note") ?? ""),
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "登記失敗");

      const booking = data.booking;
      const params = new URLSearchParams({
        booking_code: booking.bookingCode,
        status: booking.status,
        date: booking.schedule.serviceDate.slice(0, 10),
        route: booking.schedule.routeName,
        departure_time: booking.schedule.departureTime,
        pickup_point: booking.schedule.pickupPoint,
      });
      router.push(`/booking/success?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登記失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)] lg:px-8 lg:py-8">
        <div className="page-enter space-y-5">
          <Card className="overflow-hidden p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-2xl">
                <p className="quiet-label">Hotel Staff Transport</p>
                <h1 className="mt-2 text-3xl font-bold tracking-normal text-stone-900 sm:text-4xl">員工車登記</h1>
                <p className="mt-3 max-w-[65ch] text-sm leading-6 text-stone-600">
                  選擇車班，系統會即時控管名額與候補狀態。GRO 可以在後台管理名單、匯出 CSV 並複製公告。
                </p>
              </div>
              <label className="min-w-48 text-sm font-semibold">
                登記日期
                <input className="field mt-1" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              {[
                { icon: Calendar, label: "明日車班", value: `${schedules.length} 班` },
                { icon: Users, label: "即時名額", value: `${totals.confirmed}/${totals.capacity}` },
                { icon: Timer, label: "候補排序", value: `${totals.waitlist} 人` },
                { icon: ClipboardList, label: "GRO 管理", value: "後台可控" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-[8px] border border-border bg-surface-strong p-3">
                    <Icon size={17} className="text-primary" />
                    <p className="mt-2 text-xs text-stone-600">{item.label}</p>
                    <p className="mt-0.5 font-bold">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="panel p-4">
              <p className="text-sm text-stone-600">可用車班</p>
              <p className="mt-1 text-2xl font-bold">{schedules.length}</p>
            </div>
            <div className="panel p-4">
              <p className="text-sm text-stone-600">剩餘名額</p>
              <p className="mt-1 text-2xl font-bold">{totals.remaining}</p>
            </div>
            <div className="panel p-4">
              <p className="text-sm text-stone-600">候補人數</p>
              <p className="mt-1 text-2xl font-bold">{totals.waitlist}</p>
            </div>
          </div>

          {loading && (
            <div className="grid gap-3">
              {[0, 1, 2].map((item) => (
                <div className="skeleton h-32 rounded-[10px]" key={item} />
              ))}
            </div>
          )}

          {!loading && error && <div className="panel border-orange-300 bg-orange-50 p-5 text-sm text-orange-900">{error}</div>}

          {!loading && !error && schedules.length === 0 && (
            <EmptyState
              title="此日期尚未建立車班"
              description="目前尚未開放此日期的員工車登記。請稍後再查看，或洽 GRO 確認班次。"
              actions={
                <>
                  <Button type="button" variant="primary" onClick={() => setDate(tomorrowDateInput())}>返回明日</Button>
                  <Button type="button" onClick={() => setReloadKey((value) => value + 1)}><RefreshCw size={16} />重新整理</Button>
                </>
              }
            >
              {isDevelopment && <span>開發環境可執行 npm run seed:demo 建立測試車班。</span>}
            </EmptyState>
          )}

          <div className="grid gap-3">
            {schedules.map((schedule, index) => {
              const isSelected = selected?.id === schedule.id;
              return (
                <article
                  key={schedule.id}
                  className={`stagger-item rounded-[10px] border bg-surface p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-tight)] ${
                    isSelected ? "border-primary shadow-[var(--shadow-soft)]" : "border-border"
                  }`}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="grid gap-4 sm:grid-cols-[110px_1fr_150px] sm:items-center">
                    <div>
                      <p className="text-sm text-stone-600">發車</p>
                      <p className="font-mono text-3xl font-bold text-primary">{schedule.departureTime}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold">{schedule.routeName}</h2>
                        <StatusBadge value={scheduleState(schedule)} />
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                        <span className="flex items-center gap-2"><Calendar size={16} />{schedule.serviceDate.slice(0, 10)}</span>
                        <span className="flex items-center gap-2"><MapPin size={16} />{schedule.pickupPoint}</span>
                        <span className="flex items-center gap-2"><Users size={16} />正取 {schedule.confirmedCount}/{schedule.capacity}</span>
                        <span className="flex items-center gap-2"><Clock size={16} />候補 {schedule.waitlistCount} 人</span>
                      </div>
                    </div>
                    <div className="rounded-[8px] bg-muted p-3">
                      <p className="text-sm text-stone-600">剩餘名額</p>
                      <p className="text-2xl font-bold">{schedule.remainingCount}</p>
                      <Button
                        type="button"
                        variant="primary"
                        className="mt-3 w-full"
                        disabled={!schedule.registrationOpen || (!schedule.waitlistEnabled && schedule.isFull)}
                        onClick={() => setSelected(schedule)}
                      >
                        <CheckCircle2 size={16} />
                        {bookingButtonText(schedule)}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <Card className="p-5">
            <p className="quiet-label">為什麼改用系統登記</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["名額自動控管", "避免 LINE 接龍超收，正取與候補由系統判斷。"],
                ["候補自動排序", "依登記時間保留順序，GRO 不必人工重算。"],
                ["GRO 後台管理", "可匯出名單並複製公告，班次狀態集中查看。"],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-[8px] border border-border bg-surface-strong p-4">
                  <ShieldCheck size={18} className="text-primary" />
                  <h3 className="mt-3 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{copy}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="page-enter executive-card h-fit p-5 lg:sticky lg:top-6">
          <div>
            <p className="quiet-label">Booking Form</p>
            <h2 className="mt-1 text-xl font-bold">登記表單</h2>
          </div>
          <div className="mt-4 rounded-[8px] border border-border bg-surface-strong p-4">
            <p className="text-sm font-semibold text-stone-700">已選車班</p>
            {selected ? (
              <div className="mt-2">
                <p className="font-mono text-2xl font-bold text-primary">{selected.departureTime}</p>
                <p className="font-bold">{selected.serviceDate.slice(0, 10)} {selected.routeName}</p>
                <p className="mt-1 text-sm text-stone-600">{selected.pickupPoint}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-stone-600">請先選擇左側車班。選定後即可填寫資料。</p>
            )}
          </div>
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <FieldLabel label="員工姓名" required>
              <input name="employeeName" className="field" placeholder="例如：王小明" required disabled={!selected || submitting} />
            </FieldLabel>
            <FieldLabel label="部門" required>
              <input name="department" className="field" placeholder="例如：房務部" required disabled={!selected || submitting} />
            </FieldLabel>
            <FieldLabel label="員工編號">
              <input name="employeeNo" className="field" placeholder="可選填，用於避免重複登記" disabled={!selected || submitting} />
            </FieldLabel>
            <FieldLabel label="手機">
              <input name="phone" className="field" placeholder="可選填" disabled={!selected || submitting} />
            </FieldLabel>
            <FieldLabel label="備註">
              <textarea name="note" className="field min-h-20" placeholder="可填寫臨時需求或提醒" disabled={!selected || submitting} />
            </FieldLabel>
            {error && <p className="rounded-[6px] border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">{error}</p>}
            <Button variant="primary" className="w-full" disabled={!selected} loading={submitting}>
              {submitting ? "送出中" : selected?.isFull && selected.waitlistEnabled ? "送出候補登記" : "送出登記"}
            </Button>
            <p className="text-xs leading-5 text-stone-600">請確認日期、發車時間與上車點。送出後如需取消，請洽 GRO 協助。</p>
          </form>
        </aside>
      </section>
    </main>
  );
}
