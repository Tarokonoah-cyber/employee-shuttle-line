"use client";

import { useEffect, useMemo, useState } from "react";
import { FileClock, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, EmptyState, SkeletonRows } from "@/components/ui";
import { readJsonResponse } from "@/lib/client-http";

type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  source: string;
  createdAt: string;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const sourceCount = useMemo(() => new Set(logs.map((log) => log.source)).size, [logs]);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/audit-logs")
      .then(async (response) => {
        const data = await readJsonResponse<{ logs: AuditLog[]; error?: string }>(response, "讀取操作紀錄失敗");
        if (!response.ok) throw new Error(data.error ?? "讀取操作紀錄失敗");
        setLogs(data.logs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="操作紀錄">
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="quiet-label">Audit Trail</p>
              <h1 className="mt-1 text-2xl font-bold">系統操作紀錄</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">保留預約、車班、模板與 seed/demo 操作，便於回溯。</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <Metric label="紀錄" value={logs.length} />
              <Metric label="來源" value={sourceCount} />
            </div>
          </div>
        </Card>

        {error && <div className="panel border-orange-300 bg-orange-50 p-4 text-orange-900">{error}</div>}

        <Card className="overflow-hidden">
          {loading && <SkeletonRows rows={6} />}
          {!loading && logs.length === 0 && (
            <div className="p-4">
              <EmptyState title="尚無操作紀錄" description="當管理員新增、修改、取消或執行 seed/demo 時，紀錄會出現在這裡。" />
            </div>
          )}
          {!loading && logs.length > 0 && (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <article key={log.id} className="grid gap-4 p-4 lg:grid-cols-[190px_1fr_160px]">
                  <div>
                    <p className="text-sm font-semibold">{new Date(log.createdAt).toLocaleString("zh-TW")}</p>
                    <p className="mt-1 text-xs text-stone-600">來源：{log.source}</p>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-surface-strong px-2 py-0.5 font-mono text-xs font-semibold">
                        <FileClock size={13} />
                        {log.action}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-[5px] border border-green-700/20 bg-green-700/10 px-2 py-0.5 text-xs font-semibold text-green-800">
                        <ShieldCheck size={13} />
                        {log.targetType}
                      </span>
                    </div>
                    {log.targetId && <p className="mt-2 font-mono text-xs text-stone-600">{log.targetId}</p>}
                    <details className="mt-3 rounded-[8px] border border-border bg-surface-strong p-3">
                      <summary className="cursor-pointer text-sm font-semibold">查看異動內容</summary>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <JsonBlock title="Old" value={log.oldValue} />
                        <JsonBlock title="New" value={log.newValue} />
                      </div>
                    </details>
                  </div>
                  <div className="rounded-[8px] bg-surface-strong p-3 text-sm">
                    <p className="text-stone-600">稽核狀態</p>
                    <p className="mt-1 font-bold text-primary">已記錄</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
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

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase text-stone-500">{title}</p>
      <pre className="max-h-80 overflow-auto rounded-[6px] bg-[#1f2a2b] p-3 text-xs leading-5 text-[#f8f5ee]">
        {value == null ? "null" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
