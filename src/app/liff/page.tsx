import type { Metadata } from "next";
import { LiffEntryClient, LiffNotConfigured } from "@/components/line/liff-entry-client";

export const metadata: Metadata = {
  title: "員工車登記｜Employee Shuttle｜Shuttle Karyawan",
  description: "使用 LINE 安全完成中文、English 或 Bahasa Indonesia 員工車登記。",
};

export default function LiffPage() {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim();
  if (!liffId) return <LiffNotConfigured />;
  return <LiffEntryClient liffId={liffId} />;
}
