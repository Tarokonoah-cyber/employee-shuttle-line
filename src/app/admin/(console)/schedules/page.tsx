"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ActionNotice,
  ConfirmDialog,
  FilterBar,
  PageHeader,
  ResponsiveDataList,
  SectionHeader,
  SidePanel,
  StatStrip,
} from "@/components/admin/admin-ui";
import { StatusBadge } from "@/components/status-badge";
import { Button, Card, EmptyState, FieldLabel, SkeletonRows } from "@/components/ui";
import { adminDateHref, validAdminDate } from "@/lib/admin-filters";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";
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
  return (
    <Suspense fallback={<Card><SkeletonRows rows={7} /></Card>}>
      <SchedulesContent />
    </Suspense>
  );
}

function SchedulesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [date, setDate] = useState(() => validAdminDate(searchParams.get("date"), tomorrowDateInput()));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [panelOpen, setPanelOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Schedule | null>(null);
  const [removing, setRemoving] = useState(false);

  const summary = useMemo(
    () => schedules.reduce(
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
    try {
      const response = await fetchWithTimeout(`/api/admin/schedules?date=${date}`);
      const data = await readJsonResponse<{ schedules: Schedule[]; error?: string }>(response, "讀取車班失敗");
      if (!response.ok) throw new Error(data.error ?? "讀取車班失敗");
      setSchedules(data.schedules);
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "讀取車班失敗", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function changeDate(nextDate: string) {
    setDate(nextDate);
    router.replace(adminDateHref("/admin/schedules", nextDate), { scroll: false });
  }

  function startCreate() {
    setForm({ ...emptyForm, serviceDate: date });
    setPanelOpen(true);
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
    setPanelOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const payload = { ...form, capacity: Number(form.capacity) };
    const url = form.id ? `/api/admin/schedules/${form.id}` : "/api/admin/schedules";
    const method = form.id ? "PATCH" : "POST";
    try {
      const response = await fetchWithTimeout(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await readJsonResponse<{ error?: string }>(response, "儲存車班失敗");
      if (!response.ok) throw new Error(data.error ?? "儲存車班失敗");
      setNotice({ text: "車班已儲存", tone: "success" });
      setPanelOpen(false);
      setForm(emptyForm);
      if (payload.serviceDate !== date) changeDate(payload.serviceDate);
      else await load();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "儲存車班失敗", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const response = await fetchWithTimeout(`/api/admin/schedules/${removeTarget.id}`, { method: "DELETE" });
      const data = await readJsonResponse<{ error?: string }>(response, "刪除失敗");
      if (!response.ok) throw new Error(data.error ?? "刪除失敗");
      setNotice({ text: "車班已刪除", tone: "success" });
      setRemoveTarget(null);
      await load();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "刪除失敗", tone: "error" });
    } finally {
      setRemoving(false);
    }
  }

  async function createTomorrowFromTemplates() {
    try {
      const tomorrow = tomorrowDateInput();
      const response = await fetchWithTimeout("/api/admin/schedules/create-from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceDate: tomorrow }),
      });
      const data = await readJsonResponse<{ createdCount: number; skippedCount: number; error?: string }>(response, "快速建立失敗");
      if (!response.ok) throw new Error(data.error ?? "快速建立失敗");
      setNotice({ text: `已建立 ${data.createdCount} 班，略過 ${data.skippedCount} 班重複車班`, tone: "success" });
      if (date !== tomorrow) changeDate(tomorrow);
      else await load();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "快速建立失敗", tone: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="日常營運"
        title="車班管理"
        description="以日期查看班次、名額與候補；新增和編輯只在需要時開啟。"
        actions={
          <>
            <Button type="button" onClick={createTomorrowFromTemplates}><CalendarPlus size={16} />快速建立明日車班</Button>
            <Button type="button" variant="primary" onClick={startCreate}><Plus size={16} />新增車班</Button>
          </>
        }
      />

      <FilterBar>
        <FieldLabel label="查看日期">
          <input className="field min-w-44" type="date" value={date} onChange={(event) => changeDate(event.target.value)} />
        </FieldLabel>
        <Button type="button" onClick={load} loading={loading}><RefreshCw size={16} />重新整理</Button>
      </FilterBar>

      <StatStrip items={[
        { label: "班次", value: schedules.length },
        { label: "總名額", value: summary.capacity },
        { label: "正取", value: summary.confirmed },
        { label: "候補", value: summary.waitlist, tone: summary.waitlist ? "warning" : "default" },
        { label: "關閉", value: summary.closed },
      ]} />

      {notice && <ActionNotice message={notice.text} tone={notice.tone} />}

      <Card className="overflow-hidden">
        <SectionHeader title={`${date} 車班`} description="點選編輯可調整名額、登記狀態或取消班次。" />
        {loading && <SkeletonRows rows={6} />}
        {!loading && schedules.length === 0 && (
          <div className="p-4"><EmptyState title="此日期尚無車班" description="可新增一班，或用模板快速建立明日車班。" actions={<Button variant="primary" onClick={startCreate}>新增車班</Button>} /></div>
        )}
        {!loading && schedules.length > 0 && (
          <ResponsiveDataList
            desktop={
              <table className="table">
                <thead><tr><th>時間／車班</th><th>上車點</th><th>名額</th><th>狀態</th><th>備註</th><th>操作</th></tr></thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td><strong className="font-mono text-primary">{schedule.departureTime}</strong><br /><span className="font-semibold">{schedule.routeName}</span></td>
                      <td>{schedule.pickupPoint}</td>
                      <td>正取 {schedule.confirmedCount}/{schedule.capacity}<br /><span className="text-xs text-stone-600">候補 {schedule.waitlistCount}，剩餘 {schedule.remainingCount}</span></td>
                      <td><div className="flex flex-wrap gap-1">{statusFor(schedule)}{!schedule.waitlistEnabled && <span className="text-xs text-stone-500">候補關閉</span>}</div></td>
                      <td className="max-w-56 text-sm text-stone-600">{schedule.note}</td>
                      <td><div className="flex gap-2"><Button type="button" onClick={() => editSchedule(schedule)}>編輯</Button><Button type="button" variant="danger" onClick={() => setRemoveTarget(schedule)}><Trash2 size={15} />刪除</Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            mobile={schedules.map((schedule) => (
              <article key={schedule.id} className="rounded-[8px] border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-2xl font-bold text-primary">{schedule.departureTime}</p><p className="font-bold">{schedule.routeName}</p><p className="mt-1 text-sm text-stone-600">{schedule.pickupPoint}</p></div>{statusFor(schedule)}</div>
                <p className="mt-3 rounded-[7px] bg-surface-strong p-3 text-sm">正取 {schedule.confirmedCount}/{schedule.capacity} · 候補 {schedule.waitlistCount} · 剩餘 {schedule.remainingCount}</p>
                <div className="mt-3 flex gap-2"><Button type="button" className="flex-1" onClick={() => editSchedule(schedule)}>編輯</Button><Button type="button" variant="danger" onClick={() => setRemoveTarget(schedule)}><Trash2 size={15} />刪除</Button></div>
              </article>
            ))}
          />
        )}
      </Card>

      <SidePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        title={form.id ? "編輯車班" : "新增車班"}
        description="設定日期、上車點、名額與登記狀態。"
      >
        <form className="space-y-4" onSubmit={submit}>
          <FieldLabel label="日期" required><input className="field" type="date" value={form.serviceDate} onChange={(event) => setForm({ ...form, serviceDate: event.target.value })} /></FieldLabel>
          <FieldLabel label="車班名稱" required><input className="field" value={form.routeName} onChange={(event) => setForm({ ...form, routeName: event.target.value })} placeholder="例如：07:30 員工車" required /></FieldLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="發車時間" required><input className="field" value={form.departureTime} onChange={(event) => setForm({ ...form, departureTime: event.target.value })} placeholder="07:30" required /></FieldLabel>
            <FieldLabel label="名額上限" required><input className="field" type="number" min={1} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></FieldLabel>
          </div>
          <FieldLabel label="上車點" required><input className="field" value={form.pickupPoint} onChange={(event) => setForm({ ...form, pickupPoint: event.target.value })} placeholder="例如：員工宿舍" required /></FieldLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleField label="開放登記" checked={form.registrationOpen} onChange={(checked) => setForm({ ...form, registrationOpen: checked })} />
            <ToggleField label="開放候補" checked={form.waitlistEnabled} onChange={(checked) => setForm({ ...form, waitlistEnabled: checked })} />
          </div>
          <label className="flex items-center gap-2 rounded-[8px] border border-orange-300 bg-orange-50 p-3 text-sm font-semibold text-orange-900">
            <input type="checkbox" checked={form.cancelled} onChange={(event) => setForm({ ...form, cancelled: event.target.checked, registrationOpen: event.target.checked ? false : form.registrationOpen })} />
            班次已取消
          </label>
          <FieldLabel label="備註"><textarea className="field min-h-24" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="例如：主管會議日加開" /></FieldLabel>
          <Button variant="primary" className="w-full" loading={loading}><Save size={16} />儲存車班</Button>
        </form>
      </SidePanel>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => { if (!open && !removing) setRemoveTarget(null); }}
        title="刪除此車班"
        description="此操作無法復原；若已有預約紀錄，系統會阻擋刪除。"
        confirmLabel="確認刪除"
        danger
        loading={removing}
        onConfirm={remove}
      />
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-2 rounded-[8px] border border-border bg-surface p-3 text-sm font-semibold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

function statusFor(schedule: Schedule) {
  if (schedule.cancelledAt) return <StatusBadge value="schedule_cancelled" />;
  if (!schedule.registrationOpen) return <StatusBadge value="closed" />;
  if (schedule.isOverbooked) return <StatusBadge value="overbooked" />;
  if (schedule.confirmedCount >= schedule.capacity) return <StatusBadge value="full" />;
  return <StatusBadge value="open" />;
}
