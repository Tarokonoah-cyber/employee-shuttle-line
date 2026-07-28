"use client";

import Script from "next/script";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BookingPortal } from "@/app/page";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  CLIENT_REQUEST_TIMEOUT_MS,
  fetchWithTimeout,
  readJsonResponse,
  withClientDeadline,
} from "@/lib/client-http";
import type { LineProfileView } from "@/lib/line-profile-view";
import { translateServerError } from "@/lib/i18n";
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

export function LiffNotConfigured() {
  const { t } = useLanguage();
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <div className="panel max-w-md p-6 text-center">
        <div className="mb-5 flex justify-end"><LanguageSwitcher /></div>
        <h1 className="text-xl font-bold">{t("liff.notConfigured")}</h1>
        <p className="mt-2 text-sm text-stone-600">{t("liff.notConfiguredBody")}</p>
      </div>
    </main>
  );
}

export function LiffEntryClient({ liffId }: { liffId: string }) {
  const { locale, t } = useLanguage();
  const [state, setState] = useState<EntryState>({ status: "loading" });
  const initialization = useRef<Promise<void> | null>(null);
  const deadline = useRef<number | null>(null);

  useEffect(() => {
    deadline.current = Date.now() + CLIENT_REQUEST_TIMEOUT_MS;
    const timer = window.setTimeout(() => {
      setState((current) => current.status === "loading"
        ? { status: "error", message: t("liff.timeout") }
        : current);
    }, CLIENT_REQUEST_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [t]);

  function initialize() {
    if (initialization.current) return;
    initialization.current = (async () => {
      const liff = window.liff;
      if (!liff) throw new Error(t("liff.sdkFailed"));
      const remainingTime = () => Math.max(
        1,
        (deadline.current ?? (Date.now() + CLIENT_REQUEST_TIMEOUT_MS)) - Date.now(),
      );
      await withClientDeadline(
        liff.init({ liffId }),
        remainingTime(),
        t("liff.initTimeout"),
      );

      // LINE restores LIFF URL query parameters during init, so read the view only after init resolves.
      const view = requestedView();
      if (!liff.isInClient()) {
        setState({ status: "external" });
        return;
      }
      if (!liff.isLoggedIn()) throw new Error(t("liff.notLoggedIn"));
      const idToken = liff.getIDToken();
      if (!idToken) throw new Error(t("liff.noIdentity"));

      const response = await fetchWithTimeout("/api/liff/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }, remainingTime());
      const body = await readJsonResponse<{ profile?: LineProfileView; error?: string }>(response, t("liff.verifyFailed"));
      if (!response.ok || !body.profile) throw new Error(translateServerError(locale, body.error, "liff.verifyRetry"));
      setState({ status: "ready", profile: body.profile, view });
    })().catch((error) => {
      setState({ status: "error", message: error instanceof Error ? error.message : t("liff.verifyRetry") });
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
        onError={() => setState({ status: "error", message: t("liff.sdkRetry") })}
      />
      <section className="panel w-full max-w-md p-6 text-center" aria-live="polite">
        <div className="mb-5 flex justify-end"><LanguageSwitcher /></div>
        {state.status === "loading" ? (
          <><Loader2 className="mx-auto animate-spin text-primary" size={32} aria-hidden="true" /><h1 className="mt-4 text-xl font-bold">{t("liff.identifying")}</h1><p className="mt-2 text-sm text-stone-600">{t("liff.wait")}</p></>
        ) : state.status === "external" ? (
          <><ShieldCheck className="mx-auto text-primary" size={32} aria-hidden="true" /><h1 className="mt-4 text-xl font-bold">{t("booking.openFromLineTitle")}</h1><p className="mt-2 text-sm leading-6 text-stone-600">{t("liff.externalBody")}</p></>
        ) : (
          <><AlertCircle className="mx-auto text-orange-700" size={32} aria-hidden="true" /><h1 className="mt-4 text-xl font-bold">{t("liff.verifyFailed")}</h1><p className="mt-2 text-sm leading-6 text-stone-600">{state.message}</p></>
        )}
      </section>
    </main>
  );
}
