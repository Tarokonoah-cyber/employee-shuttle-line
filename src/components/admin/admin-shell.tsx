"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ClipboardList, FileClock, Gauge, Layers, LogOut } from "lucide-react";
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
        <aside className="hidden w-64 border-r border-border bg-surface p-4 lg:block">
          <div className="mb-6">
            <p className="text-sm text-stone-600">GRO 後台</p>
            <h1 className="mt-1 text-lg font-bold">員工車管理</h1>
          </div>
          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm font-semibold hover:bg-muted",
                    pathname === item.href && "bg-muted text-primary",
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
          <header className="border-b border-border bg-surface px-4 py-3 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{title}</h2>
              <nav className="flex gap-1 overflow-x-auto lg:hidden">
                {items.map((item) => (
                  <Link key={item.href} href={item.href} className="btn btn-secondary whitespace-nowrap text-sm">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <div className="p-4 lg:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
