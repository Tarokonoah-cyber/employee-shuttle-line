"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

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

  useEffect(() => {
    fetch("/api/admin/audit-logs")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "讀取操作紀錄失敗");
        setLogs(data.logs);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AdminShell title="操作紀錄">
      {error && <div className="panel border-orange-300 bg-orange-50 p-4 text-orange-900">{error}</div>}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>時間</th><th>Action</th><th>Target</th><th>來源</th><th>Old</th><th>New</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString("zh-TW")}</td>
                  <td className="font-mono text-xs">{log.action}</td>
                  <td>{log.targetType}<br /><span className="font-mono text-xs text-stone-600">{log.targetId}</span></td>
                  <td>{log.source}</td>
                  <td><pre className="max-w-xs whitespace-pre-wrap text-xs">{JSON.stringify(log.oldValue, null, 2)}</pre></td>
                  <td><pre className="max-w-xs whitespace-pre-wrap text-xs">{JSON.stringify(log.newValue, null, 2)}</pre></td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6}>尚無操作紀錄。</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
