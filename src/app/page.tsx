"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, Clock, MapPin, Users } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

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

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function scheduleState(schedule: Schedule) {
  if (schedule.isOverbooked) return "overbooked";
  if (!schedule.registrationOpen) return "closed";
  if (schedule.isFull) return schedule.waitlistEnabled ? "full" : "closed";
  return "open";
}

export default function Home() {
  const router = useRouter();
  const [date, setDate] = useState(tomorrow());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const totalRemaining = useMemo(() => schedules.reduce((sum, item) => sum + item.remainingCount, 0), [schedules]);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/schedules?date=${date}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "讀取車班失敗");
        setSchedules(data.schedules);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [date]);

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
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-5 lg:grid-cols-[1fr_380px] lg:px-8 lg:py-8">
        <div className="space-y-4">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-sm font-semibold text-primary">員工車登記</p>
              <h1 className="mt-1 text-2xl font-bold tracking-normal">選擇車班並完成上車登記</h1>
              <p className="mt-2 text-sm text-stone-600">前台只顯示名額狀態，不公開完整員工名單。</p>
            </div>
            <label className="min-w-44 text-sm font-semibold">
              登記日期
              <input className="field mt-1" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
          </header>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="panel p-4">
              <p className="text-sm text-stone-600">車班數</p>
              <p className="mt-1 text-2xl font-bold">{schedules.length}</p>
            </div>
            <div className="panel p-4">
              <p className="text-sm text-stone-600">總剩餘名額</p>
              <p className="mt-1 text-2xl font-bold">{totalRemaining}</p>
            </div>
            <div className="panel p-4">
              <p className="text-sm text-stone-600">候補人數</p>
              <p className="mt-1 text-2xl font-bold">{schedules.reduce((sum, item) => sum + item.waitlistCount, 0)}</p>
            </div>
          </div>

          {loading && <div className="panel p-5 text-sm text-stone-600">讀取車班中...</div>}
          {!loading && error && <div className="panel border-orange-300 bg-orange-50 p-5 text-sm text-orange-900">{error}</div>}
          {!loading && !error && schedules.length === 0 && <div className="panel p-5 text-sm text-stone-600">此日期尚未開放車班。</div>}

          <div className="grid gap-3">
            {schedules.map((schedule) => (
              <article key={schedule.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold">{schedule.routeName}</h2>
                      <StatusBadge value={scheduleState(schedule)} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                      <span className="flex items-center gap-2"><Calendar size={16} />{schedule.serviceDate.slice(0, 10)}</span>
                      <span className="flex items-center gap-2"><Clock size={16} />{schedule.departureTime}</span>
                      <span className="flex items-center gap-2"><MapPin size={16} />{schedule.pickupPoint}</span>
                      <span className="flex items-center gap-2"><Users size={16} />正取 {schedule.confirmedCount}/{schedule.capacity}，候補 {schedule.waitlistCount}</span>
                    </div>
                    {schedule.note && <p className="mt-3 text-sm text-stone-600">{schedule.note}</p>}
                  </div>
                  <div className="min-w-28 text-right">
                    <p className="text-sm text-stone-600">剩餘名額</p>
                    <p className="text-2xl font-bold">{schedule.remainingCount}</p>
                    <button
                      className="btn btn-primary mt-3 w-full"
                      disabled={!schedule.registrationOpen || (!schedule.waitlistEnabled && schedule.isFull)}
                      onClick={() => setSelected(schedule)}
                    >
                      <CheckCircle2 size={16} />
                      登記
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel h-fit p-4 lg:sticky lg:top-6">
          <h2 className="text-lg font-bold">登記表單</h2>
          <p className="mt-1 text-sm text-stone-600">{selected ? `${selected.departureTime} ${selected.routeName}` : "請先選擇左側車班"}</p>
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <label className="block text-sm font-semibold">員工姓名<input name="employeeName" className="field mt-1" required disabled={!selected || submitting} /></label>
            <label className="block text-sm font-semibold">部門<input name="department" className="field mt-1" required disabled={!selected || submitting} /></label>
            <label className="block text-sm font-semibold">員工編號<input name="employeeNo" className="field mt-1" disabled={!selected || submitting} /></label>
            <label className="block text-sm font-semibold">手機<input name="phone" className="field mt-1" disabled={!selected || submitting} /></label>
            <label className="block text-sm font-semibold">備註<textarea name="note" className="field mt-1 min-h-20" disabled={!selected || submitting} /></label>
            {error && <p className="rounded-[6px] border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">{error}</p>}
            <button className="btn btn-primary w-full" disabled={!selected || submitting}>{submitting ? "送出中..." : "送出登記"}</button>
          </form>
        </aside>
      </section>
    </main>
  );
}
