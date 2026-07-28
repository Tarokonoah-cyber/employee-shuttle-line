"use client";

import { ArrowRight, BusFront, CircleHelp, ClipboardList, ShieldCheck, Wrench } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLanguage } from "@/components/i18n/language-provider";

export function LineHelpClient({ bookingUrl, myBookingsUrl }: { bookingUrl: string; myBookingsUrl: string }) {
  const { t } = useLanguage();
  const guides = [
    { icon: Wrench, title: t("help.repairTitle"), text: t("help.repairBody") },
    { icon: BusFront, title: t("help.bookingTitle"), text: t("help.bookingBody") },
    { icon: ClipboardList, title: t("help.recordsTitle"), text: t("help.recordsBody") },
    { icon: ShieldCheck, title: t("help.securityTitle"), text: t("help.securityBody") },
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="border-b border-border pb-6">
          <div className="flex justify-end"><LanguageSwitcher /></div>
          <p className="quiet-label mt-4">{t("serviceDesk.name")}</p>
          <div className="mt-2 flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground"><CircleHelp size={22} aria-hidden="true" /></span>
            <div><h1 className="text-2xl font-bold tracking-tight">{t("help.title")}</h1><p className="mt-1 text-sm leading-6 text-stone-600">{t("help.subtitle")}</p></div>
          </div>
        </header>

        <div className="mt-6 divide-y divide-border border-y border-border">
          {guides.map(({ icon: Icon, title, text }) => (
            <section className="grid gap-3 py-5 sm:grid-cols-[2.5rem_1fr]" key={title}>
              <Icon className="text-primary" size={22} aria-hidden="true" />
              <div><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm leading-6 text-stone-600">{text}</p></div>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a className="btn btn-primary min-h-11" href={bookingUrl}>{t("booking.title")} <ArrowRight size={16} aria-hidden="true" /></a>
          <a className="btn btn-secondary min-h-11" href={myBookingsUrl}>{t("help.myBookings")}</a>
        </div>
      </div>
    </main>
  );
}
