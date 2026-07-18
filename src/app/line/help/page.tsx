import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BusFront, CircleHelp, ClipboardList, ShieldCheck, Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "使用說明｜太魯閣員工服務台",
  description: "工程／IT 報修與員工車登記使用說明。",
};

const guides = [
  {
    icon: Wrench,
    title: "工程／IT 報修",
    text: "從 LINE 選單點選報修，系統會在聊天室確認身分並提供既有報修頁。照片、進度與補充資料仍由原報修系統處理。",
  },
  {
    icon: BusFront,
    title: "員工車登記",
    text: "選擇日期與班次後填寫資料。送出成功請保留管理連結；候補順位、取消期限與自動遞補規則維持不變。",
  },
  {
    icon: ClipboardList,
    title: "我的服務紀錄",
    text: "「我的報修」由 LINE 帳號查詢；「我的員工車報名」則顯示保存在目前 LINE 瀏覽器的管理連結，也可手動匯入舊連結。",
  },
  {
    icon: ShieldCheck,
    title: "連結安全",
    text: "報修與員工車管理連結都包含個人專用 token，請勿轉傳。更換裝置或清除瀏覽器資料後，請使用原通知中的連結重新開啟。",
  },
];

export default function LineHelpPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="border-b border-border pb-6">
          <p className="quiet-label">太魯閣員工服務台</p>
          <div className="mt-2 flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground"><CircleHelp size={22} aria-hidden="true" /></span>
            <div><h1 className="text-2xl font-bold tracking-tight">使用說明</h1><p className="mt-1 text-sm leading-6 text-stone-600">一個 LINE 官方帳號，進入報修與員工車服務。</p></div>
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
          <Link className="btn btn-primary min-h-11" href="/">員工車登記 <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link className="btn btn-secondary min-h-11" href="/line/my-bookings">我的員工車報名</Link>
        </div>
      </div>
    </main>
  );
}
