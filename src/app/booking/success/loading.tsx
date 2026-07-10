export default function Loading() {
  return (
    <main className="min-h-screen bg-white px-5 py-8 sm:bg-[#f5f6f3]">
      <div className="mx-auto max-w-md space-y-4 rounded-[8px] bg-white sm:border sm:border-stone-200 sm:p-5">
        <div className="skeleton mx-auto h-12 w-12 rounded-full" />
        <div className="skeleton mx-auto h-7 w-32 rounded-[4px]" />
        <div className="skeleton mx-auto h-4 w-52 rounded-[4px]" />
        <div className="skeleton mt-6 h-20 rounded-[6px]" />
        <div className="skeleton h-44 rounded-[6px]" />
        <div className="skeleton h-12 rounded-[6px]" />
      </div>
    </main>
  );
}
