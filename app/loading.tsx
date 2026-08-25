import Image from "next/image";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-6">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 animate-pulse overflow-hidden rounded-2xl shadow-[0_12px_30px_-12px_rgba(20,32,51,0.45)]">
          <Image
            alt="배고프면 진수에게"
            className="h-full w-full object-cover"
            height={64}
            priority
            src="/favicon.png"
            width={64}
          />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-500">배고프면 진수에게를 불러오는 중이에요</p>
      </div>
    </main>
  );
}
