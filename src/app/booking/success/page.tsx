"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, MapPin, TicketCheck } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { ReactNode } from "react";

export default function BookingSuccessPage() {
  const params = useSearchParams();
  const status = params.get("status") ?? "confirmed";
  const isWaitlist = status === "waitlist";

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <section className="page-enter mx-auto max-w-2xl">
        <div className="executive-card overflow-hidden">
          <div className="border-b border-border bg-surface-strong p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-[8px] bg-primary text-primary-foreground">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="quiet-label">Booking Complete</p>
                <h1 className="mt-1 text-2xl font-bold">{isWaitlist ? "已加入候補" : "正取成功"}</h1>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="rounded-[8px] border border-border bg-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-stone-600">Booking Code</p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-primary">{params.get("booking_code")}</p>
                </div>
                <StatusBadge value={status} className="animate-[page-enter_260ms_ease-out_both]" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="日期" value={params.get("date")} icon={<TicketCheck size={17} />} />
              <Info label="車班" value={params.get("route")} icon={<TicketCheck size={17} />} />
              <Info label="發車時間" value={params.get("departure_time")} icon={<Clock size={17} />} />
              <Info label="上車點" value={params.get("pickup_point")} icon={<MapPin size={17} />} />
            </div>

            <div className="rounded-[8px] border border-border bg-surface-strong p-4 text-sm leading-6 text-stone-700">
              <p className="font-bold">提醒</p>
              <p className="mt-1">請準時抵達上車點。如需取消或調整班次，請洽 GRO 協助處理。</p>
            </div>

            <Link href="/" className="btn btn-primary w-full">返回登記首頁</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value, icon }: { label: string; value: string | null; icon: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-sm text-stone-600">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-bold">{value}</p>
    </div>
  );
}
