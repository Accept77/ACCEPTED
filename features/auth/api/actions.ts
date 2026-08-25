"use server";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/shared/lib/config";
import { createClient } from "@/shared/lib/supabase/server";

export async function signOutAdmin() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
