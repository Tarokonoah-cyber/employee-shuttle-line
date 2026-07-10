"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, Route, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button, Card, SkeletonRows } from "@/components/ui";
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
  const [date, setDate] = useState(tomorrowDateInput());
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setError("");
    setLoading(true);
    fetch(`/api/admin/dashboard?date=${date}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "讀取 Dashboard 失敗");
        setData(payload);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <AdminShell title="營運 Dashboard">
      <div className="space-y-6">
        <Card className="flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <p className="quiet-label">Dispatch Overview</p>
            <h1 className="mt-1 text-2xl font-bold">{date} 車班狀態</h1>
            <p className="mt-2 text-sm text-stone-600">10 秒內掌握正取、候補、剩餘名額與需要處理的班次。</p>
          </div>
          <label className="text-sm font-semibold">
            查看日期
            <input className="field mt-1" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </Card>

        {error && <div className="panel border-orange-300 bg-orange-50 p-4 text-orange-900">{error}</div>}
        {loading && <Card><SkeletonRows rows={5} /></Card>}

        {data && !loading && (
          <>
            <div className="grid gap-3 md:grid-cols-5">
              {[
                ["正取", data.summary.confirmed, "已排入車班名單"],
                ["候補", data.summary.waitlist, "依登記時間排序"],
                ["取消", data.summary.cancelled, "保留紀錄可追蹤"],
                ["剩餘名額", data.summary.remaining, "即時控管 capacity"],
                ["今日新增", data.summary.todayNew, "今日送出的登記"],
              ].map(([label, value, hint]) => (
                <Card className="stagger-item p-4" key={label}>
                  <p className="text-sm text-stone-600">{label}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-primary">{value}</p>
                  <p className="mt-2 text-xs text-stone-500">{hint}</p>
                </Card>
              ))}
            </div>

            <Card className="p-5">
              <div className="flex gap-3">
                <ShieldCheck size={20} className="mt-1 text-primary" />
                <div>
                  <h2 className="font-bold">系統價值</h2>
                  <p className="mt-1 text-sm leading-6 text-stone-600">名額即時控管、候補自動排序、GRO 後台管理、名單可匯出與公告。</p>
                </div>
              </div>
            </Card>

            <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <Card className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border p-4">
                  <Route size={18} />
                  <h2 className="font-bold">車班營運狀態</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>時間</th><th>車班</th><th>上車點</th><th>正取</th><th>候補</th><th>剩餘</th><th>狀態</th></tr></thead>
                    <tbody>
                      {data.schedules.map((schedule) => (
                        <tr key={schedule.id}>
                          <td className="font-mono text-lg font-bold text-primary">{schedule.departureTime}</td>
                          <td className="font-semibold">{schedule.routeName}</td>
                          <td>{schedule.pickupPoint}</td>
                          <td>{schedule.confirmedCount}/{schedule.capacity}</td>
                          <td>{schedule.waitlistCount}</td>
                          <td>{schedule.remainingCount}</td>
                          <td>{statusFor(schedule)}</td>
                        </tr>
                      ))}
                      {data.schedules.length === 0 && <tr><td colSpan={7}>此日期尚無車班。</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Card>

              <aside className="space-y-4">
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2"><AlertTriangle size={18} /><h2 className="font-bold">需要注意</h2></div>
                  <div className="space-y-2">
                    {data.attention.map((schedule) => (
                      <div key={schedule.id} className="rounded-[8px] border border-border bg-surface-strong p-3 text-sm">
                        <strong>{schedule.departureTime} {schedule.routeName}</strong>
                        <p className="mt-1 text-stone-600">正取 {schedule.confirmedCount}/{schedule.capacity}，候補 {schedule.waitlistCount}</p>
                        <div className="mt-2">{statusFor(schedule)}</div>
                      </div>
                    ))}
                    {data.attention.length === 0 && <p className="text-sm text-stone-600">目前沒有需要特別處理的車班</p>}
                  </div>
                </Card>
                <Button variant="secondary" className="w-full" onClick={() => setDate(tomorrowDateInput())}>返回明日狀態</Button>
              </aside>
            </section>

            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border p-4">
                <ClipboardList size={18} />
                <h2 className="font-bold">最新 10 筆預約</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>姓名</th><th>部門</th><th>車班</th><th>狀態</th><th>時間</th></tr></thead>
                  <tbody>
                    {data.latestBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="font-semibold">{booking.employeeName}</td>
                        <td>{booking.department}</td>
                        <td>{booking.schedule.departureTime} {booking.schedule.routeName}</td>
                        <td><StatusBadge value={booking.status} /></td>
                        <td>{new Date(booking.createdAt).toLocaleString("zh-TW")}</td>
                      </tr>
                    ))}
                    {data.latestBookings.length === 0 && <tr><td colSpan={5}>尚無預約。</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function statusFor(schedule: DashboardSchedule) {
  if (!schedule.registrationOpen) return <StatusBadge value="closed" />;
  if (schedule.isOverbooked) return <StatusBadge value="overbooked" />;
  if (schedule.isFull) return <StatusBadge value="full" />;
  return <StatusBadge value="open" />;
}
