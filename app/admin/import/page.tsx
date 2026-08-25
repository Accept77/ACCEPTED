import type { Metadata } from "next";

import { NaverSavedListImporter } from "@/features/naver-import/ui/naver-saved-list-importer";
import { getAdminRestaurantKeys } from "@/entities/restaurant/api/restaurants";
import { requireAdmin } from "@/shared/lib/supabase/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "네이버 저장 리스트 가져오기",
  robots: { index: false, follow: false },
};

export default async function AdminImportPage() {
  await requireAdmin();
  const restaurants = await getAdminRestaurantKeys();

  return (
    <NaverSavedListImporter
      existingRestaurants={restaurants.map((restaurant) => ({
        name: restaurant.name,
        naverUrl: restaurant.naverUrl,
      }))}
    />
  );
}
