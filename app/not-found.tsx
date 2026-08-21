import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-6">
      <div className="text-center">
        <p className="text-xs font-black tracking-[0.25em] text-[#2f6fed]">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.06em] text-slate-900">장소를 찾을 수 없어요</h1>
        <Link className="mt-7 inline-flex rounded-full bg-[#142033] px-5 py-3 text-sm font-bold text-white" href="/">
          맛집 지도로 돌아가기
        </Link>
      </div>
    </main>
  );
}
