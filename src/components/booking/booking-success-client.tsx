"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { ManagedBookingView } from "@/lib/booking-management";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";
import { saveBookingToken } from "@/lib/saved-bookings";
import { statusTranslationKey, translateServerError, type TranslationKey } from "@/lib/i18n";
import { SuccessReceipt } from "./success-receipt";

type BookingResponse = {
  booking: ManagedBookingView;
  error?: string;
};

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

function statusLabel(booking: ManagedBookingView, t: Translate) {
  if (booking.status === "waitlist") {
    return booking.waitlistPosition
      ? `${t("status.waitlist")} (${t("success.position", { position: booking.waitlistPosition })})`
      : t("status.waitlist");
  }
  return t(statusTranslationKey(booking.status));
}

function lineText(booking: ManagedBookingView, managementUrl: string, t: Translate) {
  return [
    t("success.lineTitle"),
    t("success.lineEmployee", { value: booking.displayName }),
    t("success.lineDate", { value: booking.serviceDate }),
    t("success.lineSchedule", { value: `${booking.departureTime} ${booking.routeName}` }),
    t("success.linePickup", { value: booking.pickupPoint }),
    t("success.lineStatus", { value: statusLabel(booking, t) }),
    t("success.lineManage", { value: managementUrl }),
  ].join("\n");
}

export function BookingSuccessClient({ token }: { token: string }) {
  const { locale, t } = useLanguage();
  const [data, setData] = useState<BookingResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchWithTimeout(`/api/bookings/manage/${encodeURIComponent(token)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await readJsonResponse<BookingResponse>(response, t("success.loadFailed"));
        if (!response.ok) throw new Error(translateServerError(locale, body.error, "success.loadFailed"));
        setData(body);
        try {
          saveBookingToken(window.localStorage, token);
        } catch {
          // Private browsing or browser policy may disable storage; the original management link still works.
        }
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : t("success.loadFailed"));
      });
    return () => controller.abort();
  }, [locale, t, token]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <div className="mb-8 flex justify-end">
          <LanguageSwitcher />
        </div>
        <h1 className="text-xl font-bold">{t("success.displayFailed")}</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="skeleton mx-auto h-[34rem] w-full max-w-md sm:rounded-[8px]" aria-label={t("success.loadingAria")} />;
  }

  const managementUrl = `${window.location.origin}/booking/manage/${encodeURIComponent(token)}`;

  return (
    <SuccessReceipt
      status={data.booking.status}
      bookingCode={data.booking.bookingCode}
      date={data.booking.serviceDate}
      routeName={data.booking.routeName}
      departureTime={data.booking.departureTime}
      pickupPoint={data.booking.pickupPoint}
      waitlistPosition={data.booking.waitlistPosition}
      managementUrl={managementUrl}
      lineText={lineText(data.booking, managementUrl, t)}
    />
  );
}
