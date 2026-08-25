import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-xs font-black tracking-[0.25em] text-[#2f6fed]">404</p>
        <h1 className="text-3xl font-bold tracking-[-0.06em] text-slate-900">장소를 찾을 수 없어요</h1>
        <Link className="inline-flex rounded-full bg-[#142033] px-5 py-3 text-sm font-bold text-white" href="/">
          배고프면 진수에게로 돌아가기
        </Link>
      </div>
    </main>
  );
}
