import { BusFront } from "lucide-react";

export function MobilePageHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[7px] bg-emerald-800 text-white">
          <BusFront size={21} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-stone-950">員工車登記</h1>
          <p className="mt-0.5 text-sm text-stone-600">明日班次 · 選擇車班後完成登記</p>
        </div>
      </div>
    </header>
  );
}
