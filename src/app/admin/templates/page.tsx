"use client";

import { FormEvent, useEffect, useState } from "react";
import { CopyPlus, Save } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";

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

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/templates");
    const data = await response.json();
    if (response.ok) setTemplates(data.templates);
    else setMessage(data.error ?? "讀取模板失敗");
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

  async function createTomorrow() {
    const response = await fetch("/api/admin/schedules/create-from-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceDate: tomorrow() }),
    });
    const data = await response.json();
    setMessage(response.ok ? `已用啟用模板建立 ${data.schedules.length} 班明日車班` : data.error ?? "建立失敗");
  }

  return (
    <AdminShell title="模板管理">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form className="panel h-fit space-y-3 p-4" onSubmit={submit}>
          <h2 className="font-bold">{form.id ? "編輯模板" : "新增模板"}</h2>
          <label className="block text-sm font-semibold">模板名稱<input className="field mt-1" value={form.routeName} onChange={(e) => setForm({ ...form, routeName: e.target.value })} required /></label>
          <label className="block text-sm font-semibold">發車時間<input className="field mt-1" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} required /></label>
          <label className="block text-sm font-semibold">上車點<input className="field mt-1" value={form.pickupPoint} onChange={(e) => setForm({ ...form, pickupPoint: e.target.value })} required /></label>
          <label className="block text-sm font-semibold">預設名額<input className="field mt-1" type="number" min={1} value={form.defaultCapacity} onChange={(e) => setForm({ ...form, defaultCapacity: Number(e.target.value) })} /></label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.waitlistEnabled} onChange={(e) => setForm({ ...form, waitlistEnabled: e.target.checked })} />開放候補</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />啟用模板</label>
          <label className="block text-sm font-semibold">備註<textarea className="field mt-1 min-h-20" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          {message && <p className="rounded-[6px] bg-muted p-3 text-sm">{message}</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1"><Save size={16} />儲存</button>
            <button className="btn btn-secondary" type="button" onClick={() => setForm(empty)}>清空</button>
          </div>
        </form>
        <section className="space-y-4">
          <div className="panel p-4">
            <button className="btn btn-primary" onClick={createTomorrow}><CopyPlus size={16} />用啟用模板建立明日車班</button>
          </div>
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>模板</th><th>上車點</th><th>預設名額</th><th>候補</th><th>狀態</th><th>操作</th></tr></thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td><strong>{template.departureTime}</strong> {template.routeName}<br /><span className="text-xs text-stone-600">{template.note}</span></td>
                      <td>{template.pickupPoint}</td>
                      <td>{template.defaultCapacity}</td>
                      <td>{template.waitlistEnabled ? "開放" : "不開放"}</td>
                      <td>{template.active ? "啟用" : "停用"}</td>
                      <td><button className="btn btn-secondary" onClick={() => setForm({ ...template, note: template.note ?? "" })}>編輯</button></td>
                    </tr>
                  ))}
                  {templates.length === 0 && <tr><td colSpan={6}>尚無模板，請先新增。</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
