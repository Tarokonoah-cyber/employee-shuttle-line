"use client";

import { useEffect, useMemo, useState } from "react";
import { FileClock } from "lucide-react";
import { PageHeader, StatStrip } from "@/components/admin/admin-ui";
import { Card, EmptyState, SkeletonRows } from "@/components/ui";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";

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

const actionLabels: Record<string, string> = {
  create: "新增",
  update: "更新",
  delete: "刪除",
  cancel: "取消",
  confirm: "候補轉正",
  change_schedule: "更換車班",
  seed: "建立示範資料",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const sourceCount = useMemo(() => new Set(logs.map((log) => log.source)).size, [logs]);

  useEffect(() => {
    setLoading(true);
    fetchWithTimeout("/api/admin/audit-logs")
      .then(async (response) => {
        const data = await readJsonResponse<{ logs: AuditLog[]; error?: string }>(response, "讀取操作紀錄失敗");
        if (!response.ok) throw new Error(data.error ?? "讀取操作紀錄失敗");
        setLogs(data.logs);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "讀取操作紀錄失敗"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="系統"
        title="操作紀錄"
        description="回溯預約、車班、模板與系統資料異動；技術細節預設收合。"
      />

      <StatStrip items={[
        { label: "紀錄", value: logs.length },
        { label: "操作來源", value: sourceCount },
      ]} />

      {error && <div className="panel border-orange-300 bg-orange-50 p-4 text-orange-900" role="alert">{error}</div>}

      <Card className="overflow-hidden">
        {loading && <SkeletonRows rows={7} />}
        {!loading && logs.length === 0 && (
          <div className="p-4"><EmptyState title="尚無操作紀錄" description="當管理員新增、修改或取消資料時，紀錄會出現在這裡。" /></div>
        )}
        {!loading && logs.length > 0 && (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <article key={log.id} className="grid gap-4 p-4 lg:grid-cols-[180px_minmax(0,1fr)_150px]">
                <div>
                  <p className="text-sm font-semibold">{new Date(log.createdAt).toLocaleString("zh-TW")}</p>
                  <p className="mt-1 text-xs text-stone-500">來源：{log.source}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="status-chip inline-flex items-center gap-1"><FileClock size={13} />{actionLabels[log.action] ?? log.action}</span>
                    <span className="status-chip status-chip-success">{log.targetType}</span>
                  </div>
                  {log.targetId && <p className="mt-2 truncate font-mono text-xs text-stone-500" title={log.targetId}>{log.targetId}</p>}
                  <details className="mt-3 rounded-[8px] border border-border bg-surface-strong">
                    <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold">查看異動內容</summary>
                    <div className="grid gap-3 border-t border-border p-3 lg:grid-cols-2">
                      <JsonBlock title="異動前" value={log.oldValue} />
                      <JsonBlock title="異動後" value={log.newValue} />
                    </div>
                  </details>
                </div>
                <div className="h-fit rounded-[8px] bg-surface-strong p-3 text-sm">
                  <p className="text-stone-500">稽核狀態</p>
                  <p className="mt-1 font-bold text-primary">已記錄</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-bold text-stone-500">{title}</p>
      <pre className="max-h-80 overflow-auto rounded-[6px] bg-[#1f2a2b] p-3 text-xs leading-5 text-[#f8f5ee]">
        {value == null ? "null" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
