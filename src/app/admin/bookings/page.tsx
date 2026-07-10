"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clipboard, Download, Pencil, Plus, RefreshCw, Search, UserPlus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button, Card, EmptyState, FieldLabel, SkeletonRows } from "@/components/ui";
import { tomorrowDateInput } from "@/lib/dates";

type Schedule = {
  id: string;
  serviceDate: string;
  routeName: string;
  departureTime: string;
  pickupPoint: string;
  capacity: number;
};

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

  const scheduleOptions = useMemo(
    () =>
      schedules.map((schedule) => ({
        value: schedule.id,
        label: `${schedule.serviceDate.slice(0, 10)} ${schedule.departureTime} ${schedule.routeName}`,
      })),
    [schedules],
  );

  const totals = useMemo(
    () => ({
      confirmed: bookings.filter((booking) => booking.status === "confirmed").length,
      waitlist: bookings.filter((booking) => booking.status === "waitlist").length,
      cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
    }),
    [bookings],
  );

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
        <Card className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="quiet-label">Booking Control</p>
              <h1 className="mt-1 text-2xl font-bold">員工登記名單</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">篩選、匯出、LINE 公告與候補轉正取都集中在這裡。</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="正取" value={totals.confirmed} />
              <Metric label="候補" value={totals.waitlist} />
              <Metric label="取消" value={totals.cancelled} />
            </div>
          </div>
        </Card>

        <form className="panel grid gap-3 p-4 lg:grid-cols-[150px_minmax(220px,1fr)_140px_minmax(180px,1fr)_auto_auto_auto]" onSubmit={search}>
          <FieldLabel label="日期">
            <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </FieldLabel>
          <FieldLabel label="車班">
            <select className="field" value={scheduleId} onChange={(event) => setScheduleId(event.target.value)}>
              <option value="">全部車班</option>
              {scheduleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="狀態">
            <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">全部</option>
              <option value="confirmed">正取</option>
              <option value="waitlist">候補</option>
              <option value="cancelled">已取消</option>
            </select>
          </FieldLabel>
          <FieldLabel label="搜尋">
            <input className="field" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="姓名、部門、編號、手機、Code" />
          </FieldLabel>
          <Button variant="primary" loading={loading} className="self-end" type="submit"><Search size={16} />查詢</Button>
          <Button className="self-end" type="button" onClick={exportCsv}><Download size={16} />CSV</Button>
          <Button className="self-end" type="button" onClick={copyLineText}><Clipboard size={16} />LINE</Button>
        </form>

        {message && <div className="panel border-border bg-surface-strong p-3 text-sm">{message}</div>}
        {lineCopy && <textarea className="field min-h-48 font-mono text-sm" value={lineCopy} readOnly />}

        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <Card className="h-fit p-4">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-primary" />
              <div>
                <p className="quiet-label">Manual Entry</p>
                <h2 className="font-bold">手動新增預約</h2>
              </div>
            </div>
            <form className="space-y-3" onSubmit={addBooking}>
              <FieldLabel label="車班" required>
                <select className="field" value={addForm.scheduleId} onChange={(event) => setAddForm({ ...addForm, scheduleId: event.target.value })} required>
                  <option value="">選擇車班</option>
                  {scheduleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </FieldLabel>
              <FieldLabel label="員工姓名" required>
                <input className="field" value={addForm.employeeName} onChange={(event) => setAddForm({ ...addForm, employeeName: event.target.value })} required />
              </FieldLabel>
              <FieldLabel label="部門" required>
                <input className="field" value={addForm.department} onChange={(event) => setAddForm({ ...addForm, department: event.target.value })} required />
              </FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <FieldLabel label="員工編號">
                  <input className="field" value={addForm.employeeNo} onChange={(event) => setAddForm({ ...addForm, employeeNo: event.target.value })} />
                </FieldLabel>
                <FieldLabel label="手機">
                  <input className="field" value={addForm.phone} onChange={(event) => setAddForm({ ...addForm, phone: event.target.value })} />
                </FieldLabel>
              </div>
              <FieldLabel label="備註">
                <textarea className="field min-h-20" value={addForm.note} onChange={(event) => setAddForm({ ...addForm, note: event.target.value })} />
              </FieldLabel>
              <label className="flex items-start gap-2 rounded-[8px] border border-border bg-surface-strong p-3 text-sm font-semibold">
                <input className="mt-1" type="checkbox" checked={addForm.adminOverride} onChange={(event) => setAddForm({ ...addForm, adminOverride: event.target.checked })} />
                <span>強制加入，允許超收</span>
              </label>
              <Button variant="primary" className="w-full"><Plus size={16} />新增預約</Button>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <div>
                <p className="quiet-label">Roster</p>
                <h2 className="font-bold">查詢結果</h2>
              </div>
              <Button type="button" onClick={() => search()} loading={loading}><RefreshCw size={16} />重新整理</Button>
            </div>

            {loading && <SkeletonRows rows={5} />}
            {!loading && bookings.length === 0 && (
              <div className="p-4">
                <EmptyState title="沒有符合條件的預約" description="請調整日期、車班或關鍵字，或從左側手動新增一筆預約。" />
              </div>
            )}
            {!loading && bookings.length > 0 && (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="table">
                    <thead><tr><th>車班</th><th>員工</th><th>狀態</th><th>Code</th><th>備註</th><th>建立時間</th><th>操作</th></tr></thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td><strong>{booking.schedule.departureTime}</strong> {booking.schedule.routeName}<br /><span className="text-xs text-stone-600">{booking.schedule.serviceDate.slice(0, 10)} / {booking.schedule.pickupPoint}</span></td>
                          <td><strong>{booking.employeeName}</strong><br /><span className="text-xs text-stone-600">{booking.department} {booking.employeeNo ?? ""} {booking.phone ?? ""}</span></td>
                          <td><div className="flex flex-col gap-1"><StatusBadge value={booking.status} />{booking.adminOverride && <StatusBadge value="overbooked" />}</div></td>
                          <td className="font-mono text-xs">{booking.bookingCode}</td>
                          <td className="max-w-44 text-sm text-stone-600">{booking.note}</td>
                          <td><span className="text-xs">{new Date(booking.createdAt).toLocaleString("zh-TW")}</span>{booking.cancelledAt && <><br /><span className="text-xs text-stone-600">取消 {new Date(booking.cancelledAt).toLocaleString("zh-TW")}</span></>}</td>
                          <td><BookingActions booking={booking} schedules={scheduleOptions} onEdit={() => setEditing(booking)} onAction={action} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 p-4 lg:hidden">
                  {bookings.map((booking) => (
                    <article key={booking.id} className="rounded-[8px] border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{booking.employeeName}</p>
                          <p className="mt-1 text-sm text-stone-600">{booking.department} {booking.employeeNo ?? ""}</p>
                        </div>
                        <StatusBadge value={booking.status} />
                      </div>
                      <div className="mt-3 rounded-[7px] bg-surface-strong p-3 text-sm">
                        <p><strong>{booking.schedule.departureTime}</strong> {booking.schedule.routeName}</p>
                        <p className="mt-1 text-stone-600">{booking.schedule.serviceDate.slice(0, 10)} / {booking.schedule.pickupPoint}</p>
                        <p className="mt-1 font-mono text-xs text-stone-600">{booking.bookingCode}</p>
                      </div>
                      <div className="mt-3">
                        <BookingActions booking={booking} schedules={scheduleOptions} onEdit={() => setEditing(booking)} onAction={action} />
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </Card>
        </section>

        {editing && (
          <form className="panel fixed inset-x-4 bottom-4 z-20 mx-auto max-w-3xl space-y-3 p-4 shadow-lg" onSubmit={saveEdit}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">編輯預約：<span className="font-mono">{editing.bookingCode}</span></h2>
              <StatusBadge value={editing.status} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <FieldLabel label="員工姓名" required><input className="field" value={editing.employeeName} onChange={(event) => setEditing({ ...editing, employeeName: event.target.value })} /></FieldLabel>
              <FieldLabel label="部門" required><input className="field" value={editing.department} onChange={(event) => setEditing({ ...editing, department: event.target.value })} /></FieldLabel>
              <FieldLabel label="員工編號"><input className="field" value={editing.employeeNo ?? ""} onChange={(event) => setEditing({ ...editing, employeeNo: event.target.value })} /></FieldLabel>
              <FieldLabel label="手機"><input className="field" value={editing.phone ?? ""} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} /></FieldLabel>
            </div>
            <FieldLabel label="備註"><textarea className="field min-h-20" value={editing.note ?? ""} onChange={(event) => setEditing({ ...editing, note: event.target.value })} /></FieldLabel>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setEditing(null)}>取消</Button>
              <Button variant="primary" type="submit"><Pencil size={16} />儲存變更</Button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-[8px] border border-border bg-surface-strong p-3">
      <p className="text-xs text-stone-600">{label}</p>
      <p className="mt-1 text-xl font-bold text-primary">{value}</p>
    </div>
  );
}

function BookingActions({
  booking,
  schedules,
  onEdit,
  onAction,
}: {
  booking: Booking;
  schedules: Array<{ value: string; label: string }>;
  onEdit: () => void;
  onAction: (url: string, body?: unknown, confirmText?: string) => Promise<void>;
}) {
  return (
    <div className="flex min-w-72 flex-wrap gap-2">
      <Button type="button" onClick={onEdit}>編輯</Button>
      {booking.status !== "cancelled" && (
        <Button type="button" variant="danger" onClick={() => onAction(`/api/admin/bookings/${booking.id}/cancel`, undefined, "確定取消此預約？")}>取消</Button>
      )}
      {booking.status === "waitlist" && (
        <>
          <Button type="button" onClick={() => onAction(`/api/admin/bookings/${booking.id}/confirm`, { adminOverride: false })}>轉正取</Button>
          <Button type="button" variant="danger" onClick={() => onAction(`/api/admin/bookings/${booking.id}/confirm`, { adminOverride: true }, "確定強制轉正取並允許超收？")}>強制轉正取</Button>
        </>
      )}
      <select className="field max-w-44" defaultValue="" onChange={(event) => event.target.value && onAction(`/api/admin/bookings/${booking.id}/change-schedule`, { scheduleId: event.target.value, adminOverride: false })}>
        <option value="">改車班</option>
        {schedules.filter((option) => option.value !== booking.scheduleId).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}
