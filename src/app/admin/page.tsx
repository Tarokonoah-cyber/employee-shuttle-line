"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "登入失敗");
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="panel w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[6px] bg-muted text-primary">
            <LockKeyhole size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">GRO 後台</p>
            <h1 className="text-xl font-bold">管理員登入</h1>
          </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold">
            後台密碼
            <input className="field mt-1" type="password" name="password" required disabled={loading} />
          </label>
          {error && <p className="rounded-[6px] border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">{error}</p>}
          <button className="btn btn-primary w-full" disabled={loading}>{loading ? "登入中..." : "登入後台"}</button>
        </form>
      </section>
    </main>
  );
}
