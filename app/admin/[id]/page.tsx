import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RestaurantForm } from "@/features/restaurant-management/ui/restaurant-form";
import { isSupabaseConfigured } from "@/shared/lib/config";
import { getRestaurantById } from "@/entities/restaurant/api/restaurants";
import { isR2Configured } from "@/shared/lib/r2/server";
import { requireAdmin } from "@/shared/lib/supabase/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "맛집 수정",
  robots: { index: false, follow: false },
};

type EditRestaurantPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditRestaurantPage({ params }: EditRestaurantPageProps) {
  await requireAdmin();
  const { id } = await params;
  const restaurant = await getRestaurantById(id);

  if (!restaurant) notFound();

  return (
    <main className="h-[100dvh] w-[100dvw] overflow-hidden bg-[#eef2f5]">
      <div className="safe-area-bottom flex h-full justify-center overflow-y-auto">
        <div className="flex w-full max-w-5xl flex-col gap-5 px-4 pb-10 pt-5 sm:px-6 sm:pt-7">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-black tracking-[0.22em] text-[#2f6fed]">EDIT PLACE</p>
          <h1 className="text-3xl font-bold tracking-[-0.08em] text-[#142033]">맛집 정보를 수정하세요.</h1>
          <p className="text-sm leading-6 text-slate-500">공개 페이지에 보여줄 정보를 빠르게 정리하고 저장하세요.</p>
        </div>
        <RestaurantForm initialRestaurant={restaurant} isConfigured={isSupabaseConfigured()} isStorageConfigured={isR2Configured()} mode="edit" />
        </div>
      </div>
    </main>
  );
}
