"use client";

import { Bell, BellOff, RefreshCw, RotateCcw, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ActionNotice,
  PageHeader,
  ResponsiveDataList,
  SectionHeader,
} from "@/components/admin/admin-ui";
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
  receivesGroNotifications: boolean;
  lastUsedAt: string;
  bookingCount: number;
};

type NotificationSettings = {
  managedInAdmin: boolean;
  recipientCount: number;
  selectedProfileCount: number;
  environmentTargetCount: number;
  source: "admin" | "environment";
};

type LineUsersPayload = {
  profiles?: LineUser[];
  notificationSettings?: NotificationSettings;
  error?: string;
};

const emptySettings: NotificationSettings = {
  managedInAdmin: false,
  recipientCount: 0,
  selectedProfileCount: 0,
  environmentTargetCount: 0,
  source: "environment",
};

function completePayload(body: LineUsersPayload) {
  if (!body.profiles || !body.notificationSettings) {
    throw new Error(body.error ?? "讀取 LINE 通知設定失敗");
  }
  return { profiles: body.profiles, settings: body.notificationSettings };
}

export default function AdminLineUsersPage() {
  const [profiles, setProfiles] = useState<LineUser[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [savingKey, setSavingKey] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchWithTimeout("/api/admin/line-users", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await readJsonResponse<LineUsersPayload>(response, "讀取 LINE 使用者失敗");
        if (!response.ok) throw new Error(body.error ?? "讀取 LINE 使用者失敗");
        const completed = completePayload(body);
        setProfiles(completed.profiles);
        setSettings(completed.settings);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "讀取 LINE 使用者失敗");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reloadKey]);

  async function updateSettings(
    key: string,
    payload: { action: "set_recipient"; profileId: string; enabled: boolean } | { action: "use_environment" | "use_admin" },
    successMessage: string,
  ) {
    setSavingKey(key);
    setNotice(null);
    try {
      const response = await fetchWithTimeout("/api/admin/line-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readJsonResponse<LineUsersPayload>(response, "更新 LINE 通知設定失敗");
      if (!response.ok) throw new Error(body.error ?? "更新 LINE 通知設定失敗");
      const completed = completePayload(body);
      setProfiles(completed.profiles);
      setSettings(completed.settings);
      setNotice({ text: successMessage, tone: "success" });
    } catch (requestError) {
      setNotice({
        text: requestError instanceof Error ? requestError.message : "更新 LINE 通知設定失敗",
        tone: "error",
      });
    } finally {
      setSavingKey("");
    }
  }

  function toggleRecipient(profile: LineUser) {
    const enabled = !profile.receivesGroNotifications;
    return updateSettings(
      profile.id,
      { action: "set_recipient", profileId: profile.id, enabled },
      enabled ? "已設為 GRO LINE 通知管理員" : "已取消此使用者的 GRO 通知",
    );
  }

  const sourceLabel = settings.managedInAdmin ? "後台名單" : "Railway 環境變數";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="系統"
        title="LINE 通知管理"
        description="指定哪些已驗證 LINE 使用者接收員工車新預約通知；完整 userId、token 與 secret 不會顯示。"
      />

      {error ? <div className="rounded-[6px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900" role="alert">{error}</div> : null}
      {notice ? <ActionNotice message={notice.text} tone={notice.tone} /> : null}

      <Card className="overflow-hidden">
        <SectionHeader
          title="GRO LINE 通知管理員"
          description="員工完成預約後，系統會自動通知目前有效的收件人。"
          actions={settings.managedInAdmin ? (
            <Button
              type="button"
              onClick={() => updateSettings("source", { action: "use_environment" }, "已改回 Railway 環境變數收件人")}
              loading={savingKey === "source"}
              disabled={settings.environmentTargetCount === 0}
            >
              <RotateCcw size={16} />改回 Railway 設定
            </Button>
          ) : settings.selectedProfileCount > 0 ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => updateSettings("source", { action: "use_admin" }, "已改用後台通知管理員名單")}
              loading={savingKey === "source"}
            >
              <ShieldCheck size={16} />改用後台名單
            </Button>
          ) : undefined}
        />
        <div className="p-5">
          <dl className="grid gap-px overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-3">
            <div className="bg-surface p-4"><dt className="text-xs text-stone-500">目前通知來源</dt><dd className="mt-1 font-bold">{sourceLabel}</dd></div>
            <div className="bg-surface p-4"><dt className="text-xs text-stone-500">有效收件人</dt><dd className="mt-1 text-2xl font-bold text-primary">{settings.recipientCount}</dd></div>
            <div className="bg-surface p-4"><dt className="text-xs text-stone-500">後台已選</dt><dd className="mt-1 text-2xl font-bold">{settings.selectedProfileCount}</dd></div>
          </dl>
          <div className={`mt-4 rounded-[8px] border p-4 text-sm leading-6 ${
            settings.managedInAdmin && settings.recipientCount === 0
              ? "border-orange-200 bg-orange-50 text-orange-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-950"
          }`}>
            {settings.managedInAdmin
              ? settings.recipientCount > 0
                ? "目前由後台名單控制；可勾選多人同時接收新預約通知。"
                : "目前沒有通知管理員，新預約不會發送 GRO 通知。請至少選擇一位使用者。"
              : "目前仍沿用 Railway 的既有收件人。點選下方任一使用者「設為通知管理員」後，系統才會切換為後台控制。"}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <SectionHeader
          title="已驗證 LINE 使用者"
          description={`${profiles.length} 位已綁定使用者；通知管理員必須先從官方帳號完成一次員工車 LINE 驗證。`}
          actions={<Button type="button" onClick={() => setReloadKey((value) => value + 1)} loading={loading}><RefreshCw size={16} />重新整理</Button>}
        />
        {loading ? <SkeletonRows rows={7} /> : null}
        {!loading && profiles.length === 0 ? (
          <div className="p-4"><EmptyState title="尚無 LINE 使用者" description="請讓 GRO 人員先從官方帳號開啟員工車登記並完成 LINE 身分驗證。" /></div>
        ) : null}
        {!loading && profiles.length > 0 ? (
          <ResponsiveDataList
            desktop={(
              <table className="table">
                <thead><tr><th>LINE 身分</th><th>員工資料</th><th>聯絡</th><th>常用上車點</th><th>報名</th><th>GRO 通知</th><th>最後使用</th></tr></thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td><strong>{profile.lineDisplayName ?? "未提供名稱"}</strong><br /><span className="font-mono text-xs text-stone-500">{profile.maskedLineUserId}</span></td>
                      <td>{profile.employeeName ?? "未填"}<br /><span className="text-xs text-stone-600">{profile.department ?? "未填部門"}</span></td>
                      <td>{profile.employeeNo ?? "無員編"}<br /><span className="text-xs text-stone-600">{profile.phone ?? "無手機"}</span></td>
                      <td>{profile.defaultPickupLocation ?? "未記錄"}</td>
                      <td>{profile.bookingCount}</td>
                      <td>
                        <Button
                          type="button"
                          variant={profile.receivesGroNotifications ? "secondary" : "primary"}
                          onClick={() => toggleRecipient(profile)}
                          loading={savingKey === profile.id}
                        >
                          {profile.receivesGroNotifications ? <BellOff size={15} /> : <Bell size={15} />}
                          {profile.receivesGroNotifications ? "取消通知" : "設為通知管理員"}
                        </Button>
                      </td>
                      <td className="text-xs">{new Date(profile.lastUsedAt).toLocaleString("zh-TW")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            mobile={profiles.map((profile) => (
              <article className="rounded-[8px] border border-border bg-surface p-4" key={profile.id}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold">{profile.employeeName ?? profile.lineDisplayName ?? "未填姓名"}</p><p className="mt-1 font-mono text-xs text-stone-500">{profile.maskedLineUserId}</p></div>
                  <span className="status-chip status-chip-success"><UsersRound size={13} />{profile.bookingCount} 筆</span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-stone-500">部門</dt><dd className="mt-1">{profile.department ?? "未填"}</dd></div>
                  <div><dt className="text-xs text-stone-500">手機</dt><dd className="mt-1">{profile.phone ?? "未填"}</dd></div>
                </dl>
                <Button
                  type="button"
                  className="mt-4 w-full"
                  variant={profile.receivesGroNotifications ? "secondary" : "primary"}
                  onClick={() => toggleRecipient(profile)}
                  loading={savingKey === profile.id}
                >
                  {profile.receivesGroNotifications ? <BellOff size={15} /> : <Bell size={15} />}
                  {profile.receivesGroNotifications ? "取消 GRO 通知" : "設為通知管理員"}
                </Button>
              </article>
            ))}
          />
        ) : null}
      </Card>
    </div>
  );
}
