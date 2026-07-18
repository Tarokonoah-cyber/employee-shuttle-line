"use client";

import { ArrowLeft, BusFront, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/admin-ui";
import { readJsonResponse } from "@/lib/client-http";
import type { ManagedBookingView } from "@/lib/booking-management";
import type { LineProfileView } from "@/lib/line-profile-view";

type LineBooking = ManagedBookingView & { id: string };

function statusLabel(booking: LineBooking) {
  if (booking.status === "waitlist") return booking.waitlistPosition ? `候補第 ${booking.waitlistPosition} 位` : "候補中";
  return { confirmed: "正取", promoted: "候補已遞補", cancelled: "已取消", schedule_cancelled: "班次已取消" }[booking.status];
}

export function LineBookingsClient({ profile }: { profile: LineProfileView }) {
  const [bookings, setBookings] = useState<LineBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<LineBooking | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/me/bookings", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await readJsonResponse<{ bookings?: LineBooking[]; error?: string }>(response, "讀取員工車報名失敗");
        if (!response.ok || !body.bookings) throw new Error(body.error ?? "讀取員工車報名失敗");
        setBookings(body.bookings);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "讀取員工車報名失敗");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  async function cancelBooking() {
    if (!cancelTarget) return;
    setCanceling(true);
    try {
      const response = await fetch(`/api/me/bookings/${encodeURIComponent(cancelTarget.id)}/cancel`, { method: "PATCH" });
      const body = await readJsonResponse<{ booking?: LineBooking; error?: string }>(response, "取消失敗");
      if (!response.ok || !body.booking) throw new Error(body.error ?? "取消失敗");
      setBookings((items) => items.map((item) => item.id === body.booking!.id ? body.booking! : item));
      setCancelTarget(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "取消失敗，請稍後再試");
    } finally {
      setCanceling(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="border-b border-border pb-6">
          <p className="quiet-label">太魯閣員工服務台</p>
          <div className="mt-2 flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground"><BusFront size={22} aria-hidden="true" /></span>
            <div><h1 className="text-2xl font-bold tracking-tight">我的員工車報名</h1><p className="mt-1 text-sm leading-6 text-stone-600">{profile.lineDisplayName ? `${profile.lineDisplayName}，` : ""}以下是此 LINE 帳號送出的報名。</p></div>
          </div>
        </header>

        {error ? <div className="mt-5 rounded-[6px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900" role="alert">{error}</div> : null}
        {loading ? <div className="mt-6 flex items-center justify-center gap-2 py-16 text-sm text-stone-600"><Loader2 className="animate-spin" size={18} />讀取報名中</div> : null}
        {!loading && bookings.length === 0 ? <div className="panel mt-6 p-8 text-center"><p className="font-bold">目前沒有已綁定的員工車報名</p><p className="mt-2 text-sm leading-6 text-stone-600">舊報名若沒有 LINE profile，仍可使用原管理連結查看；下一次從 LIFF 報名後會自動出現在這裡。</p></div> : null}

        <section className="mt-6 space-y-3" aria-label="此 LINE 帳號的員工車報名">
          {bookings.map((booking) => (
            <article className="panel p-5" key={booking.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div><p className="font-bold">{booking.serviceDate} · {booking.departureTime}</p><p className="mt-1 text-sm text-stone-600">{booking.routeName} · {booking.pickupPoint}</p></div>
                <span className="status-chip status-chip-success">{statusLabel(booking)}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xs text-stone-500">{booking.bookingCode}</p>
                {booking.canCancel ? <button className="btn btn-danger" type="button" onClick={() => setCancelTarget(booking)}><XCircle size={16} aria-hidden="true" />取消報名</button> : <span className="text-xs text-stone-500">目前不可自助取消</span>}
              </div>
            </article>
          ))}
        </section>

        <div className="mt-8 flex flex-wrap gap-2">
          <a className="btn btn-primary" href="/liff"><ArrowLeft size={16} aria-hidden="true" />返回員工車登記</a>
          <button className="btn btn-secondary" type="button" onClick={() => setReloadKey((value) => value + 1)}><RefreshCw size={16} aria-hidden="true" />重新整理</button>
        </div>
      </div>

      <ConfirmDialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)} title="取消員工車報名" description={cancelTarget ? `確定取消 ${cancelTarget.serviceDate} ${cancelTarget.departureTime} 的報名？正取取消後可能會自動遞補候補。` : ""} confirmLabel="確認取消" danger loading={canceling} onConfirm={cancelBooking} />
    </main>
  );
}
