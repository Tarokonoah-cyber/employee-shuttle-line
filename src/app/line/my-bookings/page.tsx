import type { Metadata } from "next";
import { SavedBookingsClient } from "@/components/booking/saved-bookings-client";

export const metadata: Metadata = {
  title: "我的員工車報名｜My Shuttle Bookings｜Pendaftaran Saya",
  description: "以中文、English 或 Bahasa Indonesia 查看員工車報名。",
};

export default function MyBookingsPage() {
  return <SavedBookingsClient />;
}
