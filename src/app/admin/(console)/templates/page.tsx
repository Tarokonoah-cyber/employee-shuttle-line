"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CopyPlus, Plus, Save } from "lucide-react";
import {
  ActionNotice,
  FilterBar,
  PageHeader,
  SidePanel,
  StatStrip,
} from "@/components/admin/admin-ui";
import {
  DepartureTimeField,
  RegistrationDeadlineFields,
} from "@/components/admin/schedule-time-fields";
import { Button, Card, EmptyState, FieldLabel, SkeletonRows } from "@/components/ui";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";
import {
  DEFAULT_REGISTRATION_CUTOFF_DAY_OFFSET,
  DEFAULT_REGISTRATION_CUTOFF_TIME,
  tomorrowDateInput,
} from "@/lib/dates";

type Template = {
  id: string;
  routeName: string;
  departureTime: string;
  registrationCutoffDayOffset: number;
  registrationCutoffTime: string;
  pickupPoint: string;
  defaultCapacity: number;
  waitlistEnabled: boolean;
  note?: string | null;
  active: boolean;
};

const empty = {
  id: "",
  routeName: "",
  departureTime: "14:00",
  registrationCutoffDayOffset: DEFAULT_REGISTRATION_CUTOFF_DAY_OFFSET,
  registrationCutoffTime: DEFAULT_REGISTRATION_CUTOFF_TIME,
  pickupPoint: "",
  defaultCapacity: 20,
  waitlistEnabled: true,
  note: "",
  active: true,
};

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState(empty);
  const [targetDate, setTargetDate] = useState(tomorrowDateInput());
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  const activeCount = useMemo(() => templates.filter((template) => template.active).length, [templates]);

  async function load() {
    setLoading(true);
    try {
      const response = await fetchWithTimeout("/api/admin/templates");
      const data = await readJsonResponse<{ templates: Template[]; error?: string }>(response, "讀取模板失敗");
      if (!response.ok) throw new Error(data.error ?? "讀取模板失敗");
      setTemplates(data.templates);
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "讀取模板失敗", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startCreate() {
    setForm(empty);
    setPanelOpen(true);
  }

  function startEdit(template: Template) {
    setForm({ ...template, note: template.note ?? "" });
    setPanelOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const url = form.id ? `/api/admin/templates/${form.id}` : "/api/admin/templates";
    const method = form.id ? "PATCH" : "POST";
    try {
      const response = await fetchWithTimeout(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await readJsonResponse<{ error?: string }>(response, "儲存模板失敗");
      if (!response.ok) throw new Error(data.error ?? "儲存模板失敗");
      setNotice({ text: "模板已儲存", tone: "success" });
      setForm(empty);
      setPanelOpen(false);
      await load();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "儲存模板失敗", tone: "error" });
    }
  }

  async function createFromTemplates() {
    try {
      const response = await fetchWithTimeout("/api/admin/schedules/create-from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceDate: targetDate }),
      });
      const data = await readJsonResponse<{ createdCount: number; skippedCount: number; error?: string }>(response, "建立失敗");
      if (!response.ok) throw new Error(data.error ?? "建立失敗");
      setNotice({ text: `已建立 ${data.createdCount} 班，略過 ${data.skippedCount} 班重複車班`, tone: "success" });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "建立失敗", tone: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="設定"
        title="車班模板"
        description="維護例行車班設定，並為指定日期快速建立啟用中的模板。"
        actions={<Button variant="primary" onClick={startCreate}><Plus size={16} />新增模板</Button>}
      />

      <StatStrip items={[
        { label: "全部模板", value: templates.length },
        { label: "啟用中", value: activeCount },
        { label: "已停用", value: templates.length - activeCount },
      ]} />

      <FilterBar>
        <FieldLabel label="建立日期">
          <input className="field min-w-44" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
        </FieldLabel>
        <Button variant="primary" type="button" onClick={createFromTemplates}><CopyPlus size={16} />用啟用模板建立車班</Button>
      </FilterBar>

      {notice && <ActionNotice message={notice.text} tone={notice.tone} />}

      {loading && <Card><SkeletonRows rows={5} /></Card>}
      {!loading && templates.length === 0 && (
        <EmptyState title="尚無模板" description="建立常用班次後，可一鍵產生指定日期的車班。" actions={<Button variant="primary" onClick={startCreate}>新增第一個模板</Button>} />
      )}
      {!loading && templates.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-2xl font-bold text-primary">{template.departureTime}</p>
                  <h2 className="mt-1 font-bold">{template.routeName}</h2>
                  <p className="mt-1 text-sm text-stone-600">{template.pickupPoint}</p>
                </div>
                <span className={template.active ? "status-chip status-chip-success" : "status-chip"}>{template.active ? "啟用" : "停用"}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[7px] border border-border bg-border text-sm">
                <div className="bg-surface p-3"><dt className="text-stone-600">預設名額</dt><dd className="mt-1 font-bold">{template.defaultCapacity}</dd></div>
                <div className="bg-surface p-3"><dt className="text-stone-600">候補</dt><dd className="mt-1 font-bold">{template.waitlistEnabled ? "開放" : "不開放"}</dd></div>
                <div className="col-span-2 bg-surface p-3"><dt className="text-stone-600">報名／取消截止</dt><dd className="mt-1 font-bold">{template.registrationCutoffDayOffset === 1 ? "發車前一天" : "發車當日"} {template.registrationCutoffTime}</dd></div>
              </dl>
              {template.note && <p className="mt-3 flex-1 text-sm leading-6 text-stone-600">{template.note}</p>}
              <Button type="button" className="mt-4 w-full" onClick={() => startEdit(template)}><CheckCircle2 size={16} />編輯模板</Button>
            </Card>
          ))}
        </section>
      )}

      <SidePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        title={form.id ? "編輯模板" : "新增模板"}
        description="設定常用班次的發車時間、截止時間、名額與候補規則。"
      >
        <form className="space-y-4" onSubmit={submit}>
          <FieldLabel label="模板名稱" required><input className="field" value={form.routeName} onChange={(event) => setForm({ ...form, routeName: event.target.value })} placeholder="例如：14:00 員工車" required /></FieldLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <DepartureTimeField value={form.departureTime} onChange={(departureTime) => setForm({ ...form, departureTime })} />
            <FieldLabel label="預設名額" required><input className="field" type="number" min={1} value={form.defaultCapacity} onChange={(event) => setForm({ ...form, defaultCapacity: Number(event.target.value) })} /></FieldLabel>
          </div>
          <RegistrationDeadlineFields
            dayOffset={form.registrationCutoffDayOffset}
            time={form.registrationCutoffTime}
            onDayOffsetChange={(registrationCutoffDayOffset) => setForm({ ...form, registrationCutoffDayOffset })}
            onTimeChange={(registrationCutoffTime) => setForm({ ...form, registrationCutoffTime })}
          />
          <FieldLabel label="上車點" required><input className="field" value={form.pickupPoint} onChange={(event) => setForm({ ...form, pickupPoint: event.target.value })} placeholder="例如：員工宿舍" required /></FieldLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-[8px] border border-border bg-surface p-3 text-sm font-semibold"><input type="checkbox" checked={form.waitlistEnabled} onChange={(event) => setForm({ ...form, waitlistEnabled: event.target.checked })} />開放候補</label>
            <label className="flex items-center gap-2 rounded-[8px] border border-border bg-surface p-3 text-sm font-semibold"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />啟用模板</label>
          </div>
          <FieldLabel label="備註"><textarea className="field min-h-24" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="用於提醒班次用途" /></FieldLabel>
          <Button variant="primary" className="w-full"><Save size={16} />儲存模板</Button>
        </form>
      </SidePanel>
    </div>
  );
}
