"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, Clock3, Loader2, MapPin, RotateCw, X } from "lucide-react";
import type { ManagedBookingView } from "@/lib/booking-management";
import { readJsonResponse } from "@/lib/client-http";
import { saveBookingToken } from "@/lib/saved-bookings";
import { StatusBadge } from "@/components/status-badge";

type ManageResponse = {
  booking: ManagedBookingView;
  error?: string;
  message?: string;
};

function taipeiDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function statusBadgeValue(booking: ManagedBookingView) {
  if (booking.status === "schedule_cancelled") return "schedule_cancelled";
  if (booking.status === "promoted") return "promoted";
  return booking.status;
}

export function BookingManagementPanel({ token }: { token: string }) {
  const [booking, setBooking] = useState<ManagedBookingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/bookings/manage/${encodeURIComponent(token)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await readJsonResponse<ManageResponse>(response, "無法讀取報名");
        if (!response.ok) throw new Error(body.error ?? "無法使用此管理連結");
        setBooking(body.booking);
        try {
          saveBookingToken(window.localStorage, token);
        } catch {
          // The management page remains usable when browser storage is unavailable.
        }
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "無法讀取報名");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, reloadKey]);

  async function cancelBooking() {
    setCanceling(true);
    setCancelError("");
    try {
      const response = await fetch(`/api/bookings/manage/${encodeURIComponent(token)}/cancel`, { method: "PATCH" });
      const body = await readJsonResponse<ManageResponse>(response, "取消失敗");
      if (!response.ok) throw new Error(body.error ?? "取消失敗");
      setBooking(body.booking);
      setConfirmOpen(false);
    } catch (requestError) {
      setCancelError(requestError instanceof Error ? requestError.message : "取消失敗，請稍後再試");
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return <div className="skeleton mx-auto h-[32rem] w-full max-w-md rounded-[8px]" aria-label="正在讀取報名" />;
  }

  if (error || !booking) {
    return (
      <section className="mx-auto max-w-md rounded-[8px] border border-stone-200 bg-white px-5 py-12 text-center">
        <AlertCircle size={30} className="mx-auto text-stone-400" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-bold">無法開啟報名</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">{error || "管理連結無效或不存在。"}</p>
        <button type="button" className="btn btn-secondary mt-5" onClick={() => setReloadKey((value) => value + 1)}>
          <RotateCw size={16} aria-hidden="true" />重新整理
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-md overflow-hidden bg-white sm:rounded-[8px] sm:border sm:border-stone-200">
      <header className="border-b border-stone-200 px-5 py-5">
        <p className="text-xs font-semibold text-emerald-800">員工車報名</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">我的報名</h1>
            <p className="mt-1 font-mono text-sm text-stone-500">{booking.bookingCode}</p>
          </div>
          <StatusBadge value={statusBadgeValue(booking)} />
        </div>
        {booking.cancellationUnavailableReason === "deadline_passed" && (
          <div className="mt-3"><StatusBadge value="cancellation_closed" /></div>
        )}
      </header>

      <div className="px-5 py-5">
        <div className="flex items-baseline gap-3 border-b border-stone-100 pb-4">
          <span className="font-mono text-3xl font-bold">{booking.departureTime}</span>
          <span className="font-semibold">{booking.routeName}</span>
        </div>
        <dl className="divide-y divide-stone-100 text-sm">
          <div className="flex justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-stone-500"><CalendarDays size={16} />搭乘日期</dt>
            <dd className="font-semibold">{booking.serviceDate}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-stone-500"><MapPin size={16} />上車點</dt>
            <dd className="text-right font-semibold">{booking.pickupPoint}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-stone-500"><Clock3 size={16} />報名時間</dt>
            <dd className="text-right">{taipeiDateTime(booking.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-stone-500">報名／取消截止</dt>
            <dd className="text-right">{taipeiDateTime(booking.deadline)}</dd>
          </div>
          {booking.status === "waitlist" && booking.waitlistPosition && (
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-stone-500">目前候補順位</dt>
              <dd className="font-semibold text-amber-800">第 {booking.waitlistPosition} 位</dd>
            </div>
          )}
        </dl>

        {cancelError && <p role="alert" className="mt-4 rounded-[6px] border border-red-200 bg-red-50 p-3 text-sm text-red-800">{cancelError}</p>}

        {booking.canCancel ? (
          <button type="button" className="btn btn-danger mt-5 min-h-12 w-full" onClick={() => setConfirmOpen(true)}>取消這筆報名</button>
        ) : (
          <p className="mt-5 rounded-[7px] bg-stone-100 p-3 text-center text-sm text-stone-600">
            {booking.cancellationUnavailableReason === "already_cancelled"
              ? "此報名已取消。"
              : booking.cancellationUnavailableReason === "schedule_cancelled"
                ? "此班次已取消，請洽 GRO。"
                : "已超過可取消時間，如需協助請洽 GRO。"}
          </p>
        )}
      </div>

      <Dialog.Root open={confirmOpen} onOpenChange={(open) => !canceling && setConfirmOpen(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-[8px] bg-white p-5 shadow-xl outline-none" aria-describedby="cancel-description">
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="text-lg font-bold">確認取消報名</Dialog.Title>
              <Dialog.Close asChild><button type="button" className="grid h-9 w-9 place-items-center" aria-label="關閉" disabled={canceling}><X size={19} /></button></Dialog.Close>
            </div>
            <Dialog.Description id="cancel-description" className="mt-3 text-sm leading-6 text-stone-600">
              確定取消 {booking.serviceDate}，{booking.departureTime} {booking.routeName}？取消後無法自行恢復。
            </Dialog.Description>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Dialog.Close asChild><button type="button" className="btn btn-secondary" disabled={canceling}>保留報名</button></Dialog.Close>
              <button type="button" className="btn btn-danger" onClick={cancelBooking} disabled={canceling}>
                {canceling && <Loader2 size={16} className="animate-spin" />}{canceling ? "取消中" : "確認取消"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
