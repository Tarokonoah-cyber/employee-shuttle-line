import type { Metadata } from "next";
import { LineHelpClient } from "@/components/line/line-help-client";

export const metadata: Metadata = {
  title: "使用說明｜Help｜Petunjuk",
  description: "中文、English、Bahasa Indonesia 員工服務說明。",
};

export default function LineHelpPage() {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim();
  const bookingUrl = liffId ? `https://liff.line.me/${liffId}` : "/liff";
  const myBookingsUrl = liffId ? `https://liff.line.me/${liffId}?view=my-bookings` : "/liff?view=my-bookings";
  return <LineHelpClient bookingUrl={bookingUrl} myBookingsUrl={myBookingsUrl} />;
}
