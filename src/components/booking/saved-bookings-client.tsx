"use client";

import Link from "next/link";
import { ArrowRight, BusFront, Link2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLanguage } from "@/components/i18n/language-provider";
import type { ManagedBookingView } from "@/lib/booking-management";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";
import { forgetBookingToken, readSavedBookingTokens, saveBookingToken } from "@/lib/saved-bookings";
import { statusTranslationKey, translateServerError, type TranslationKey } from "@/lib/i18n";

type SavedBooking =
  | { token: string; state: "ready"; booking: ManagedBookingView }
  | { token: string; state: "error"; message: string };

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

function statusLabel(booking: ManagedBookingView, t: Translate) {
  if (booking.status === "waitlist") {
    return booking.waitlistPosition
      ? `${t("status.waitlist")} · ${t("success.position", { position: booking.waitlistPosition })}`
      : t("status.waitlist");
  }
  return t(statusTranslationKey(booking.status));
}

export function SavedBookingsClient() {
  const { locale, t } = useLanguage();
  const [tokens, setTokens] = useState<string[]>([]);
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [ready, setReady] = useState(false);
  const [importValue, setImportValue] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      setTokens(readSavedBookingTokens(window.localStorage));
    } catch {
      setMessage(t("saved.storageBlocked"));
    } finally {
      setReady(true);
    }
  }, [t]);

  useEffect(() => {
    if (!ready || tokens.length === 0) {
      setBookings([]);
      return;
    }

    const controller = new AbortController();
    Promise.all(tokens.map(async (token): Promise<SavedBooking> => {
      try {
        const response = await fetchWithTimeout(`/api/bookings/manage/${encodeURIComponent(token)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await readJsonResponse<{ booking?: ManagedBookingView; error?: string }>(response, t("manage.loadFailed"));
        if (!response.ok || !body.booking) throw new Error(translateServerError(locale, body.error, "saved.expired"));
        return { token, state: "ready", booking: body.booking };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        return { token, state: "error", message: error instanceof Error ? error.message : t("saved.expired") };
      }
    }))
      .then(setBookings)
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setMessage(t("saved.loadFailed"));
      });
    return () => controller.abort();
  }, [locale, ready, t, tokens]);

  function importLink() {
    try {
      const next = saveBookingToken(window.localStorage, importValue);
      if (!next) {
        setMessage(t("saved.invalidImport"));
        return;
      }
      setTokens(next);
      setImportValue("");
      setMessage(t("saved.imported"));
    } catch {
      setMessage(t("saved.cannotSave"));
    }
  }

  function removeToken(token: string) {
    try {
      setTokens(forgetBookingToken(window.localStorage, token));
      setMessage(t("saved.removed"));
    } catch {
      setMessage(t("saved.updateFailed"));
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="border-b border-border pb-6">
          <div className="flex justify-end"><LanguageSwitcher /></div>
          <p className="quiet-label mt-4">{t("serviceDesk.name")}</p>
          <div className="mt-2 flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
              <BusFront aria-hidden="true" size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("saved.title")}</h1>
              <p className="mt-1 text-sm leading-6 text-stone-600">{t("saved.subtitle")}</p>
            </div>
          </div>
        </header>

        {message ? <p className="mt-5 rounded-[6px] border border-border bg-surface px-4 py-3 text-sm" role="status">{message}</p> : null}

        <section className="mt-6 space-y-3" aria-label={t("saved.aria")}>
          {!ready ? <div className="skeleton h-40 rounded-[8px]" aria-label={t("saved.loadingAria")} /> : null}
          {ready && tokens.length === 0 ? (
            <div className="panel px-5 py-8 text-center">
              <BusFront className="mx-auto text-stone-400" aria-hidden="true" size={30} />
              <h2 className="mt-3 font-bold">{t("saved.empty")}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{t("saved.emptyBody")}</p>
              <Link className="btn btn-primary mt-5" href="/">{t("saved.goBooking")} <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          ) : null}
          {bookings.map((item) => (
            <article className="panel p-5" key={item.token}>
              {item.state === "ready" ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4">
                    <div>
                      <p className="font-bold">{item.booking.serviceDate} · {item.booking.departureTime}</p>
                      <p className="mt-1 text-sm text-stone-600">{item.booking.routeName} · {item.booking.pickupPoint}</p>
                    </div>
                    <span className="status-chip status-chip-success">{statusLabel(item.booking, t)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-stone-600">{item.booking.displayName} · {item.booking.bookingCode}</div>
                    <Link className="btn btn-primary" href={`/booking/manage/${encodeURIComponent(item.token)}`}>{t("saved.manage")} <ArrowRight size={16} aria-hidden="true" /></Link>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-bold">{t("saved.loadOneFailed")}</p><p className="mt-1 text-sm text-stone-600">{item.message}</p></div>
                  <button className="btn btn-secondary" type="button" onClick={() => removeToken(item.token)}><Trash2 size={16} aria-hidden="true" /> {t("common.remove")}</button>
                </div>
              )}
            </article>
          ))}
        </section>

        <section className="mt-8 border-t border-border pt-6">
          <div className="flex items-center gap-2"><Link2 size={18} aria-hidden="true" /><h2 className="font-bold">{t("saved.importTitle")}</h2></div>
          <p className="mt-2 text-sm leading-6 text-stone-600">{t("saved.importBody")}</p>
          <label className="quiet-label mt-3 block" htmlFor="management-link">{t("saved.linkLabel")}</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="management-link" className="field min-h-11 flex-1" value={importValue} onChange={(event) => setImportValue(event.target.value)} placeholder="https://…/booking/manage/…" inputMode="url" autoComplete="off" />
            <button className="btn btn-secondary min-h-11" type="button" onClick={importLink}><Plus size={16} aria-hidden="true" /> {t("common.add")}</button>
          </div>
          <p className="mt-4 text-xs leading-5 text-stone-500">{t("saved.removeHelp")}</p>
        </section>
      </div>
    </main>
  );
}
