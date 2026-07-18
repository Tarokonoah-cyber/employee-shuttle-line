import type { Metadata } from "next";
import { SavedBookingsClient } from "@/components/booking/saved-bookings-client";

export const metadata: Metadata = {
  title: "我的員工車報名｜太魯閣員工服務台",
  description: "查看保存在此 LINE 瀏覽器的員工車報名管理連結。",
};

export default function MyBookingsPage() {
  return <SavedBookingsClient />;
}
