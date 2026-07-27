"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { Clipboard, Download, Pencil, Plus, RefreshCw, Search, UserPlus } from "lucide-react";
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
import { bookingFiltersToSearchParams, readBookingFilters } from "@/lib/admin-filters";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";
import { tomorrowDateInput } from "@/lib/dates";

type Schedule = {
  id: string;
  serviceDate: string;
  routeName: string;
  departureTime: string;
  pickupPoint: string;
  capacity: number;
};

type Booking = {
  id: string;
  employeeName: string;
  department: string;
  employeeNo?: string | null;
  phone?: string | null;
  status: string;
  bookingCode: string;
  note?: string | null;
  adminOverride: boolean;
  createdAt: string;
  cancelledAt?: string | null;
  scheduleId: string;
  schedule: Schedule;
  hasManagementToken: boolean;
  managementTokenCreatedAt?: string | null;
  lineProfile?: {
    lineDisplayName: string | null;
    maskedLineUserId: string;
    employeeName: string | null;
    employeeNo: string | null;
    department: string | null;
    phone: string | null;
  } | null;
};

type Notice = { text: string; tone: "info" | "success" | "error" };
type PendingAction = {
  title: string;
  description: string;
  label: string;
  danger?: boolean;
  run: () => Promise<void>;
};

const emptyAdd = { scheduleId: "", employeeName: "", department: "", employeeNo: "", phone: "", note: "", adminOverride: false };

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<Card><SkeletonRows rows={8} /></Card>}>
      <BookingsContent />
    </Suspense>
  );
}

function BookingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialFilters = readBookingFilters(searchParams, tomorrowDateInput());
  const [date, setDate] = useState(initialFilters.date);
  const [status, setStatus] = useState(initialFilters.status);
  const [scheduleId, setScheduleId] = useState(initialFilters.scheduleId);
  const [keyword, setKeyword] = useState(initialFilters.keyword);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [lineCopy, setLineCopy] = useState("");
  const [lineOpen, setLineOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const scheduleOptions = useMemo(
    () => schedules.map((schedule) => ({
      value: schedule.id,
      label: `${schedule.serviceDate.slice(0, 10)} ${schedule.departureTime} ${schedule.routeName}`,
    })),
    [schedules],
  );

  const totals = useMemo(
    () => ({
      confirmed: bookings.filter((booking) => booking.status === "confirmed").length,
      waitlist: bookings.filter((booking) => booking.status === "waitlist").length,
      cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
    }),
    [bookings],
  );

  async function loadSchedules() {
    try {
      const response = await fetchWithTimeout(`/api/admin/schedules?date=${date}`);
      const data = await readJsonResponse<{ schedules: Schedule[]; error?: string }>(response, "讀取車班失敗");
      if (!response.ok) throw new Error(data.error ?? "讀取車班失敗");
      setSchedules(data.schedules);
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "讀取車班失敗", tone: "error" });
    }
  }

  async function loadBookings() {
    setLoading(true);
    const params = bookingFiltersToSearchParams({ date, status, scheduleId, keyword });
    try {
      const response = await fetchWithTimeout(`/api/admin/bookings?${params.toString()}`);
      const data = await readJsonResponse<{ bookings: Booking[]; error?: string }>(response, "讀取預約失敗");
      if (!response.ok) throw new Error(data.error ?? "讀取預約失敗");
      setBookings(data.bookings);
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "讀取預約失敗", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSchedules();
    void loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    const params = bookingFiltersToSearchParams({ date, status, scheduleId, keyword });
    router.replace(`/admin/bookings?${params.toString()}`, { scroll: false });
    await loadBookings();
  }

  async function addBooking(event: FormEvent) {
    event.preventDefault();
    try {
      const response = await fetchWithTimeout("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await readJsonResponse<{ error?: string }>(response, "新增失敗");
      if (!response.ok) throw new Error(data.error ?? "新增失敗");
      setNotice({ text: "預約已新增", tone: "success" });
      setAddForm(emptyAdd);
      setAddOpen(false);
      await loadBookings();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "新增失敗", tone: "error" });
    }
  }

  async function action(url: string, body?: unknown) {
    try {
      const response = await fetchWithTimeout(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      const data = await readJsonResponse<{ error?: string; message?: string }>(response, "操作失敗");
      if (!response.ok) throw new Error(data.error ?? "操作失敗");
      setNotice({ text: data.message ?? "操作已完成", tone: "success" });
      setSelected(null);
      setEditing(null);
      await loadBookings();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "操作失敗", tone: "error" });
    }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    try {
      const response = await fetchWithTimeout(`/api/admin/bookings/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await readJsonResponse<{ error?: string }>(response, "更新失敗");
      if (!response.ok) throw new Error(data.error ?? "更新失敗");
      setNotice({ text: "預約已更新", tone: "success" });
      setEditing(null);
      setSelected(null);
      await loadBookings();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "更新失敗", tone: "error" });
    }
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (scheduleId) params.set("schedule_id", scheduleId);
    params.set("include_waitlist", "true");
    params.set("include_cancelled", "true");
    window.location.href = `/api/admin/export?${params.toString()}`;
  }

  async function createLineText() {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (scheduleId) params.set("schedule_id", scheduleId);
    try {
      const response = await fetchWithTimeout(`/api/admin/line-copy?${params.toString()}`);
      const data = await readJsonResponse<{ text: string; error?: string }>(response, "產生公告失敗");
      if (!response.ok) throw new Error(data.error ?? "產生公告失敗");
      setLineCopy(data.text);
      setLineOpen(true);
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "產生公告失敗", tone: "error" });
    }
  }

  async function createEmployeeManagementLink(booking: Booking) {
    try {
      const response = await fetchWithTimeout(`/api/admin/bookings/${booking.id}/management-link`, { method: "POST" });
      const data = await readJsonResponse<{ lineText?: string; error?: string; message?: string }>(response, "建立管理連結失敗");
      if (!response.ok || !data.lineText) throw new Error(data.error ?? "建立管理連結失敗");
      setLineCopy(data.lineText);
      setLineOpen(true);
      setNotice({ text: data.message ?? "管理連結已建立", tone: "success" });
      setSelected(null);
      await loadBookings();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "建立管理連結失敗", tone: "error" });
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      await pendingAction.run();
      setPendingAction(null);
    } finally {
      setActionLoading(false);
    }
  }

  function openBooking(booking: Booking) {
    setSelected(booking);
    setEditing(null);
    setMoveTo("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="日常營運"
        title="預約名單"
        description="先篩選名單，再從單一管理面板處理編輯、候補、換班與管理連結。"
        actions={<Button variant="primary" onClick={() => setAddOpen(true)}><UserPlus size={16} />手動新增</Button>}
      />

      <StatStrip items={[
        { label: "查詢結果", value: bookings.length },
        { label: "正取", value: totals.confirmed },
        { label: "候補", value: totals.waitlist, tone: totals.waitlist ? "warning" : "default" },
        { label: "取消", value: totals.cancelled },
      ]} />

      <form onSubmit={search}>
        <FilterBar>
          <FieldLabel label="日期">
            <input className="field min-w-40" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </FieldLabel>
          <FieldLabel label="車班">
            <select className="field min-w-56" value={scheduleId} onChange={(event) => setScheduleId(event.target.value)}>
              <option value="">全部車班</option>
              {scheduleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="狀態">
            <select className="field min-w-32" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">全部</option>
              <option value="confirmed">正取</option>
              <option value="waitlist">候補</option>
              <option value="cancelled">已取消</option>
            </select>
          </FieldLabel>
          <FieldLabel label="搜尋">
            <input className="field min-w-52" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="姓名、部門、編號、手機、Code" />
          </FieldLabel>
          <Button variant="primary" loading={loading} type="submit"><Search size={16} />查詢</Button>
          <Button type="button" onClick={exportCsv}><Download size={16} />CSV</Button>
          <Button type="button" onClick={createLineText}><Clipboard size={16} />LINE 公告</Button>
        </FilterBar>
      </form>

      {notice && <ActionNotice message={notice.text} tone={notice.tone} />}

      <Card className="overflow-hidden">
        <SectionHeader
          title="名單結果"
          description={`${date} · ${bookings.length} 筆`}
          actions={<Button type="button" onClick={() => search()} loading={loading}><RefreshCw size={16} />重新整理</Button>}
        />
        {loading && <SkeletonRows rows={6} />}
        {!loading && bookings.length === 0 && (
          <div className="p-4"><EmptyState title="沒有符合條件的預約" description="請調整日期、車班或關鍵字，或手動新增一筆預約。" /></div>
        )}
        {!loading && bookings.length > 0 && (
          <ResponsiveDataList
            desktop={
              <table className="table">
                <thead><tr><th>員工</th><th>車班</th><th>狀態</th><th>聯絡資訊</th><th>建立時間</th><th>操作</th></tr></thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td><strong>{booking.employeeName}</strong><br /><span className="font-mono text-xs text-stone-500">{booking.bookingCode}</span>{booking.lineProfile && <><br /><span className="status-chip status-chip-success mt-1">LINE 已綁定</span></>}</td>
                      <td><strong>{booking.schedule.departureTime}</strong> {booking.schedule.routeName}<br /><span className="text-xs text-stone-600">{booking.schedule.pickupPoint}</span></td>
                      <td><div className="flex flex-wrap gap-1"><StatusBadge value={booking.status} />{booking.adminOverride && <StatusBadge value="overbooked" />}</div></td>
                      <td><span className="text-sm">{booking.department}</span><br /><span className="text-xs text-stone-600">{booking.employeeNo ?? "無員編"} · {booking.phone ?? "無手機"}</span></td>
                      <td className="text-xs">{new Date(booking.createdAt).toLocaleString("zh-TW")}</td>
                      <td><Button type="button" onClick={() => openBooking(booking)}>管理</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            mobile={bookings.map((booking) => (
              <article key={booking.id} className="rounded-[8px] border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold">{booking.employeeName}</p><p className="mt-1 text-sm text-stone-600">{booking.department}</p></div>
                  <StatusBadge value={booking.status} />
                </div>
                <p className="mt-3 text-sm"><strong>{booking.schedule.departureTime}</strong> {booking.schedule.routeName}</p>
                <p className="mt-1 font-mono text-xs text-stone-500">{booking.bookingCode}</p>
                {booking.lineProfile && <span className="status-chip status-chip-success mt-2">LINE 已綁定</span>}
                <Button type="button" className="mt-3 w-full" onClick={() => openBooking(booking)}>管理預約</Button>
              </article>
            ))}
          />
        )}
      </Card>

      <SidePanel open={addOpen} onOpenChange={setAddOpen} title="手動新增預約" description="較少使用的新增流程收納於此，不干擾名單查詢。">
        <form className="space-y-4" onSubmit={addBooking}>
          <FieldLabel label="車班" required>
            <select className="field" value={addForm.scheduleId} onChange={(event) => setAddForm({ ...addForm, scheduleId: event.target.value })} required>
              <option value="">選擇車班</option>
              {scheduleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="員工姓名" required><input className="field" value={addForm.employeeName} onChange={(event) => setAddForm({ ...addForm, employeeName: event.target.value })} required /></FieldLabel>
          <FieldLabel label="部門" required><input className="field" value={addForm.department} onChange={(event) => setAddForm({ ...addForm, department: event.target.value })} required /></FieldLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="員工編號"><input className="field" value={addForm.employeeNo} onChange={(event) => setAddForm({ ...addForm, employeeNo: event.target.value })} /></FieldLabel>
            <FieldLabel label="手機"><input className="field" value={addForm.phone} onChange={(event) => setAddForm({ ...addForm, phone: event.target.value })} /></FieldLabel>
          </div>
          <FieldLabel label="備註"><textarea className="field min-h-24" value={addForm.note} onChange={(event) => setAddForm({ ...addForm, note: event.target.value })} /></FieldLabel>
          <label className="flex items-start gap-2 rounded-[8px] border border-border bg-surface p-3 text-sm font-semibold">
            <input className="mt-1" type="checkbox" checked={addForm.adminOverride} onChange={(event) => setAddForm({ ...addForm, adminOverride: event.target.checked })} />
            <span>強制加入，允許超收</span>
          </label>
          <Button variant="primary" className="w-full"><Plus size={16} />新增預約</Button>
        </form>
      </SidePanel>

      <SidePanel
        open={Boolean(selected)}
        onOpenChange={(open) => { if (!open) { setSelected(null); setEditing(null); } }}
        title={selected ? `管理預約 · ${selected.employeeName}` : "管理預約"}
        description={selected ? `${selected.bookingCode} · ${selected.schedule.departureTime} ${selected.schedule.routeName}` : undefined}
        wide
      >
        {selected && (
          editing ? (
            <form className="space-y-4" onSubmit={saveEdit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldLabel label="員工姓名" required><input className="field" value={editing.employeeName} onChange={(event) => setEditing({ ...editing, employeeName: event.target.value })} /></FieldLabel>
                <FieldLabel label="部門" required><input className="field" value={editing.department} onChange={(event) => setEditing({ ...editing, department: event.target.value })} /></FieldLabel>
                <FieldLabel label="員工編號"><input className="field" value={editing.employeeNo ?? ""} onChange={(event) => setEditing({ ...editing, employeeNo: event.target.value })} /></FieldLabel>
                <FieldLabel label="手機"><input className="field" value={editing.phone ?? ""} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} /></FieldLabel>
              </div>
              <FieldLabel label="備註"><textarea className="field min-h-24" value={editing.note ?? ""} onChange={(event) => setEditing({ ...editing, note: event.target.value })} /></FieldLabel>
              <div className="flex justify-end gap-2"><Button type="button" onClick={() => setEditing(null)}>返回</Button><Button variant="primary" type="submit"><Pencil size={16} />儲存變更</Button></div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2"><StatusBadge value={selected.status} />{selected.adminOverride && <StatusBadge value="overbooked" />}</div>
              <dl className="grid gap-px overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-2">
                {[
                  ["員工", `${selected.employeeName} · ${selected.department}`],
                  ["員編／手機", `${selected.employeeNo ?? "未填"} · ${selected.phone ?? "未填"}`],
                  ["車班", `${selected.schedule.serviceDate.slice(0, 10)} ${selected.schedule.departureTime} ${selected.schedule.routeName}`],
                  ["管理連結", selected.hasManagementToken ? "可用" : "尚未建立"],
                  ["LINE 綁定", selected.lineProfile ? `${selected.lineProfile.lineDisplayName ?? "未提供名稱"} · ${selected.lineProfile.maskedLineUserId}` : "未綁定"],
                ].map(([label, value]) => <div key={label} className="bg-surface p-3"><dt className="text-xs text-stone-500">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}
              </dl>
              {selected.lineProfile && (
                <div className="panel p-4">
                  <p className="text-xs font-semibold text-stone-500">LINE 記憶的員工資料</p>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-stone-500">姓名／部門</dt><dd className="mt-1 font-semibold">{selected.lineProfile.employeeName ?? "未填"} · {selected.lineProfile.department ?? "未填"}</dd></div>
                    <div><dt className="text-stone-500">員編／手機</dt><dd className="mt-1 font-semibold">{selected.lineProfile.employeeNo ?? "未填"} · {selected.lineProfile.phone ?? "未填"}</dd></div>
                  </dl>
                </div>
              )}
              {selected.note && <div className="panel p-4"><p className="text-xs font-semibold text-stone-500">備註</p><p className="mt-2 text-sm leading-6">{selected.note}</p></div>}

              <section>
                <h3 className="mb-3 font-bold">基本操作</h3>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => setEditing({ ...selected })}><Pencil size={15} />編輯資料</Button>
                  <Button type="button" onClick={() => setPendingAction({
                    title: selected.hasManagementToken ? "重設管理連結" : "建立管理連結",
                    description: selected.hasManagementToken ? "重設後舊連結會立即失效，請將新連結重新提供給員工。" : "系統將建立員工可自行查看與取消的安全管理連結。",
                    label: selected.hasManagementToken ? "確認重設" : "確認建立",
                    run: () => createEmployeeManagementLink(selected),
                  })}><Clipboard size={15} />{selected.hasManagementToken ? "重設管理連結" : "建立管理連結"}</Button>
                </div>
              </section>

              {selected.status !== "cancelled" && (
                <section className="border-t border-border pt-5">
                  <h3 className="mb-3 font-bold">調整狀態</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.status === "waitlist" && <>
                      <Button type="button" onClick={() => action(`/api/admin/bookings/${selected.id}/confirm`, { adminOverride: false })}>轉為正取</Button>
                      <Button type="button" variant="danger" onClick={() => setPendingAction({
                        title: "強制轉為正取",
                        description: "此操作允許超收，可能使正取人數超過車班名額。",
                        label: "允許超收並轉正取",
                        danger: true,
                        run: () => action(`/api/admin/bookings/${selected.id}/confirm`, { adminOverride: true }),
                      })}>強制轉正取</Button>
                    </>}
                    <Button type="button" variant="danger" onClick={() => setPendingAction({
                      title: "取消此預約",
                      description: `確定取消 ${selected.employeeName} 的預約？正取取消後可能觸發候補遞補。`,
                      label: "確認取消",
                      danger: true,
                      run: () => action(`/api/admin/bookings/${selected.id}/cancel`),
                    })}>取消預約</Button>
                  </div>
                </section>
              )}

              <section className="border-t border-border pt-5">
                <h3 className="mb-3 font-bold">更換車班</h3>
                <div className="flex gap-2">
                  <select className="field" value={moveTo} onChange={(event) => setMoveTo(event.target.value)}>
                    <option value="">選擇新車班</option>
                    {scheduleOptions.filter((option) => option.value !== selected.scheduleId).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <Button type="button" disabled={!moveTo} onClick={() => action(`/api/admin/bookings/${selected.id}/change-schedule`, { scheduleId: moveTo, adminOverride: false })}>更換</Button>
                </div>
              </section>
            </div>
          )
        )}
      </SidePanel>

      <SidePanel open={lineOpen} onOpenChange={setLineOpen} title="LINE 文字預覽" description="確認內容後再複製並貼到 LINE。">
        <textarea className="field min-h-[55vh] font-mono text-sm leading-6" value={lineCopy} readOnly />
        <Button variant="primary" className="mt-4 w-full" onClick={async () => {
          await navigator.clipboard.writeText(lineCopy);
          setNotice({ text: "LINE 文字已複製到剪貼簿", tone: "success" });
        }}><Clipboard size={16} />複製文字</Button>
      </SidePanel>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => { if (!open && !actionLoading) setPendingAction(null); }}
        title={pendingAction?.title ?? ""}
        description={pendingAction?.description ?? ""}
        confirmLabel={pendingAction?.label}
        danger={pendingAction?.danger}
        loading={actionLoading}
        onConfirm={confirmPendingAction}
      />
    </div>
  );
}
