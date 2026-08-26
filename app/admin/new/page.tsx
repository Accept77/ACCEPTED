import type { Metadata } from "next";

import { RestaurantForm } from "@/features/restaurant-management/ui/restaurant-form";
import { isSupabaseConfigured } from "@/shared/lib/config";
import { isR2Configured } from "@/shared/lib/r2/server";
import { requireAdmin } from "@/shared/lib/supabase/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "맛집 등록",
  robots: { index: false, follow: false },
};

export default async function NewRestaurantPage() {
  await requireAdmin();

  return (
    <main className="h-[100dvh] w-[100dvw] overflow-hidden bg-[#eef2f5]">
      <div className="safe-area-bottom flex h-full justify-center overflow-y-auto">
        <div className="flex w-full max-w-screen-2xl flex-col gap-8 px-4 pb-10 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pt-8">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-black tracking-[0.22em] text-[#2f6fed]">NEW PLACE</p>
          <h1 className="text-4xl font-bold tracking-[-0.08em] text-[#142033]">맛집을 등록하세요.</h1>
          <p className="text-sm leading-6 text-slate-500">네이버 검색으로 기본 정보를 채운 뒤, 나만의 추천을 덧붙여 주세요.</p>
        </div>
        <RestaurantForm isConfigured={isSupabaseConfigured()} isStorageConfigured={isR2Configured()} mode="create" />
        </div>
      </div>
    </main>
  );
}
