export function LoadingScheduleSkeleton() {
  return (
    <div className="space-y-3" aria-label="正在讀取車班" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-[8px] border border-stone-200 bg-white p-4">
          <div className="flex justify-between gap-4">
            <div className="skeleton h-7 w-44 rounded-[4px]" />
            <div className="skeleton h-6 w-16 rounded-[4px]" />
          </div>
          <div className="skeleton mt-3 h-4 w-32 rounded-[4px]" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="skeleton h-9 rounded-[4px]" />
            <div className="skeleton h-9 rounded-[4px]" />
            <div className="skeleton h-9 rounded-[4px]" />
          </div>
          <div className="skeleton mt-3 h-1 rounded-full" />
        </div>
      ))}
    </div>
  );
}
