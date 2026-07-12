"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarPlus, RefreshCw, Save, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button, Card, EmptyState, FieldLabel, SkeletonRows } from "@/components/ui";
import { tomorrowDateInput } from "@/lib/dates";
import { readJsonResponse } from "@/lib/client-http";

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
  cancelledAt?: string | null;
};

const emptyForm = {
  id: "",
  serviceDate: tomorrowDateInput(),
  routeName: "",
  departureTime: "",
  pickupPoint: "",
  capacity: 20,
  registrationOpen: true,
  waitlistEnabled: true,
  cancelled: false,
  note: "",
};

export default function AdminSchedulesPage() {
  const [date, setDate] = useState(tomorrowDateInput());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const summary = useMemo(
    () =>
      schedules.reduce(
        (acc, schedule) => {
          acc.capacity += schedule.capacity;
          acc.confirmed += schedule.confirmedCount;
          acc.waitlist += schedule.waitlistCount;
          acc.closed += schedule.registrationOpen ? 0 : 1;
          return acc;
        },
        { capacity: 0, confirmed: 0, waitlist: 0, closed: 0 },
      ),
    [schedules],
  );

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/schedules?date=${date}`);
      const data = await readJsonResponse<{ schedules: Schedule[]; error?: string }>(response, "讀取車班失敗");
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
      const data = await readJsonResponse<{ error?: string }>(response, "儲存車班失敗");
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
    try {
      const response = await fetch(`/api/admin/schedules/${id}`, { method: "DELETE" });
      const data = await readJsonResponse<{ error?: string }>(response, "刪除失敗");
      if (!response.ok) throw new Error(data.error ?? "刪除失敗");
      setMessage("車班已刪除");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刪除失敗");
    }
  }

  async function createTomorrowFromTemplates() {
    try {
      const response = await fetch("/api/admin/schedules/create-from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceDate: tomorrowDateInput() }),
      });
      const data = await readJsonResponse<{ createdCount: number; skippedCount: number; error?: string }>(response, "快速建立失敗");
      if (!response.ok) throw new Error(data.error ?? "快速建立失敗");
      setMessage(`已建立 ${data.createdCount} 班，略過 ${data.skippedCount} 班重複車班`);
      setDate(tomorrowDateInput());
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "快速建立失敗");
    }
  }

  function editSchedule(schedule: Schedule) {
    setForm({
      id: schedule.id,
      serviceDate: schedule.serviceDate.slice(0, 10),
      routeName: schedule.routeName,
      departureTime: schedule.departureTime,
      pickupPoint: schedule.pickupPoint,
      capacity: schedule.capacity,
      registrationOpen: schedule.registrationOpen,
      waitlistEnabled: schedule.waitlistEnabled,
      cancelled: Boolean(schedule.cancelledAt),
      note: schedule.note ?? "",
    });
  }

  return (
    <AdminShell title="車班管理">
      <div className="grid gap-6 xl:grid-cols-[410px_1fr]">
        <Card className="h-fit p-4">
          <div className="mb-4">
            <p className="quiet-label">Schedule Setup</p>
            <h2 className="text-xl font-bold">{form.id ? "編輯車班" : "新增車班"}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">控制日期、上車點、名額與是否開放候補。</p>
          </div>
          <form className="space-y-3" onSubmit={submit}>
            <FieldLabel label="日期" required>
              <input className="field" type="date" value={form.serviceDate} onChange={(event) => setForm({ ...form, serviceDate: event.target.value })} />
            </FieldLabel>
            <FieldLabel label="車班名稱" required>
              <input className="field" value={form.routeName} onChange={(event) => setForm({ ...form, routeName: event.target.value })} placeholder="例如：07:30 員工車" required />
            </FieldLabel>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <FieldLabel label="發車時間" required>
                <input className="field" value={form.departureTime} onChange={(event) => setForm({ ...form, departureTime: event.target.value })} placeholder="07:30" required />
              </FieldLabel>
              <FieldLabel label="名額上限" required>
                <input className="field" type="number" min={1} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} />
              </FieldLabel>
            </div>
            <FieldLabel label="上車點" required>
              <input className="field" value={form.pickupPoint} onChange={(event) => setForm({ ...form, pickupPoint: event.target.value })} placeholder="例如：員工宿舍" required />
            </FieldLabel>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <label className="flex items-center gap-2 rounded-[8px] border border-border bg-surface-strong p-3 text-sm font-semibold">
                <input type="checkbox" checked={form.registrationOpen} onChange={(event) => setForm({ ...form, registrationOpen: event.target.checked })} />
                開放登記
              </label>
              <label className="flex items-center gap-2 rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                <input type="checkbox" checked={form.cancelled} onChange={(event) => setForm({ ...form, cancelled: event.target.checked, registrationOpen: event.target.checked ? false : form.registrationOpen })} />
                班次已取消
              </label>
              <label className="flex items-center gap-2 rounded-[8px] border border-border bg-surface-strong p-3 text-sm font-semibold">
                <input type="checkbox" checked={form.waitlistEnabled} onChange={(event) => setForm({ ...form, waitlistEnabled: event.target.checked })} />
                開放候補
              </label>
            </div>
            <FieldLabel label="備註">
              <textarea className="field min-h-20" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="例如：主管會議日加開" />
            </FieldLabel>
            {message && <p className="rounded-[6px] bg-muted p-3 text-sm">{message}</p>}
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1" loading={loading}><Save size={16} />儲存</Button>
              <Button type="button" onClick={() => setForm(emptyForm)}>清空</Button>
            </div>
          </form>
        </Card>

        <section className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="quiet-label">Dispatch Calendar</p>
                <h1 className="mt-1 text-2xl font-bold">{date} 車班</h1>
                <p className="mt-2 text-sm text-stone-600">建立班次後，前台員工即可依狀態登記或候補。</p>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <Metric label="班次" value={schedules.length} />
                <Metric label="正取" value={summary.confirmed} />
                <Metric label="候補" value={summary.waitlist} />
                <Metric label="關閉" value={summary.closed} />
              </div>
            </div>
          </Card>

          <div className="panel flex flex-wrap items-end gap-3 p-4">
            <FieldLabel label="篩選日期">
              <input className="field min-w-44" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </FieldLabel>
            <Button type="button" onClick={load} loading={loading}><RefreshCw size={16} />重新整理</Button>
            <Button type="button" variant="primary" onClick={createTomorrowFromTemplates}><CalendarPlus size={16} />快速建立明日車班</Button>
          </div>

          <Card className="overflow-hidden">
            {loading && <SkeletonRows rows={5} />}
            {!loading && schedules.length === 0 && (
              <div className="p-4">
                <EmptyState title="此日期尚無車班" description="可從左側手動建立，或用模板快速建立明日車班。" />
              </div>
            )}
            {!loading && schedules.length > 0 && (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="table">
                    <thead><tr><th>車班</th><th>上車點</th><th>名額</th><th>狀態</th><th>備註</th><th>操作</th></tr></thead>
                    <tbody>{schedules.map((schedule) => <ScheduleRow key={schedule.id} schedule={schedule} onEdit={() => editSchedule(schedule)} onRemove={() => remove(schedule.id)} />)}</tbody>
                  </table>
                </div>
                <div className="grid gap-3 p-4 lg:hidden">
                  {schedules.map((schedule) => (
                    <article key={schedule.id} className="rounded-[8px] border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-2xl font-bold text-primary">{schedule.departureTime}</p>
                          <p className="font-bold">{schedule.routeName}</p>
                          <p className="mt-1 text-sm text-stone-600">{schedule.pickupPoint}</p>
                        </div>
                        {statusFor(schedule)}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-[8px] bg-surface-strong p-3 text-center text-sm">
                        <Metric label="正取" value={schedule.confirmedCount} />
                        <Metric label="候補" value={schedule.waitlistCount} />
                        <Metric label="剩餘" value={schedule.remainingCount} />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button type="button" onClick={() => editSchedule(schedule)} className="flex-1">編輯</Button>
                        <Button type="button" variant="danger" onClick={() => remove(schedule.id)}><Trash2 size={16} />刪除</Button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </Card>
        </section>
      </div>
    </AdminShell>
  );
}

function ScheduleRow({ schedule, onEdit, onRemove }: { schedule: Schedule; onEdit: () => void; onRemove: () => void }) {
  return (
    <tr>
      <td><strong>{schedule.departureTime}</strong> {schedule.routeName}<br /><span className="text-xs text-stone-600">{schedule.serviceDate.slice(0, 10)}</span></td>
      <td>{schedule.pickupPoint}</td>
      <td>正取 {schedule.confirmedCount}/{schedule.capacity}<br />候補 {schedule.waitlistCount}，剩餘 {schedule.remainingCount}</td>
      <td><div className="flex flex-wrap gap-1">{statusFor(schedule)}{!schedule.waitlistEnabled && <StatusBadge value="closed" className="opacity-70" />}</div></td>
      <td className="max-w-56 text-sm text-stone-600">{schedule.note}</td>
      <td>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onEdit}>編輯</Button>
          <Button type="button" variant="danger" onClick={onRemove}><Trash2 size={16} />刪除</Button>
        </div>
      </td>
    </tr>
  );
}

function statusFor(schedule: Schedule) {
  if (schedule.cancelledAt) return <StatusBadge value="schedule_cancelled" />;
  if (!schedule.registrationOpen) return <StatusBadge value="closed" />;
  if (schedule.isOverbooked) return <StatusBadge value="overbooked" />;
  if (schedule.confirmedCount >= schedule.capacity) return <StatusBadge value="full" />;
  return <StatusBadge value="open" />;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[7px] border border-border bg-surface px-3 py-2">
      <p className="text-xs text-stone-600">{label}</p>
      <p className="mt-1 font-bold tabular-nums text-primary">{value}</p>
    </div>
  );
}
