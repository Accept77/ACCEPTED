import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function isAdminUser(userId: string) {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (!(await isAdminUser(user.id))) {
    redirect("/admin/login?error=not-admin");
  }

  return user;
}

export async function getAdminStatus() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, isAdmin: false };
  }

  return { user, isAdmin: await isAdminUser(user.id) };
}
