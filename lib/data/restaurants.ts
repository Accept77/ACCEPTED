import { demoRestaurants } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/config";
import { STORAGE_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Database, Restaurant } from "@/lib/types";

type RestaurantRow = Database["public"]["Tables"]["restaurants"]["Row"];

function toRestaurant(row: RestaurantRow, imagePaths: string[], imageUrls: string[]): Restaurant {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    area: row.area,
    address: row.address,
    memo: row.memo,
    tags: row.tags ?? [],
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    imagePath: imagePaths[0] ?? null,
    imagePaths,
    imageSourceUrl: row.image_source_url,
    imageCredit: row.image_credit,
    imageCandidates: row.image_candidates ?? [],
    naverUrl: row.naver_url,
    latitude: row.latitude,
    longitude: row.longitude,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function rowsToRestaurants(rows: RestaurantRow[]) {
  const supabase = await createClient();

  return rows.map((row) => {
    const imagePaths = Array.isArray(row.image_paths) && row.image_paths.length > 0
      ? row.image_paths
      : row.image_path
        ? [row.image_path]
        : [];
    const imageUrls = imagePaths.map((imagePath) =>
      supabase.storage.from(STORAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl,
    );

    return toRestaurant(row, imagePaths, imageUrls);
  });
}

export async function getPublicRestaurants(): Promise<Restaurant[]> {
  if (!isSupabaseConfigured()) {
    return demoRestaurants;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`맛집을 불러오지 못했습니다: ${error.message}`);
  }

  return rowsToRestaurants(data ?? []);
}

export async function getAdminRestaurants(): Promise<Restaurant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`관리자 맛집을 불러오지 못했습니다: ${error.message}`);
  }

  return rowsToRestaurants(data ?? []);
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`맛집을 불러오지 못했습니다: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const [restaurant] = await rowsToRestaurants([data]);
  return restaurant ?? null;
}
