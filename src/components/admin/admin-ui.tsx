"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="quiet-label">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx("panel flex flex-wrap items-end gap-3 p-4", className)} aria-label="篩選與工具">
      {children}
    </section>
  );
}

export function StatStrip({
  items,
  className,
}: {
  items: Array<{ label: string; value: ReactNode; tone?: "default" | "warning" | "danger" }>;
  className?: string;
}) {
  return (
    <div className={clsx("grid gap-px overflow-hidden rounded-[9px] border border-border bg-border sm:grid-flow-col sm:auto-cols-fr", className)}>
      {items.map((item) => (
        <div key={item.label} className="bg-surface px-4 py-3">
          <p className="text-xs font-semibold text-stone-600">{item.label}</p>
          <p
            className={clsx(
              "mt-1 text-2xl font-bold tabular-nums",
              item.tone === "warning" && "text-amber-800",
              item.tone === "danger" && "text-orange-800",
              (!item.tone || item.tone === "default") && "text-primary",
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5">
      <div>
        <h2 className="font-bold">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-stone-600">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-stone-950/35" />
        <Dialog.Content
          className={clsx(
            "dialog-panel fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-background shadow-2xl",
            wide ? "max-w-2xl" : "max-w-lg",
          )}
        >
          <div className="border-b border-border bg-surface px-5 py-4 pr-16">
            <Dialog.Title className="text-xl font-bold">{title}</Dialog.Title>
            {description && <Dialog.Description className="mt-1 text-sm leading-6 text-stone-600">{description}</Dialog.Description>}
          </div>
          <Dialog.Close asChild>
            <button className="btn btn-secondary absolute right-4 top-4 h-10 w-10 p-0" aria-label="關閉面板">
              <X size={18} />
            </button>
          </Dialog.Close>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "確認",
  cancelLabel = "返回",
  danger = false,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-[60] bg-stone-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-border bg-surface p-5 shadow-2xl">
          <div className="flex gap-3">
            <span className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-full", danger ? "bg-orange-100 text-orange-800" : "bg-muted text-primary")}>
              <AlertTriangle size={19} />
            </span>
            <div>
              <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-stone-600">{description}</Dialog.Description>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild><Button type="button" disabled={loading}>{cancelLabel}</Button></Dialog.Close>
            <Button type="button" variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ActionNotice({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "success" | "error";
}) {
  if (!message) return null;
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertTriangle : CheckCircle2;
  return (
    <div
      className={clsx(
        "panel flex items-start gap-2 p-3 text-sm",
        tone === "success" && "border-emerald-700/25 bg-emerald-50 text-emerald-900",
        tone === "error" && "border-orange-700/25 bg-orange-50 text-orange-900",
      )}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon size={17} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function ResponsiveDataList({
  desktop,
  mobile,
}: {
  desktop: ReactNode;
  mobile: ReactNode;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">{desktop}</div>
      <div className="grid gap-3 p-4 lg:hidden">{mobile}</div>
    </>
  );
}
