"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import {
  CalendarDays,
  ClipboardList,
  FileClock,
  Gauge,
  Layers,
  LogOut,
  Menu,
  Route,
  X,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { fetchWithTimeout } from "@/lib/client-http";

const navigation = [
  {
    label: "概覽",
    items: [{ href: "/admin/dashboard", label: "營運概覽", icon: Gauge }],
  },
  {
    label: "日常營運",
    items: [
      { href: "/admin/bookings", label: "預約名單", icon: ClipboardList },
      { href: "/admin/schedules", label: "車班管理", icon: CalendarDays },
    ],
  },
  {
    label: "設定",
    items: [{ href: "/admin/templates", label: "車班模板", icon: Layers }],
  },
  {
    label: "系統",
    items: [
      { href: "/admin/line-users", label: "LINE 通知管理", icon: UsersRound },
      { href: "/admin/audit-logs", label: "操作紀錄", icon: FileClock },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetchWithTimeout("/api/admin/logout", { method: "POST" });
    router.replace("/admin");
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-[#f8f5ee] lg:flex lg:flex-col">
          <SidebarContent pathname={pathname} onLogout={logout} />
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-primary text-primary-foreground">
                  <Route size={18} />
                </span>
                <span className="truncate font-bold">員工車調度後台</span>
              </Link>
              <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
                <Dialog.Trigger asChild>
                  <button className="btn btn-secondary h-10 w-10 p-0" aria-label="開啟管理選單">
                    <Menu size={19} />
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-stone-950/35" />
                  <Dialog.Content className="dialog-panel fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-border bg-[#f8f5ee] shadow-2xl">
                    <Dialog.Title className="sr-only">管理選單</Dialog.Title>
                    <Dialog.Close asChild>
                      <button className="btn btn-secondary absolute right-4 top-4 h-10 w-10 p-0" aria-label="關閉管理選單">
                        <X size={18} />
                      </button>
                    </Dialog.Close>
                    <SidebarContent pathname={pathname} onLogout={logout} closeOnNavigate />
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </header>
          <div className="page-enter mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

function SidebarContent({
  pathname,
  onLogout,
  closeOnNavigate = false,
}: {
  pathname: string;
  onLogout: () => void;
  closeOnNavigate?: boolean;
}) {
  const content = (
    <>
      <div className="border-b border-border p-5">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-primary text-primary-foreground">
            <Route size={20} />
          </span>
          <span>
            <span className="quiet-label block">GRO Console</span>
            <span className="mt-0.5 block font-bold">員工車調度後台</span>
          </span>
        </Link>
        <p className="mt-4 text-xs leading-5 text-stone-600">名單、班次與候補狀況集中管理。</p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-4" aria-label="後台主要導覽">
        {navigation.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-stone-500">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                const link = (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex items-center gap-3 rounded-[7px] px-3 py-2.5 text-sm font-semibold transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-stone-700 hover:bg-muted hover:text-primary",
                    )}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
                return closeOnNavigate ? (
                  <Dialog.Close asChild key={item.href}>{link}</Dialog.Close>
                ) : link;
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <button className="btn btn-secondary w-full" onClick={onLogout}>
          <LogOut size={16} />
          登出後台
        </button>
      </div>
    </>
  );

  return content;
}
