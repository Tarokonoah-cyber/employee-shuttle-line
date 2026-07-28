"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, CheckCircle2, Clock3, Copy, Link2, MapPin, MessageSquareText } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLanguage } from "@/components/i18n/language-provider";
import { StatusBadge } from "@/components/status-badge";
import { intlLocale, statusTranslationKey, type AppLocale } from "@/lib/i18n";

type SuccessReceiptProps = {
  status: string;
  bookingCode: string;
  date: string;
  departureTime: string;
  routeName: string;
  pickupPoint: string;
  waitlistPosition?: number | null;
  managementUrl?: string;
  lineText?: string;
};

function displayServiceDate(value: string, locale: AppLocale) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

export function SuccessReceipt({ status, bookingCode, date, departureTime, routeName, pickupPoint, waitlistPosition, managementUrl, lineText }: SuccessReceiptProps) {
  const { locale, t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [lineCopied, setLineCopied] = useState(false);
  const bookingCodeRef = useRef<HTMLInputElement>(null);
  const isWaitlist = status === "waitlist";

  async function copyBookingCode() {
    let copySucceeded = false;

    if (navigator.clipboard?.writeText) {
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error("clipboard timeout")), 800);
          navigator.clipboard.writeText(bookingCode).then(
            () => {
              window.clearTimeout(timeout);
              resolve();
            },
            (error) => {
              window.clearTimeout(timeout);
              reject(error);
            },
          );
        });
        copySucceeded = true;
      } catch {
        copySucceeded = false;
      }
    }

    if (!copySucceeded) {
      const textarea = document.createElement("textarea");
      textarea.value = bookingCode;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      copySucceeded = document.execCommand("copy");
      textarea.remove();
    }

    setCopied(copySucceeded);
    setCopyFailed(!copySucceeded);
    if (!copySucceeded) bookingCodeRef.current?.select();
  }

  async function copyText(value: string, onCopied: () => void) {
    try {
      await navigator.clipboard.writeText(value);
      onCopied();
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      onCopied();
    }
  }

  return (
    <section className="receipt-enter mx-auto w-full max-w-md overflow-hidden bg-white sm:rounded-[8px] sm:border sm:border-stone-200">
      <div className="px-5 pb-5 pt-7 text-center">
        <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
        <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${isWaitlist ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-800"}`}>
          {isWaitlist ? <Clock3 size={25} aria-hidden="true" /> : <CheckCircle2 size={25} aria-hidden="true" />}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-stone-950">{isWaitlist ? t("success.waitlistTitle") : t("success.confirmedTitle")}</h1>
        <p className="mt-1 text-sm text-stone-600">{t("success.summary")}</p>
      </div>

      <div className="border-y border-stone-200 bg-stone-50 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-stone-500">{t("success.bookingCode")}</p>
            <input
              ref={bookingCodeRef}
              value={bookingCode || "—"}
              readOnly
              aria-label={t("success.bookingCode")}
              className="mt-1 w-full bg-transparent font-mono text-2xl font-bold text-emerald-900"
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary min-h-10"
            onClick={copyBookingCode}
            disabled={!bookingCode}
            aria-live="polite"
          >
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? t("common.copied") : copyFailed ? t("common.selected") : t("common.copy")}
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <p className="text-xs text-stone-500">{t("success.date")}</p>
            <p className="mt-0.5 font-semibold text-stone-900">{displayServiceDate(date, locale)}</p>
          </div>
          <StatusBadge value={status} label={t(statusTranslationKey(status))} />
        </div>
        <div className="flex items-baseline gap-3 border-b border-stone-100 py-4">
          <span className="font-mono text-3xl font-bold text-stone-950">{departureTime || "—"}</span>
          <span className="font-semibold text-stone-800">{routeName || "—"}</span>
        </div>
        {isWaitlist && waitlistPosition && (
          <div className="border-b border-stone-100 py-3">
            <p className="text-xs text-stone-500">{t("success.waitlistPosition")}</p>
            <p className="mt-0.5 font-semibold text-amber-800">{t("success.position", { position: waitlistPosition })}</p>
          </div>
        )}
        <div className="flex items-center gap-2 py-4 text-sm text-stone-700">
          <MapPin size={17} className="text-stone-500" aria-hidden="true" />
          <span>{pickupPoint || "—"}</span>
        </div>

        <div className="rounded-[7px] bg-stone-100 px-4 py-3 text-sm leading-6 text-stone-700">
          <p className="font-semibold text-stone-900">{t("success.rideReminder")}</p>
          <p>{t("success.rideReminderBody")}</p>
        </div>

        {managementUrl && (
          <div className="mt-5 border-t border-stone-200 pt-5">
            <h2 className="font-bold">{t("success.manageTitle")}</h2>
            <p className="mt-1 text-sm text-stone-600">{t("success.manageBody")}</p>
            <Link href={managementUrl} className="btn btn-primary mt-4 min-h-12 w-full">{t("success.manageButton")}</Link>
            <div className="mt-3 flex gap-2">
              <input className="field min-w-0 flex-1 text-xs" value={managementUrl} readOnly aria-label={t("success.managementLink")} />
              <button type="button" className="btn btn-secondary shrink-0" onClick={() => copyText(managementUrl, () => setLinkCopied(true))}>
                <Link2 size={16} aria-hidden="true" />{linkCopied ? t("common.copied") : t("success.copyLink")}
              </button>
            </div>
          </div>
        )}

        {lineText && (
          <div className="mt-4 rounded-[7px] border border-stone-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText size={16} />{t("success.lineText")}</p>
              <button type="button" className="btn btn-secondary" onClick={() => copyText(lineText, () => setLineCopied(true))}>
                <Copy size={16} aria-hidden="true" />{lineCopied ? t("common.copied") : t("common.copy")}
              </button>
            </div>
            <textarea className="mt-3 min-h-36 w-full resize-none bg-transparent text-xs leading-5 text-stone-600 outline-none" value={lineText} readOnly />
          </div>
        )}

        <Link href="/" className="btn btn-secondary mt-4 min-h-12 w-full">{t("common.backHome")}</Link>
      </div>
    </section>
  );
}
