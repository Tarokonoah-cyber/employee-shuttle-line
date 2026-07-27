"use client";

import { Suspense, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, ResponsiveDataList, SectionHeader, StatStrip } from "@/components/admin/admin-ui";
import { StatusBadge } from "@/components/status-badge";
import { Card, SkeletonRows } from "@/components/ui";
import { adminDateHref, bookingListHref, validAdminDate } from "@/lib/admin-filters";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";
import { tomorrowDateInput } from "@/lib/dates";

type DashboardSchedule = {
  id: string;
  serviceDate: string;
  routeName: string;
  departureTime: string;
  pickupPoint: string;
  capacity: number;
  registrationOpen: boolean;
  confirmedCount: number;
  waitlistCount: number;
  cancelledCount: number;
  remainingCount: number;
  isFull: boolean;
  isOverbooked: boolean;
  cancelledAt?: string | null;
};

type DashboardData = {
  date: string;
  summary: { confirmed: number; waitlist: number; cancelled: number; remaining: number; todayNew: number };
  schedules: DashboardSchedule[];
  latestBookings: Array<{
    id: string;
    employeeName: string;
    department: string;
    status: string;
    bookingCode: string;
    createdAt: string;
    schedule: { routeName: string; departureTime: string };
  }>;
  attention: DashboardSchedule[];
};

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<Card><SkeletonRows rows={7} /></Card>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [date, setDate] = useState(() => validAdminDate(searchParams.get("date"), tomorrowDateInput()));
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setError("");
    setLoading(true);
    fetchWithTimeout(`/api/admin/dashboard?date=${date}`)
      .then(async (response) => {
        const payload = await readJsonResponse<DashboardData & { error?: string }>(response, "讀取 Dashboard 失敗");
        if (!response.ok) throw new Error(payload.error ?? "讀取 Dashboard 失敗");
        setData(payload);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "讀取 Dashboard 失敗"))
      .finally(() => setLoading(false));
  }, [date]);

  function changeDate(nextDate: string) {
    setDate(nextDate);
    router.replace(adminDateHref("/admin/dashboard", nextDate), { scroll: false });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="營運概覽"
        title={`${date} 調度狀況`}
        description="先處理候補、額滿與超收，再查看完整車班及最新登記。"
        actions={
          <label className="text-sm font-semibold">
            查看日期
            <input className="field mt-1 min-w-44" type="date" value={date} onChange={(event) => changeDate(event.target.value)} />
          </label>
        }
      />

      {error && <div className="panel border-orange-300 bg-orange-50 p-4 text-orange-900" role="alert">{error}</div>}
      {loading && <Card><SkeletonRows rows={6} /></Card>}

      {data && !loading && (
        <>
          <StatStrip
            items={[
              { label: "正取", value: data.summary.confirmed },
              { label: "候補", value: data.summary.waitlist, tone: data.summary.waitlist ? "warning" : "default" },
              { label: "剩餘名額", value: data.summary.remaining },
              { label: "今日新增", value: data.summary.todayNew },
            ]}
          />

          {data.attention.length > 0 && (
            <section className="rounded-[10px] border border-amber-700/25 bg-amber-50">
              <div className="flex items-center gap-2 border-b border-amber-700/15 px-4 py-3">
                <AlertTriangle size={18} className="text-amber-800" />
                <div>
                  <h2 className="font-bold text-amber-950">需要留意</h2>
                  <p className="text-xs text-amber-900/70">候補、額滿或超收的班次應優先確認。</p>
                </div>
              </div>
              <div className="grid gap-px bg-amber-700/15 md:grid-cols-2 xl:grid-cols-3">
                {data.attention.map((schedule) => (
                  <Link
                    key={schedule.id}
                    href={bookingListHref({
                      date,
                      status: schedule.waitlistCount > 0 ? "waitlist" : "",
                      scheduleId: schedule.id,
                    })}
                    className="group flex items-center justify-between gap-3 bg-amber-50 p-4 transition hover:bg-amber-100"
                  >
                    <div>
                      <p className="font-bold">{schedule.departureTime} {schedule.routeName}</p>
                      <p className="mt-1 text-sm text-stone-600">正取 {schedule.confirmedCount}/{schedule.capacity}，候補 {schedule.waitlistCount}</p>
                      <div className="mt-2">{statusFor(schedule)}</div>
                    </div>
                    <ArrowRight size={18} className="shrink-0 text-amber-800 transition group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card className="overflow-hidden">
              <SectionHeader
                title="車班狀況"
                description="名額、候補及開放狀態"
                actions={<Link className="btn btn-secondary" href={adminDateHref("/admin/schedules", date)}>管理車班<ArrowRight size={15} /></Link>}
              />
              {data.schedules.length === 0 ? (
                <p className="p-6 text-sm text-stone-600">此日期尚無車班。</p>
              ) : (
                <ResponsiveDataList
                  desktop={
                    <table className="table">
                      <thead><tr><th>時間／車班</th><th>上車點</th><th>正取</th><th>候補</th><th>剩餘</th><th>狀態</th></tr></thead>
                      <tbody>
                        {data.schedules.map((schedule) => (
                          <tr key={schedule.id}>
                            <td><strong className="font-mono text-primary">{schedule.departureTime}</strong><br /><span className="text-sm font-semibold">{schedule.routeName}</span></td>
                            <td>{schedule.pickupPoint}</td>
                            <td>{schedule.confirmedCount}/{schedule.capacity}</td>
                            <td>{schedule.waitlistCount}</td>
                            <td>{schedule.remainingCount}</td>
                            <td>{statusFor(schedule)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                  mobile={data.schedules.map((schedule) => (
                    <Link key={schedule.id} href={bookingListHref({ date, scheduleId: schedule.id })} className="rounded-[8px] border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="font-mono text-xl font-bold text-primary">{schedule.departureTime}</p><p className="font-semibold">{schedule.routeName}</p></div>
                        {statusFor(schedule)}
                      </div>
                      <p className="mt-2 text-sm text-stone-600">正取 {schedule.confirmedCount}/{schedule.capacity}，候補 {schedule.waitlistCount}，剩餘 {schedule.remainingCount}</p>
                    </Link>
                  ))}
                />
              )}
            </Card>

            <Card className="overflow-hidden">
              <SectionHeader title="最新登記" description="最近 10 筆預約異動" actions={<ClipboardList size={18} />} />
              <div className="divide-y divide-border">
                {data.latestBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={bookingListHref({ date, keyword: booking.bookingCode })}
                    className="flex items-start justify-between gap-3 p-4 transition hover:bg-surface-strong"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{booking.employeeName}</p>
                      <p className="mt-1 truncate text-sm text-stone-600">{booking.department} · {booking.schedule.departureTime} {booking.schedule.routeName}</p>
                      <p className="mt-1 text-xs text-stone-500">{new Date(booking.createdAt).toLocaleString("zh-TW")}</p>
                    </div>
                    <StatusBadge value={booking.status} />
                  </Link>
                ))}
                {data.latestBookings.length === 0 && <p className="p-5 text-sm text-stone-600">尚無預約。</p>}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function statusFor(schedule: DashboardSchedule) {
  if (schedule.cancelledAt) return <StatusBadge value="schedule_cancelled" />;
  if (!schedule.registrationOpen) return <StatusBadge value="closed" />;
  if (schedule.isOverbooked) return <StatusBadge value="overbooked" />;
  if (schedule.isFull) return <StatusBadge value="full" />;
  return <StatusBadge value="open" />;
}
