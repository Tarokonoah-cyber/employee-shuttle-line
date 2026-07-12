"use client";

import { useEffect, useState } from "react";
import type { ManagedBookingView } from "@/lib/booking-management";
import { readJsonResponse } from "@/lib/client-http";
import { SuccessReceipt } from "./success-receipt";

type BookingResponse = {
  booking: ManagedBookingView;
  error?: string;
};

function statusLabel(booking: ManagedBookingView) {
  if (booking.status === "waitlist") {
    return booking.waitlistPosition ? `候補中（第 ${booking.waitlistPosition} 位）` : "候補中";
  }
  return {
    confirmed: "已確認",
    promoted: "已由候補遞補",
    cancelled: "已取消",
    schedule_cancelled: "班次已取消",
  }[booking.status];
}

function lineText(booking: ManagedBookingView, managementUrl: string) {
  return [
    "【員工車報名狀態】",
    `員工：${booking.displayName}`,
    `日期：${booking.serviceDate}`,
    `班次：${booking.departureTime} ${booking.routeName}`,
    `上車點：${booking.pickupPoint}`,
    `狀態：${statusLabel(booking)}`,
    `管理報名：${managementUrl}`,
  ].join("\n");
}

export function BookingSuccessClient({ token }: { token: string }) {
  const [data, setData] = useState<BookingResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/bookings/manage/${encodeURIComponent(token)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await readJsonResponse<BookingResponse>(response, "無法讀取報名結果");
        if (!response.ok) throw new Error(body.error ?? "無法讀取報名結果");
        setData(body);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "無法讀取報名結果");
      });
    return () => controller.abort();
  }, [token]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="text-xl font-bold">無法顯示報名結果</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="skeleton mx-auto h-[34rem] w-full max-w-md sm:rounded-[8px]" aria-label="正在讀取報名結果" />;
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
      lineText={lineText(data.booking, managementUrl)}
    />
  );
}
