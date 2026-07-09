"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarPlus, RefreshCw, Save, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
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
  cancelledCount: number;
  remainingCount: number;
  isOverbooked: boolean;
};

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

const emptyForm = {
  id: "",
  serviceDate: tomorrow(),
  routeName: "",
  departureTime: "",
  pickupPoint: "",
  capacity: 20,
  registrationOpen: true,
  waitlistEnabled: true,
  note: "",
};

export default function AdminSchedulesPage() {
  const [date, setDate] = useState(tomorrow());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/schedules?date=${date}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "讀取車班失敗");
      setSchedules(data.schedules);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "讀取車班失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const payload = { ...form, capacity: Number(form.capacity) };
    const url = form.id ? `/api/admin/schedules/${form.id}` : "/api/admin/schedules";
    const method = form.id ? "PATCH" : "POST";

    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "儲存車班失敗");
      setForm(emptyForm);
      setDate(payload.serviceDate);
      setMessage("車班已儲存");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "儲存車班失敗");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("確定要刪除此車班？已有預約紀錄的車班會被阻擋。")) return;
    const response = await fetch(`/api/admin/schedules/${id}`, { method: "DELETE" });
    const data = await response.json();
    setMessage(response.ok ? "車班已刪除" : data.error ?? "刪除失敗");
    await load();
  }

  async function createTomorrowFromTemplates() {
    const response = await fetch("/api/admin/schedules/create-from-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceDate: tomorrow() }),
    });
    const data = await response.json();
    setMessage(response.ok ? `已建立 ${data.schedules.length} 班明日車班` : data.error ?? "快速建立失敗");
    setDate(tomorrow());
    await load();
  }

  return (
    <AdminShell title="車班管理">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form className="panel h-fit space-y-3 p-4" onSubmit={submit}>
          <h2 className="font-bold">{form.id ? "編輯車班" : "新增車班"}</h2>
          <label className="block text-sm font-semibold">日期<input className="field mt-1" type="date" value={form.serviceDate} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} /></label>
          <label className="block text-sm font-semibold">車班名稱<input className="field mt-1" value={form.routeName} onChange={(e) => setForm({ ...form, routeName: e.target.value })} required /></label>
          <label className="block text-sm font-semibold">發車時間<input className="field mt-1" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} required /></label>
          <label className="block text-sm font-semibold">上車點<input className="field mt-1" value={form.pickupPoint} onChange={(e) => setForm({ ...form, pickupPoint: e.target.value })} required /></label>
          <label className="block text-sm font-semibold">名額上限<input className="field mt-1" type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.registrationOpen} onChange={(e) => setForm({ ...form, registrationOpen: e.target.checked })} />開放登記</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.waitlistEnabled} onChange={(e) => setForm({ ...form, waitlistEnabled: e.target.checked })} />開放候補</label>
          <label className="block text-sm font-semibold">備註<textarea className="field mt-1 min-h-20" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          {message && <p className="rounded-[6px] bg-muted p-3 text-sm">{message}</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={loading}><Save size={16} />儲存</button>
            <button className="btn btn-secondary" type="button" onClick={() => setForm(emptyForm)}>清空</button>
          </div>
        </form>

        <section className="space-y-4">
          <div className="panel flex flex-wrap items-end gap-3 p-4">
            <label className="text-sm font-semibold">篩選日期<input className="field mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16} />重新整理</button>
            <button className="btn btn-primary" onClick={createTomorrowFromTemplates}><CalendarPlus size={16} />快速建立明日車班</button>
          </div>
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>車班</th><th>上車點</th><th>名額</th><th>狀態</th><th>備註</th><th>操作</th></tr></thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td><strong>{schedule.departureTime}</strong> {schedule.routeName}<br /><span className="text-xs text-stone-600">{schedule.serviceDate.slice(0, 10)}</span></td>
                      <td>{schedule.pickupPoint}</td>
                      <td>正取 {schedule.confirmedCount}/{schedule.capacity}<br />候補 {schedule.waitlistCount}，剩餘 {schedule.remainingCount}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {!schedule.registrationOpen && <StatusBadge value="closed" />}
                          {schedule.isOverbooked && <StatusBadge value="overbooked" />}
                          {schedule.registrationOpen && !schedule.isOverbooked && <StatusBadge value={schedule.confirmedCount >= schedule.capacity ? "full" : "open"} />}
                        </div>
                      </td>
                      <td>{schedule.note}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button className="btn btn-secondary" onClick={() => setForm({
                            id: schedule.id,
                            serviceDate: schedule.serviceDate.slice(0, 10),
                            routeName: schedule.routeName,
                            departureTime: schedule.departureTime,
                            pickupPoint: schedule.pickupPoint,
                            capacity: schedule.capacity,
                            registrationOpen: schedule.registrationOpen,
                            waitlistEnabled: schedule.waitlistEnabled,
                            note: schedule.note ?? "",
                          })}>編輯</button>
                          <button className="btn btn-secondary" onClick={() => remove(schedule.id)}><Trash2 size={16} />刪除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {schedules.length === 0 && <tr><td colSpan={6}>{loading ? "讀取中..." : "此日期尚無車班。"}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
