"use server";

import { storeNaverImage } from "@/lib/naver-image-storage";
import { requireAdmin } from "@/lib/supabase/auth";

export async function importImageFromNaver(thumbnailUrl: string) {
  await requireAdmin();
  return storeNaverImage(thumbnailUrl);
}
