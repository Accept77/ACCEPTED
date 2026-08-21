export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-6">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-[#142033]" />
        <p className="mt-4 text-sm font-semibold text-slate-500">ACCEPTED를 불러오는 중이에요</p>
      </div>
    </main>
  );
}
