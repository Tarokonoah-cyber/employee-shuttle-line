"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Route, ShieldCheck } from "lucide-react";
import { readJsonResponse } from "@/lib/client-http";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const password = String(new FormData(event.currentTarget).get("password") ?? "");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await readJsonResponse<{ error?: string }>(response, "登入失敗");
      if (!response.ok) throw new Error(data.error ?? "登入失敗");
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-background px-4 py-8 lg:grid-cols-[1fr_420px] lg:px-10">
      <section className="hidden min-h-[calc(100vh-4rem)] flex-col justify-between rounded-[12px] border border-border bg-[#f8f5ee] p-8 lg:flex">
        <div>
          <div className="inline-flex items-center gap-3 rounded-[8px] border border-border bg-surface px-4 py-3">
            <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-primary text-primary-foreground">
              <Route size={20} />
            </div>
            <div>
              <p className="quiet-label">Operations Control</p>
              <h1 className="text-xl font-bold">員工車調度後台</h1>
            </div>
          </div>
          <div className="mt-16 max-w-xl">
            <p className="quiet-label">GRO Console</p>
            <h2 className="mt-3 text-4xl font-bold leading-tight">名額、候補、匯出與公告集中管理。</h2>
            <p className="mt-5 text-sm leading-7 text-stone-600">
              後台提供即時車班狀態、預約名單篩選、強制轉正取、CSV 匯出與 LINE 群組公告文字複製。
            </p>
          </div>
        </div>
        <div className="grid max-w-2xl grid-cols-3 gap-3">
          {["即時名額", "候補排序", "Audit Log"].map((item) => (
            <div key={item} className="rounded-[8px] border border-border bg-surface p-4">
              <ShieldCheck size={18} className="text-primary" />
              <p className="mt-3 text-sm font-semibold">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-md place-items-center lg:mx-0">
        <div className="executive-card w-full p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-primary text-primary-foreground">
              <LockKeyhole size={21} />
            </div>
            <div>
              <p className="quiet-label">Secure Login</p>
              <h1 className="text-xl font-bold">管理員登入</h1>
            </div>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            <label className="block text-sm font-semibold">
              後台密碼
              <input className="field mt-1" type="password" name="password" placeholder="輸入 GRO 後台密碼" required disabled={loading} />
            </label>
            {error && <p className="rounded-[6px] border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">{error}</p>}
            <button className="btn btn-primary w-full" disabled={loading}>{loading ? "登入中..." : "登入後台"}</button>
          </form>
          <p className="mt-4 text-xs leading-5 text-stone-600">正式環境需設定 ADMIN_PASSWORD 與 ADMIN_SESSION_SECRET。</p>
        </div>
      </section>
    </main>
  );
}
