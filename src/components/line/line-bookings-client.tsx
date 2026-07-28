"use client";

import { ArrowLeft, BusFront, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/admin-ui";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLanguage } from "@/components/i18n/language-provider";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";
import type { ManagedBookingView } from "@/lib/booking-management";
import type { LineProfileView } from "@/lib/line-profile-view";
import { statusTranslationKey, translateServerError, type TranslationKey } from "@/lib/i18n";

type LineBooking = ManagedBookingView & { id: string };

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

function statusLabel(booking: LineBooking, t: Translate) {
  if (booking.status === "waitlist") {
    return booking.waitlistPosition
      ? `${t("status.waitlist")} · ${t("success.position", { position: booking.waitlistPosition })}`
      : t("status.waitlist");
  }
  return t(statusTranslationKey(booking.status));
}

export function LineBookingsClient({ profile }: { profile: LineProfileView }) {
  const { locale, t } = useLanguage();
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
    fetchWithTimeout("/api/me/bookings", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await readJsonResponse<{ bookings?: LineBooking[]; error?: string }>(response, t("lineBookings.loadFailed"));
        if (!response.ok || !body.bookings) throw new Error(translateServerError(locale, body.error, "lineBookings.loadFailed"));
        setBookings(body.bookings);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : t("lineBookings.loadFailed"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [locale, reloadKey, t]);

  async function cancelBooking() {
    if (!cancelTarget) return;
    setCanceling(true);
    try {
      const response = await fetchWithTimeout(`/api/me/bookings/${encodeURIComponent(cancelTarget.id)}/cancel`, { method: "PATCH" });
      const body = await readJsonResponse<{ booking?: LineBooking; error?: string }>(response, t("manage.cancelFailed"));
      if (!response.ok || !body.booking) throw new Error(translateServerError(locale, body.error, "manage.cancelFailed"));
      setBookings((items) => items.map((item) => item.id === body.booking!.id ? body.booking! : item));
      setCancelTarget(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("manage.cancelFailedRetry"));
    } finally {
      setCanceling(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="border-b border-border pb-6">
          <div className="flex justify-end"><LanguageSwitcher /></div>
          <p className="quiet-label mt-4">{t("serviceDesk.name")}</p>
          <div className="mt-2 flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground"><BusFront size={22} aria-hidden="true" /></span>
            <div><h1 className="text-2xl font-bold tracking-tight">{t("saved.title")}</h1><p className="mt-1 text-sm leading-6 text-stone-600">{t("lineBookings.subtitle", { name: profile.lineDisplayName ? `${profile.lineDisplayName}${locale === "zh-TW" ? "，" : ", "}` : "" })}</p></div>
          </div>
        </header>

        {error ? <div className="mt-5 rounded-[6px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900" role="alert">{error}</div> : null}
        {loading ? <div className="mt-6 flex items-center justify-center gap-2 py-16 text-sm text-stone-600"><Loader2 className="animate-spin" size={18} />{t("lineBookings.loading")}</div> : null}
        {!loading && bookings.length === 0 ? <div className="panel mt-6 p-8 text-center"><p className="font-bold">{t("lineBookings.empty")}</p><p className="mt-2 text-sm leading-6 text-stone-600">{t("lineBookings.emptyBody")}</p></div> : null}

        <section className="mt-6 space-y-3" aria-label={t("lineBookings.aria")}>
          {bookings.map((booking) => (
            <article className="panel p-5" key={booking.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div><p className="font-bold">{booking.serviceDate} · {booking.departureTime}</p><p className="mt-1 text-sm text-stone-600">{booking.routeName} · {booking.pickupPoint}</p></div>
                <span className="status-chip status-chip-success">{statusLabel(booking, t)}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xs text-stone-500">{booking.bookingCode}</p>
                {booking.canCancel ? <button className="btn btn-danger" type="button" onClick={() => setCancelTarget(booking)}><XCircle size={16} aria-hidden="true" />{t("lineBookings.cancel")}</button> : <span className="text-xs text-stone-500">{t("lineBookings.cannotCancel")}</span>}
              </div>
            </article>
          ))}
        </section>

        <div className="mt-8 flex flex-wrap gap-2">
          <a className="btn btn-primary" href="/liff"><ArrowLeft size={16} aria-hidden="true" />{t("lineBookings.back")}</a>
          <button className="btn btn-secondary" type="button" onClick={() => setReloadKey((value) => value + 1)}><RefreshCw size={16} aria-hidden="true" />{t("common.refresh")}</button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={t("lineBookings.cancelTitle")}
        description={cancelTarget ? t("lineBookings.cancelDescription", { date: cancelTarget.serviceDate, time: cancelTarget.departureTime }) : ""}
        confirmLabel={t("manage.confirmCancel")}
        cancelLabel={t("manage.keep")}
        danger
        loading={canceling}
        onConfirm={cancelBooking}
      />
    </main>
  );
}
