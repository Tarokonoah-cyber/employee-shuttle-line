"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CopyPlus, Layers, Save } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button, Card, EmptyState, FieldLabel, SkeletonRows } from "@/components/ui";
import { tomorrowDateInput } from "@/lib/dates";

type Template = {
  id: string;
  routeName: string;
  departureTime: string;
  pickupPoint: string;
  defaultCapacity: number;
  waitlistEnabled: boolean;
  note?: string | null;
  active: boolean;
};

const empty = { id: "", routeName: "", departureTime: "", pickupPoint: "", defaultCapacity: 20, waitlistEnabled: true, note: "", active: true };

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState(empty);
  const [targetDate, setTargetDate] = useState(tomorrowDateInput());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const activeCount = useMemo(() => templates.filter((template) => template.active).length, [templates]);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/templates");
    const data = await response.json();
    if (response.ok) setTemplates(data.templates);
    else setMessage(data.error ?? "讀取模板失敗");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const url = form.id ? `/api/admin/templates/${form.id}` : "/api/admin/templates";
    const method = form.id ? "PATCH" : "POST";
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    setMessage(response.ok ? "模板已儲存" : data.error ?? "儲存模板失敗");
    if (response.ok) {
      setForm(empty);
      await load();
    }
  }

  async function createFromTemplates() {
    const response = await fetch("/api/admin/schedules/create-from-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceDate: targetDate }),
    });
    const data = await response.json();
    setMessage(response.ok ? `已建立 ${data.createdCount} 班，略過 ${data.skippedCount} 班重複車班` : data.error ?? "建立失敗");
  }

  return (
    <AdminShell title="模板管理">
      <div className="grid gap-6 xl:grid-cols-[410px_1fr]">
        <Card className="h-fit p-4">
          <div className="mb-4 flex items-center gap-2">
            <Layers size={18} className="text-primary" />
            <div>
              <p className="quiet-label">Template Rule</p>
              <h2 className="text-xl font-bold">{form.id ? "編輯模板" : "新增模板"}</h2>
            </div>
          </div>
          <form className="space-y-3" onSubmit={submit}>
            <FieldLabel label="模板名稱" required>
              <input className="field" value={form.routeName} onChange={(event) => setForm({ ...form, routeName: event.target.value })} placeholder="例如：07:30 員工車" required />
            </FieldLabel>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <FieldLabel label="發車時間" required>
                <input className="field" value={form.departureTime} onChange={(event) => setForm({ ...form, departureTime: event.target.value })} placeholder="07:30" required />
              </FieldLabel>
              <FieldLabel label="預設名額" required>
                <input className="field" type="number" min={1} value={form.defaultCapacity} onChange={(event) => setForm({ ...form, defaultCapacity: Number(event.target.value) })} />
              </FieldLabel>
            </div>
            <FieldLabel label="上車點" required>
              <input className="field" value={form.pickupPoint} onChange={(event) => setForm({ ...form, pickupPoint: event.target.value })} placeholder="例如：員工宿舍" required />
            </FieldLabel>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <label className="flex items-center gap-2 rounded-[8px] border border-border bg-surface-strong p-3 text-sm font-semibold">
                <input type="checkbox" checked={form.waitlistEnabled} onChange={(event) => setForm({ ...form, waitlistEnabled: event.target.checked })} />
                開放候補
              </label>
              <label className="flex items-center gap-2 rounded-[8px] border border-border bg-surface-strong p-3 text-sm font-semibold">
                <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                啟用模板
              </label>
            </div>
            <FieldLabel label="備註">
              <textarea className="field min-h-20" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="用於提醒班次用途" />
            </FieldLabel>
            {message && <p className="rounded-[6px] bg-muted p-3 text-sm">{message}</p>}
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1"><Save size={16} />儲存</Button>
              <Button type="button" onClick={() => setForm(empty)}>清空</Button>
            </div>
          </form>
        </Card>

        <section className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="quiet-label">Recurring Schedules</p>
                <h1 className="mt-1 text-2xl font-bold">例行車班模板</h1>
                <p className="mt-2 text-sm text-stone-600">用於快速建立指定日期車班，重複班次會自動略過。</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <Metric label="模板" value={templates.length} />
                <Metric label="啟用" value={activeCount} />
              </div>
            </div>
          </Card>

          <div className="panel flex flex-wrap items-end gap-3 p-4">
            <FieldLabel label="建立日期">
              <input className="field min-w-44" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
            </FieldLabel>
            <Button variant="primary" type="button" onClick={createFromTemplates}><CopyPlus size={16} />用啟用模板建立車班</Button>
          </div>

          <Card className="overflow-hidden">
            {loading && <SkeletonRows rows={4} />}
            {!loading && templates.length === 0 && (
              <div className="p-4">
                <EmptyState title="尚無模板" description="建立常用班次後，可一鍵產生指定日期的車班。" />
              </div>
            )}
            {!loading && templates.length > 0 && (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {templates.map((template) => (
                  <article key={template.id} className="rounded-[8px] border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-2xl font-bold text-primary">{template.departureTime}</p>
                        <h2 className="mt-1 font-bold">{template.routeName}</h2>
                        <p className="mt-1 text-sm text-stone-600">{template.pickupPoint}</p>
                      </div>
                      <span className={`inline-flex rounded-[5px] border px-2 py-0.5 text-xs font-semibold ${template.active ? "border-green-700/25 bg-green-700/10 text-green-800" : "border-stone-500/25 bg-stone-500/10 text-stone-700"}`}>
                        {template.active ? "啟用" : "停用"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-[7px] bg-surface-strong p-3">
                        <p className="text-stone-600">預設名額</p>
                        <p className="mt-1 font-bold">{template.defaultCapacity}</p>
                      </div>
                      <div className="rounded-[7px] bg-surface-strong p-3">
                        <p className="text-stone-600">候補</p>
                        <p className="mt-1 font-bold">{template.waitlistEnabled ? "開放" : "不開放"}</p>
                      </div>
                    </div>
                    {template.note && <p className="mt-3 text-sm leading-6 text-stone-600">{template.note}</p>}
                    <Button type="button" className="mt-4 w-full" onClick={() => setForm({ ...template, note: template.note ?? "" })}>
                      <CheckCircle2 size={16} />
                      編輯此模板
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[7px] border border-border bg-surface px-4 py-3">
      <p className="text-xs text-stone-600">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-primary">{value}</p>
    </div>
  );
}
