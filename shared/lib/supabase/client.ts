import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/shared/lib/config";
import type { Database } from "@/entities/restaurant/model/types";

export function createClient(): SupabaseClient<Database> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return createBrowserClient<Database>(config.url, config.key);
}
