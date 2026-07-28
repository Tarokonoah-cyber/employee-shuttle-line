"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, Clock3, Loader2, MapPin, RotateCw, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLanguage } from "@/components/i18n/language-provider";
import type { ManagedBookingView } from "@/lib/booking-management";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";
import { saveBookingToken } from "@/lib/saved-bookings";
import { StatusBadge } from "@/components/status-badge";
import { intlLocale, statusTranslationKey, translateServerError, type AppLocale } from "@/lib/i18n";

type ManageResponse = {
  booking: ManagedBookingView;
  error?: string;
  message?: string;
};

function taipeiDateTime(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
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
  const { locale, t } = useLanguage();
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
    fetchWithTimeout(`/api/bookings/manage/${encodeURIComponent(token)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await readJsonResponse<ManageResponse>(response, t("manage.loadFailed"));
        if (!response.ok) throw new Error(translateServerError(locale, body.error, "manage.linkFailed"));
        setBooking(body.booking);
        try {
          saveBookingToken(window.localStorage, token);
        } catch {
          // The management page remains usable when browser storage is unavailable.
        }
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : t("manage.loadFailed"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [locale, reloadKey, t, token]);

  async function cancelBooking() {
    setCanceling(true);
    setCancelError("");
    try {
      const response = await fetchWithTimeout(`/api/bookings/manage/${encodeURIComponent(token)}/cancel`, { method: "PATCH" });
      const body = await readJsonResponse<ManageResponse>(response, t("manage.cancelFailed"));
      if (!response.ok) throw new Error(translateServerError(locale, body.error, "manage.cancelFailed"));
      setBooking(body.booking);
      setConfirmOpen(false);
    } catch (requestError) {
      setCancelError(requestError instanceof Error ? requestError.message : t("manage.cancelFailedRetry"));
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return <div className="skeleton mx-auto h-[32rem] w-full max-w-md rounded-[8px]" aria-label={t("manage.loadingAria")} />;
  }

  if (error || !booking) {
    return (
      <section className="mx-auto max-w-md rounded-[8px] border border-stone-200 bg-white px-5 py-12 text-center">
        <div className="mb-5 flex justify-end"><LanguageSwitcher /></div>
        <AlertCircle size={30} className="mx-auto text-stone-400" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-bold">{t("manage.openFailed")}</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">{error || t("manage.invalidLink")}</p>
        <button type="button" className="btn btn-secondary mt-5" onClick={() => setReloadKey((value) => value + 1)}>
          <RotateCw size={16} aria-hidden="true" />{t("common.refresh")}
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-md overflow-hidden bg-white sm:rounded-[8px] sm:border sm:border-stone-200">
      <header className="border-b border-stone-200 px-5 py-5">
        <div className="flex justify-end"><LanguageSwitcher /></div>
        <p className="mt-4 text-xs font-semibold text-emerald-800">{t("booking.title")}</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{t("manage.myBooking")}</h1>
            <p className="mt-1 font-mono text-sm text-stone-500">{booking.bookingCode}</p>
          </div>
          <StatusBadge value={statusBadgeValue(booking)} label={t(statusTranslationKey(statusBadgeValue(booking)))} />
        </div>
        {booking.cancellationUnavailableReason === "deadline_passed" && (
          <div className="mt-3"><StatusBadge value="cancellation_closed" label={t("status.cancellation_closed")} /></div>
        )}
      </header>

      <div className="px-5 py-5">
        <div className="flex items-baseline gap-3 border-b border-stone-100 pb-4">
          <span className="font-mono text-3xl font-bold">{booking.departureTime}</span>
          <span className="font-semibold">{booking.routeName}</span>
        </div>
        <dl className="divide-y divide-stone-100 text-sm">
          <div className="flex justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-stone-500"><CalendarDays size={16} />{t("manage.serviceDate")}</dt>
            <dd className="font-semibold">{booking.serviceDate}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-stone-500"><MapPin size={16} />{t("manage.pickupPoint")}</dt>
            <dd className="text-right font-semibold">{booking.pickupPoint}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-stone-500"><Clock3 size={16} />{t("manage.createdAt")}</dt>
            <dd className="text-right">{taipeiDateTime(booking.createdAt, locale)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-stone-500">{t("manage.deadline")}</dt>
            <dd className="text-right">{taipeiDateTime(booking.deadline, locale)}</dd>
          </div>
          {booking.status === "waitlist" && booking.waitlistPosition && (
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-stone-500">{t("manage.waitlistPosition")}</dt>
              <dd className="font-semibold text-amber-800">{t("success.position", { position: booking.waitlistPosition })}</dd>
            </div>
          )}
        </dl>

        {cancelError && <p role="alert" className="mt-4 rounded-[6px] border border-red-200 bg-red-50 p-3 text-sm text-red-800">{cancelError}</p>}

        {booking.canCancel ? (
          <button type="button" className="btn btn-danger mt-5 min-h-12 w-full" onClick={() => setConfirmOpen(true)}>{t("manage.cancelButton")}</button>
        ) : (
          <p className="mt-5 rounded-[7px] bg-stone-100 p-3 text-center text-sm text-stone-600">
            {booking.cancellationUnavailableReason === "already_cancelled"
              ? t("manage.alreadyCancelled")
              : booking.cancellationUnavailableReason === "schedule_cancelled"
                ? t("manage.scheduleCancelled")
                : t("manage.deadlinePassed")}
          </p>
        )}
      </div>

      <Dialog.Root open={confirmOpen} onOpenChange={(open) => !canceling && setConfirmOpen(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-[8px] bg-white p-5 shadow-xl outline-none" aria-describedby="cancel-description">
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="text-lg font-bold">{t("manage.confirmTitle")}</Dialog.Title>
              <Dialog.Close asChild><button type="button" className="grid h-9 w-9 place-items-center" aria-label={t("common.close")} disabled={canceling}><X size={19} /></button></Dialog.Close>
            </div>
            <Dialog.Description id="cancel-description" className="mt-3 text-sm leading-6 text-stone-600">
              {t("manage.confirmDescription", {
                date: booking.serviceDate,
                schedule: `${booking.departureTime} ${booking.routeName}`,
              })}
            </Dialog.Description>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Dialog.Close asChild><button type="button" className="btn btn-secondary" disabled={canceling}>{t("manage.keep")}</button></Dialog.Close>
              <button type="button" className="btn btn-danger" onClick={cancelBooking} disabled={canceling}>
                {canceling && <Loader2 size={16} className="animate-spin" />}{canceling ? t("manage.canceling") : t("manage.confirmCancel")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
