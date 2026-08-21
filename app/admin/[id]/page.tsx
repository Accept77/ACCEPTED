import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RestaurantForm } from "@/app/_components/restaurant-form";
import { isSupabaseConfigured } from "@/lib/config";
import { getRestaurantById } from "@/lib/data/restaurants";
import { requireAdmin } from "@/lib/supabase/auth";

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
    <main className="min-h-screen bg-[#f6f7f9]">
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <div className="mb-8">
          <p className="text-xs font-black tracking-[0.22em] text-[#2f6fed]">EDIT PLACE</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.08em] text-[#142033]">맛집 정보를 수정하세요.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">공개 페이지에 보여줄 정보를 최신 상태로 유지해 주세요.</p>
        </div>
        <RestaurantForm initialRestaurant={restaurant} isConfigured={isSupabaseConfigured()} mode="edit" />
      </div>
    </main>
  );
}
