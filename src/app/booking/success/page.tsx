"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

export default function BookingSuccessPage() {
  const params = useSearchParams();
  const status = params.get("status") ?? "confirmed";

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <section className="mx-auto max-w-xl">
        <div className="panel p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-primary" size={28} />
            <div>
              <p className="text-sm font-semibold text-primary">登記結果</p>
              <h1 className="text-2xl font-bold">{status === "waitlist" ? "已加入候補" : "正取成功"}</h1>
            </div>
          </div>
          <div className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-stone-600">狀態</span>
              <StatusBadge value={status} />
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-stone-600">Booking Code</span>
              <strong className="font-mono">{params.get("booking_code")}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-stone-600">日期</span>
              <strong>{params.get("date")}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-stone-600">車班</span>
              <strong>{params.get("route")}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-stone-600">發車時間</span>
              <strong>{params.get("departure_time")}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-stone-600">上車點</span>
              <strong>{params.get("pickup_point")}</strong>
            </div>
          </div>
          <p className="mt-5 flex gap-2 rounded-[6px] bg-muted p-3 text-sm text-stone-700">
            <ClipboardCheck size={18} className="mt-0.5 shrink-0" />
            請保存 booking code。若需取消或調整，請聯絡 GRO 後台協助處理。
          </p>
          <Link href="/" className="btn btn-secondary mt-5 w-full">返回登記首頁</Link>
        </div>
      </section>
    </main>
  );
}
