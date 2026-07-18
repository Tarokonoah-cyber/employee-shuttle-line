import type { Metadata } from "next";
import { LiffEntryClient } from "@/components/line/liff-entry-client";

export const metadata: Metadata = {
  title: "員工車登記｜太魯閣員工服務台",
  description: "使用 LINE LIFF 安全辨識員工身分並完成員工車登記。",
};

export default function LiffPage() {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim();
  if (!liffId) {
    return <main className="grid min-h-screen place-items-center bg-background px-5"><div className="panel max-w-md p-6 text-center"><h1 className="text-xl font-bold">LIFF 尚未設定</h1><p className="mt-2 text-sm text-stone-600">請聯絡管理員完成 LINE Login 與 Railway 環境變數設定。</p></div></main>;
  }
  return <LiffEntryClient liffId={liffId} />;
}
