"use client";

import Link from "next/link";
import { ArrowRight, BusFront, Link2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ManagedBookingView } from "@/lib/booking-management";
import { fetchWithTimeout, readJsonResponse } from "@/lib/client-http";
import { forgetBookingToken, readSavedBookingTokens, saveBookingToken } from "@/lib/saved-bookings";

type SavedBooking =
  | { token: string; state: "ready"; booking: ManagedBookingView }
  | { token: string; state: "error"; message: string };

function statusLabel(booking: ManagedBookingView) {
  if (booking.status === "waitlist") return booking.waitlistPosition ? `候補第 ${booking.waitlistPosition} 位` : "候補中";
  return {
    confirmed: "正取",
    promoted: "候補已遞補",
    cancelled: "已取消",
    schedule_cancelled: "班次已取消",
  }[booking.status];
}

export function SavedBookingsClient() {
  const [tokens, setTokens] = useState<string[]>([]);
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [ready, setReady] = useState(false);
  const [importValue, setImportValue] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      setTokens(readSavedBookingTokens(window.localStorage));
    } catch {
      setMessage("此瀏覽器目前禁止本機儲存，請直接使用原本的報名管理連結。");
    } finally {
      setReady(true);
    }
  }, []);

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
        const body = await readJsonResponse<{ booking?: ManagedBookingView; error?: string }>(response, "無法讀取報名");
        if (!response.ok || !body.booking) throw new Error(body.error ?? "管理連結已失效");
        return { token, state: "ready", booking: body.booking };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        return { token, state: "error", message: error instanceof Error ? error.message : "管理連結已失效" };
      }
    }))
      .then(setBookings)
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("讀取報名時發生錯誤，請稍後重試。");
      });
    return () => controller.abort();
  }, [ready, tokens]);

  function importLink() {
    try {
      const next = saveBookingToken(window.localStorage, importValue);
      if (!next) {
        setMessage("請貼上完整的員工車報名管理連結。");
        return;
      }
      setTokens(next);
      setImportValue("");
      setMessage("管理連結已加入此裝置。");
    } catch {
      setMessage("此瀏覽器無法保存連結，請直接在瀏覽器開啟原管理連結。");
    }
  }

  function removeToken(token: string) {
    try {
      setTokens(forgetBookingToken(window.localStorage, token));
      setMessage("已從此裝置移除；員工車報名本身沒有取消。");
    } catch {
      setMessage("無法更新此裝置的連結清單。");
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="border-b border-border pb-6">
          <p className="quiet-label">太魯閣員工服務台</p>
          <div className="mt-2 flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
              <BusFront aria-hidden="true" size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">我的員工車報名</h1>
              <p className="mt-1 text-sm leading-6 text-stone-600">顯示曾在這個 LINE 瀏覽器完成或匯入的報名。</p>
            </div>
          </div>
        </header>

        {message ? <p className="mt-5 rounded-[6px] border border-border bg-surface px-4 py-3 text-sm" role="status">{message}</p> : null}

        <section className="mt-6 space-y-3" aria-label="已保存的員工車報名">
          {!ready ? <div className="skeleton h-40 rounded-[8px]" aria-label="正在讀取報名" /> : null}
          {ready && tokens.length === 0 ? (
            <div className="panel px-5 py-8 text-center">
              <BusFront className="mx-auto text-stone-400" aria-hidden="true" size={30} />
              <h2 className="mt-3 font-bold">這個裝置尚未保存報名</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">完成新報名後會自動出現在這裡；既有報名可在下方貼上管理連結。</p>
              <Link className="btn btn-primary mt-5" href="/">前往員工車登記 <ArrowRight size={16} aria-hidden="true" /></Link>
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
                    <span className="status-chip status-chip-success">{statusLabel(item.booking)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-stone-600">{item.booking.displayName} · {item.booking.bookingCode}</div>
                    <Link className="btn btn-primary" href={`/booking/manage/${encodeURIComponent(item.token)}`}>管理報名 <ArrowRight size={16} aria-hidden="true" /></Link>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-bold">無法讀取這筆報名</p><p className="mt-1 text-sm text-stone-600">{item.message}</p></div>
                  <button className="btn btn-secondary" type="button" onClick={() => removeToken(item.token)}><Trash2 size={16} aria-hidden="true" /> 從此裝置移除</button>
                </div>
              )}
            </article>
          ))}
        </section>

        <section className="mt-8 border-t border-border pt-6">
          <div className="flex items-center gap-2"><Link2 size={18} aria-hidden="true" /><h2 className="font-bold">匯入既有管理連結</h2></div>
          <p className="mt-2 text-sm leading-6 text-stone-600">貼上報名成功頁提供的 `/booking/manage/...` 完整連結。token 只保存在這個瀏覽器，不會建立新報名。</p>
          <label className="quiet-label mt-3 block" htmlFor="management-link">員工車報名管理連結</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="management-link" className="field min-h-11 flex-1" value={importValue} onChange={(event) => setImportValue(event.target.value)} placeholder="https://…/booking/manage/…" inputMode="url" autoComplete="off" />
            <button className="btn btn-secondary min-h-11" type="button" onClick={importLink}><Plus size={16} aria-hidden="true" /> 加入</button>
          </div>
          <p className="mt-4 text-xs leading-5 text-stone-500">從清單移除不等於取消報名。換手機、清除 LINE 瀏覽器資料或重設管理連結後，請重新匯入最新連結。</p>
        </section>
      </div>
    </main>
  );
}
