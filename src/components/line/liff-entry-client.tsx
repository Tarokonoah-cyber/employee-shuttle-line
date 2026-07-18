"use client";

import Script from "next/script";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { BookingPortal } from "@/app/page";
import { readJsonResponse } from "@/lib/client-http";
import type { LineProfileView } from "@/lib/line-profile-view";
import { LineBookingsClient } from "./line-bookings-client";

type LiffApi = {
  init: (input: { liffId: string }) => Promise<void>;
  isInClient: () => boolean;
  isLoggedIn: () => boolean;
  getIDToken: () => string | null;
};

declare global {
  interface Window {
    liff?: LiffApi;
  }
}

type EntryState =
  | { status: "loading" }
  | { status: "external" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: LineProfileView; view: "booking" | "my-bookings" };

function requestedView() {
  return new URLSearchParams(window.location.search).get("view") === "my-bookings" ? "my-bookings" : "booking";
}

export function LiffEntryClient({ liffId }: { liffId: string }) {
  const [state, setState] = useState<EntryState>({ status: "loading" });
  const initialization = useRef<Promise<void> | null>(null);

  function initialize() {
    if (initialization.current) return;
    initialization.current = (async () => {
      const liff = window.liff;
      if (!liff) throw new Error("無法載入 LINE LIFF SDK");
      await liff.init({ liffId });

      // LINE restores LIFF URL query parameters during init, so read the view only after init resolves.
      const view = requestedView();
      if (!liff.isInClient()) {
        setState({ status: "external" });
        return;
      }
      if (!liff.isLoggedIn()) throw new Error("LINE 尚未登入，請關閉後從官方帳號重新開啟");
      const idToken = liff.getIDToken();
      if (!idToken) throw new Error("無法取得 LINE 身分，請確認 LIFF 已勾選 openid scope");

      const response = await fetch("/api/liff/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const body = await readJsonResponse<{ profile?: LineProfileView; error?: string }>(response, "LINE 身分驗證失敗");
      if (!response.ok || !body.profile) throw new Error(body.error ?? "LINE 身分驗證失敗，請重新從官方帳號開啟");
      setState({ status: "ready", profile: body.profile, view });
    })().catch((error) => {
      setState({ status: "error", message: error instanceof Error ? error.message : "LINE 身分驗證失敗，請重新從官方帳號開啟" });
    });
  }

  if (state.status === "ready") {
    return state.view === "my-bookings"
      ? <LineBookingsClient profile={state.profile} />
      : <BookingPortal profile={state.profile} />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-12">
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onReady={initialize}
        onError={() => setState({ status: "error", message: "無法載入 LINE LIFF SDK，請檢查網路後重試" })}
      />
      <section className="panel w-full max-w-md p-6 text-center" aria-live="polite">
        {state.status === "loading" ? (
          <><Loader2 className="mx-auto animate-spin text-primary" size={32} aria-hidden="true" /><h1 className="mt-4 text-xl font-bold">正在辨識 LINE 身分</h1><p className="mt-2 text-sm text-stone-600">請稍候，不要關閉此頁面。</p></>
        ) : state.status === "external" ? (
          <><ShieldCheck className="mx-auto text-primary" size={32} aria-hidden="true" /><h1 className="mt-4 text-xl font-bold">請從 LINE 官方帳號開啟</h1><p className="mt-2 text-sm leading-6 text-stone-600">這個入口只允許 LINE App 內的 LIFF 頁面使用，請回到「太魯閣員工服務台」重新點選。</p></>
        ) : (
          <><AlertCircle className="mx-auto text-orange-700" size={32} aria-hidden="true" /><h1 className="mt-4 text-xl font-bold">LINE 身分驗證失敗</h1><p className="mt-2 text-sm leading-6 text-stone-600">{state.message}</p></>
        )}
      </section>
    </main>
  );
}
