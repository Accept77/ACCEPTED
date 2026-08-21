import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "@/lib/config";
import type { Database } from "@/lib/types";

export async function createClient(): Promise<SupabaseClient<Database>> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. Proxy refreshes them.
        }
      },
    },
  });
}
