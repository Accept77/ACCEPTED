"use client";

export default function GlobalErrorState({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-6">
      <div className="max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="text-4xl" aria-hidden="true">
          🥲
        </span>
        <h1 className="mt-5 text-xl font-bold text-slate-900">맛집을 불러오지 못했어요</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">잠시 후 다시 시도해 주세요.</p>
        <button
          className="mt-6 rounded-full bg-[#142033] px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
          onClick={reset}
          type="button"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
