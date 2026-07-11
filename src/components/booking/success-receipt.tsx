"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, CheckCircle2, Clock3, Copy, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

type SuccessReceiptProps = {
  status: string;
  bookingCode: string;
  date: string;
  departureTime: string;
  routeName: string;
  pickupPoint: string;
};

function displayServiceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "—";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

export function SuccessReceipt({ status, bookingCode, date, departureTime, routeName, pickupPoint }: SuccessReceiptProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
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

  return (
    <section className="receipt-enter mx-auto w-full max-w-md overflow-hidden bg-white sm:rounded-[8px] sm:border sm:border-stone-200">
      <div className="px-5 pb-5 pt-7 text-center">
        <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${isWaitlist ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-800"}`}>
          {isWaitlist ? <Clock3 size={25} aria-hidden="true" /> : <CheckCircle2 size={25} aria-hidden="true" />}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-stone-950">{isWaitlist ? "已加入候補" : "正取成功"}</h1>
        <p className="mt-1 text-sm text-stone-600">登記結果已完成，請保留預約代碼。</p>
      </div>

      <div className="border-y border-stone-200 bg-stone-50 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-stone-500">預約代碼</p>
            <input
              ref={bookingCodeRef}
              value={bookingCode || "—"}
              readOnly
              aria-label="預約代碼"
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
            {copied ? "已複製" : copyFailed ? "已選取" : "複製"}
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <p className="text-xs text-stone-500">日期</p>
            <p className="mt-0.5 font-semibold text-stone-900">{displayServiceDate(date)}</p>
          </div>
          <StatusBadge value={status} />
        </div>
        <div className="flex items-baseline gap-3 border-b border-stone-100 py-4">
          <span className="font-mono text-3xl font-bold text-stone-950">{departureTime || "—"}</span>
          <span className="font-semibold text-stone-800">{routeName || "—"}</span>
        </div>
        <div className="flex items-center gap-2 py-4 text-sm text-stone-700">
          <MapPin size={17} className="text-stone-500" aria-hidden="true" />
          <span>{pickupPoint || "—"}</span>
        </div>

        <div className="rounded-[7px] bg-stone-100 px-4 py-3 text-sm leading-6 text-stone-700">
          <p className="font-semibold text-stone-900">乘車提醒</p>
          <p>請準時抵達上車點。取消或調整班次請洽 GRO。</p>
        </div>

        <Link href="/" className="btn btn-primary mt-5 min-h-12 w-full">返回首頁</Link>
      </div>
    </section>
  );
}
