"use client";

import { RefreshCw, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader, ResponsiveDataList, SectionHeader } from "@/components/admin/admin-ui";
import { Button, Card, EmptyState, SkeletonRows } from "@/components/ui";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";

type LineUser = {
  id: string;
  lineDisplayName: string | null;
  maskedLineUserId: string;
  employeeName: string | null;
  employeeNo: string | null;
  department: string | null;
  phone: string | null;
  defaultPickupLocation: string | null;
  lastUsedAt: string;
  bookingCount: number;
};

export default function AdminLineUsersPage() {
  const [profiles, setProfiles] = useState<LineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchWithTimeout("/api/admin/line-users", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await readJsonResponse<{ profiles?: LineUser[]; error?: string }>(response, "讀取 LINE 使用者失敗");
        if (!response.ok || !body.profiles) throw new Error(body.error ?? "讀取 LINE 使用者失敗");
        setProfiles(body.profiles);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "讀取 LINE 使用者失敗");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reloadKey]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="系統" title="LINE 使用者" description="查看已驗證的 LINE 身分、記憶員工資料與報名次數；完整 userId、token 與 secret 不會顯示。" />
      {error ? <div className="rounded-[6px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900" role="alert">{error}</div> : null}
      <Card className="overflow-hidden">
        <SectionHeader title="員工資料記憶" description={`${profiles.length} 位已綁定使用者`} actions={<Button type="button" onClick={() => setReloadKey((value) => value + 1)} loading={loading}><RefreshCw size={16} />重新整理</Button>} />
        {loading ? <SkeletonRows rows={7} /> : null}
        {!loading && profiles.length === 0 ? <div className="p-4"><EmptyState title="尚無 LINE 使用者" description="員工第一次從 LIFF 完成身分驗證後，資料會顯示在這裡。" /></div> : null}
        {!loading && profiles.length > 0 ? (
          <ResponsiveDataList
            desktop={<table className="table"><thead><tr><th>LINE 身分</th><th>員工資料</th><th>聯絡</th><th>常用上車點</th><th>報名</th><th>最後使用</th></tr></thead><tbody>{profiles.map((profile) => <tr key={profile.id}><td><strong>{profile.lineDisplayName ?? "未提供名稱"}</strong><br /><span className="font-mono text-xs text-stone-500">{profile.maskedLineUserId}</span></td><td>{profile.employeeName ?? "未填"}<br /><span className="text-xs text-stone-600">{profile.department ?? "未填部門"}</span></td><td>{profile.employeeNo ?? "無員編"}<br /><span className="text-xs text-stone-600">{profile.phone ?? "無手機"}</span></td><td>{profile.defaultPickupLocation ?? "未記錄"}</td><td>{profile.bookingCount}</td><td className="text-xs">{new Date(profile.lastUsedAt).toLocaleString("zh-TW")}</td></tr>)}</tbody></table>}
            mobile={profiles.map((profile) => <article className="rounded-[8px] border border-border bg-surface p-4" key={profile.id}><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{profile.employeeName ?? profile.lineDisplayName ?? "未填姓名"}</p><p className="mt-1 font-mono text-xs text-stone-500">{profile.maskedLineUserId}</p></div><span className="status-chip status-chip-success"><UsersRound size={13} />{profile.bookingCount} 筆</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-stone-500">部門</dt><dd className="mt-1">{profile.department ?? "未填"}</dd></div><div><dt className="text-xs text-stone-500">手機</dt><dd className="mt-1">{profile.phone ?? "未填"}</dd></div></dl></article>)}
          />
        ) : null}
      </Card>
    </div>
  );
}
