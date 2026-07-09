"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, UsersRound } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/status-badge";

type DashboardSchedule = {
  id: string;
  serviceDate: string;
  routeName: string;
  departureTime: string;
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "讀取 Dashboard 失敗");
        setData(payload);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AdminShell title="Dashboard">
      {error && <div className="panel border-orange-300 bg-orange-50 p-4 text-orange-900">{error}</div>}
      {!data && !error && <div className="panel p-4 text-sm text-stone-600">讀取營運資料中...</div>}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ["明日正取", data.summary.confirmed],
              ["明日候補", data.summary.waitlist],
              ["明日取消", data.summary.cancelled],
              ["剩餘名額", data.summary.remaining],
              ["今日新增", data.summary.todayNew],
            ].map(([label, value]) => (
              <div className="panel p-4" key={label}>
                <p className="text-sm text-stone-600">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border p-4">
                <UsersRound size={18} />
                <h2 className="font-bold">明日車班狀態</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>車班</th><th>正取</th><th>候補</th><th>取消</th><th>剩餘</th><th>狀態</th></tr></thead>
                  <tbody>
                    {data.schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td><strong>{schedule.departureTime}</strong> {schedule.routeName}</td>
                        <td>{schedule.confirmedCount}/{schedule.capacity}</td>
                        <td>{schedule.waitlistCount}</td>
                        <td>{schedule.cancelledCount}</td>
                        <td>{schedule.remainingCount}</td>
                        <td>
                          {!schedule.registrationOpen ? <StatusBadge value="closed" /> : schedule.isOverbooked ? <StatusBadge value="overbooked" /> : schedule.isFull ? <StatusBadge value="full" /> : <StatusBadge value="open" />}
                        </td>
                      </tr>
                    ))}
                    {data.schedules.length === 0 && <tr><td colSpan={6}>明日尚無車班。</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="panel p-4">
                <div className="mb-3 flex items-center gap-2"><AlertTriangle size={18} /><h2 className="font-bold">GRO 注意</h2></div>
                <div className="space-y-2">
                  {data.attention.map((schedule) => (
                    <div key={schedule.id} className="rounded-[6px] border border-border p-3 text-sm">
                      <strong>{schedule.departureTime} {schedule.routeName}</strong>
                      <p className="mt-1 text-stone-600">正取 {schedule.confirmedCount}/{schedule.capacity}，候補 {schedule.waitlistCount}</p>
                    </div>
                  ))}
                  {data.attention.length === 0 && <p className="text-sm text-stone-600">目前沒有需要特別處理的車班。</p>}
                </div>
              </div>
            </aside>
          </section>

          <div className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border p-4">
              <ClipboardList size={18} />
              <h2 className="font-bold">最新 10 筆預約</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>時間</th><th>車班</th><th>姓名</th><th>部門</th><th>狀態</th><th>Code</th></tr></thead>
                <tbody>
                  {data.latestBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>{new Date(booking.createdAt).toLocaleString("zh-TW")}</td>
                      <td>{booking.schedule.departureTime} {booking.schedule.routeName}</td>
                      <td>{booking.employeeName}</td>
                      <td>{booking.department}</td>
                      <td><StatusBadge value={booking.status} /></td>
                      <td className="font-mono">{booking.bookingCode}</td>
                    </tr>
                  ))}
                  {data.latestBookings.length === 0 && <tr><td colSpan={6}>尚無預約。</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
