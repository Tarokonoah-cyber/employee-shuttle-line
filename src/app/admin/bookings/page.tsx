"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clipboard, Download, Plus, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/status-badge";
import { tomorrowDateInput } from "@/lib/dates";

type Schedule = { id: string; serviceDate: string; routeName: string; departureTime: string; pickupPoint: string; capacity: number };
type Booking = {
  id: string;
  employeeName: string;
  department: string;
  employeeNo?: string | null;
  phone?: string | null;
  status: string;
  bookingCode: string;
  note?: string | null;
  adminOverride: boolean;
  createdAt: string;
  cancelledAt?: string | null;
  scheduleId: string;
  schedule: Schedule;
};

const emptyAdd = { scheduleId: "", employeeName: "", department: "", employeeNo: "", phone: "", note: "", adminOverride: false };

export default function AdminBookingsPage() {
  const [date, setDate] = useState(tomorrowDateInput());
  const [status, setStatus] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [message, setMessage] = useState("");
  const [lineCopy, setLineCopy] = useState("");
  const [loading, setLoading] = useState(false);

  const scheduleOptions = useMemo(() => schedules.map((schedule) => ({
    value: schedule.id,
    label: `${schedule.serviceDate.slice(0, 10)} ${schedule.departureTime} ${schedule.routeName}`,
  })), [schedules]);

  async function loadSchedules() {
    const response = await fetch(`/api/admin/schedules?date=${date}`);
    const data = await response.json();
    if (response.ok) setSchedules(data.schedules);
  }

  async function loadBookings() {
    setLoading(true);
    setMessage("");
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (status) params.set("status", status);
    if (scheduleId) params.set("schedule_id", scheduleId);
    if (keyword) params.set("keyword", keyword);
    try {
      const response = await fetch(`/api/admin/bookings?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "讀取預約失敗");
      setBookings(data.bookings);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "讀取預約失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedules();
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    await loadBookings();
  }

  async function addBooking(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const data = await response.json();
    setMessage(response.ok ? "預約已新增" : data.error ?? "新增失敗");
    if (response.ok) {
      setAddForm(emptyAdd);
      await loadBookings();
    }
  }

  async function action(url: string, body?: unknown, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });
    const data = await response.json();
    setMessage(response.ok ? data.message ?? "操作已完成" : data.error ?? "操作失敗");
    if (response.ok) await loadBookings();
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const response = await fetch(`/api/admin/bookings/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const data = await response.json();
    setMessage(response.ok ? "預約已更新" : data.error ?? "更新失敗");
    if (response.ok) {
      setEditing(null);
      await loadBookings();
    }
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (scheduleId) params.set("schedule_id", scheduleId);
    params.set("include_waitlist", "true");
    params.set("include_cancelled", "true");
    window.location.href = `/api/admin/export?${params.toString()}`;
  }

  async function copyLineText() {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (scheduleId) params.set("schedule_id", scheduleId);
    const response = await fetch(`/api/admin/line-copy?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "產生公告失敗");
      return;
    }
    setLineCopy(data.text);
    await navigator.clipboard.writeText(data.text);
    setMessage("公告文字已複製到剪貼簿");
  }

  return (
    <AdminShell title="預約名單">
      <div className="space-y-6">
        <form className="panel flex flex-wrap items-end gap-3 p-4" onSubmit={search}>
          <label className="text-sm font-semibold">日期<input className="field mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="text-sm font-semibold">車班<select className="field mt-1 min-w-56" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}><option value="">全部車班</option>{scheduleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="text-sm font-semibold">狀態<select className="field mt-1" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">全部</option><option value="confirmed">正取</option><option value="waitlist">候補</option><option value="cancelled">已取消</option></select></label>
          <label className="text-sm font-semibold">搜尋<input className="field mt-1" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="姓名、部門、編號、手機" /></label>
          <button className="btn btn-primary" disabled={loading}><RefreshCw size={16} />查詢</button>
          <button className="btn btn-secondary" type="button" onClick={exportCsv}><Download size={16} />匯出 CSV</button>
          <button className="btn btn-secondary" type="button" onClick={copyLineText}><Clipboard size={16} />LINE 複製名單</button>
        </form>

        {message && <div className="panel p-3 text-sm">{message}</div>}
        {lineCopy && <textarea className="field min-h-48 font-mono text-sm" value={lineCopy} readOnly />}

        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <form className="panel h-fit space-y-3 p-4" onSubmit={addBooking}>
            <div className="flex items-center gap-2"><Plus size={18} /><h2 className="font-bold">手動新增預約</h2></div>
            <label className="block text-sm font-semibold">車班<select className="field mt-1" value={addForm.scheduleId} onChange={(e) => setAddForm({ ...addForm, scheduleId: e.target.value })} required><option value="">選擇車班</option>{scheduleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="block text-sm font-semibold">員工姓名<input className="field mt-1" value={addForm.employeeName} onChange={(e) => setAddForm({ ...addForm, employeeName: e.target.value })} required /></label>
            <label className="block text-sm font-semibold">部門<input className="field mt-1" value={addForm.department} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })} required /></label>
            <label className="block text-sm font-semibold">員工編號<input className="field mt-1" value={addForm.employeeNo} onChange={(e) => setAddForm({ ...addForm, employeeNo: e.target.value })} /></label>
            <label className="block text-sm font-semibold">手機<input className="field mt-1" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} /></label>
            <label className="block text-sm font-semibold">備註<textarea className="field mt-1 min-h-20" value={addForm.note} onChange={(e) => setAddForm({ ...addForm, note: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={addForm.adminOverride} onChange={(e) => setAddForm({ ...addForm, adminOverride: e.target.checked })} />強制加入，允許超收</label>
            <button className="btn btn-primary w-full">新增預約</button>
          </form>

          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>車班</th><th>員工</th><th>狀態</th><th>Code</th><th>備註</th><th>時間</th><th>操作</th></tr></thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>{booking.schedule.serviceDate.slice(0, 10)}<br /><strong>{booking.schedule.departureTime}</strong> {booking.schedule.routeName}</td>
                      <td><strong>{booking.employeeName}</strong><br /><span className="text-xs text-stone-600">{booking.department} {booking.employeeNo ?? ""} {booking.phone ?? ""}</span></td>
                      <td><div className="flex flex-col gap-1"><StatusBadge value={booking.status} />{booking.adminOverride && <StatusBadge value="overbooked" />}</div></td>
                      <td className="font-mono text-xs">{booking.bookingCode}</td>
                      <td>{booking.note}</td>
                      <td><span className="text-xs">{new Date(booking.createdAt).toLocaleString("zh-TW")}</span>{booking.cancelledAt && <><br /><span className="text-xs text-stone-600">取消 {new Date(booking.cancelledAt).toLocaleString("zh-TW")}</span></>}</td>
                      <td>
                        <div className="flex min-w-72 flex-wrap gap-2">
                          <button className="btn btn-secondary" onClick={() => setEditing(booking)}>編輯</button>
                          {booking.status !== "cancelled" && <button className="btn btn-secondary" onClick={() => action(`/api/admin/bookings/${booking.id}/cancel`, undefined, "確定取消此預約？")}>取消</button>}
                          {booking.status === "waitlist" && <button className="btn btn-secondary" onClick={() => action(`/api/admin/bookings/${booking.id}/confirm`, { adminOverride: false })}>轉正取</button>}
                          {booking.status === "waitlist" && <button className="btn btn-secondary" onClick={() => action(`/api/admin/bookings/${booking.id}/confirm`, { adminOverride: true }, "確定強制轉正取並允許超收？")}>強制轉正取</button>}
                          <select className="field max-w-44" defaultValue="" onChange={(e) => e.target.value && action(`/api/admin/bookings/${booking.id}/change-schedule`, { scheduleId: e.target.value, adminOverride: false })}>
                            <option value="">改車班</option>
                            {scheduleOptions.filter((option) => option.value !== booking.scheduleId).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && <tr><td colSpan={7}>{loading ? "讀取中..." : "沒有符合條件的預約。"}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {editing && (
          <form className="panel fixed inset-x-4 bottom-4 z-20 mx-auto max-w-3xl space-y-3 p-4 shadow-lg" onSubmit={saveEdit}>
            <h2 className="font-bold">編輯預約：{editing.bookingCode}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold">員工姓名<input className="field mt-1" value={editing.employeeName} onChange={(e) => setEditing({ ...editing, employeeName: e.target.value })} /></label>
              <label className="text-sm font-semibold">部門<input className="field mt-1" value={editing.department} onChange={(e) => setEditing({ ...editing, department: e.target.value })} /></label>
              <label className="text-sm font-semibold">員工編號<input className="field mt-1" value={editing.employeeNo ?? ""} onChange={(e) => setEditing({ ...editing, employeeNo: e.target.value })} /></label>
              <label className="text-sm font-semibold">手機<input className="field mt-1" value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></label>
            </div>
            <label className="block text-sm font-semibold">備註<textarea className="field mt-1 min-h-20" value={editing.note ?? ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></label>
            <div className="flex justify-end gap-2"><button className="btn btn-secondary" type="button" onClick={() => setEditing(null)}>取消</button><button className="btn btn-primary">儲存變更</button></div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}
