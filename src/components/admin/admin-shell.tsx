"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ClipboardList, FileClock, Gauge, Layers, LogOut, Route } from "lucide-react";
import { clsx } from "clsx";

const items = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/admin/schedules", label: "車班管理", icon: CalendarDays },
  { href: "/admin/templates", label: "模板管理", icon: Layers },
  { href: "/admin/bookings", label: "預約名單", icon: ClipboardList },
  { href: "/admin/audit-logs", label: "操作紀錄", icon: FileClock },
];

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin");
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-border bg-[#f8f5ee] p-5 lg:block">
          <div className="mb-7 rounded-[10px] border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-primary text-primary-foreground">
                <Route size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-500">GRO 後台</p>
                <h1 className="text-lg font-bold">員工車調度</h1>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-stone-600">名額、候補、匯出與 LINE 公告集中管理。</p>
          </div>
          <nav className="space-y-1.5">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 rounded-[7px] px-3 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-muted hover:text-primary",
                    pathname === item.href && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button className="btn btn-secondary mt-8 w-full" onClick={logout}>
            <LogOut size={16} />
            登出
          </button>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="border-b border-border bg-surface/95 px-4 py-4 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="quiet-label">Operations Control</p>
                <h2 className="mt-1 text-2xl font-bold">{title}</h2>
              </div>
              <nav className="flex gap-1 overflow-x-auto lg:hidden">
                {items.map((item) => (
                  <Link key={item.href} href={item.href} className="btn btn-secondary whitespace-nowrap text-sm">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <div className="page-enter p-4 lg:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
