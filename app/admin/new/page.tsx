import type { Metadata } from "next";

import { RestaurantForm } from "@/app/_components/restaurant-form";
import { isSupabaseConfigured } from "@/lib/config";
import { isR2Configured } from "@/lib/r2/server";
import { requireAdmin } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "맛집 등록",
  robots: { index: false, follow: false },
};

export default async function NewRestaurantPage() {
  await requireAdmin();

  return (
    <main className="h-[100dvh] w-[100dvw] overflow-hidden bg-[#eef2f5]">
      <div className="safe-area-bottom h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-5 sm:px-6 sm:pt-7">
        <div className="mb-8">
          <p className="text-xs font-black tracking-[0.22em] text-[#2f6fed]">NEW PLACE</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.08em] text-[#142033]">맛집을 등록하세요.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">네이버 검색으로 기본 정보를 채운 뒤, 나만의 추천을 덧붙여 주세요.</p>
        </div>
        <RestaurantForm isConfigured={isSupabaseConfigured()} isStorageConfigured={isR2Configured()} mode="create" />
        </div>
      </div>
    </main>
  );
}
