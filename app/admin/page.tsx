import type { Metadata } from "next";

import { AdminDashboard } from "@/app/_components/admin-dashboard";
import { getAdminRestaurants } from "@/lib/data/restaurants";
import { requireAdmin } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "맛집 관리",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await requireAdmin();
  const restaurants = await getAdminRestaurants();

  return <AdminDashboard email={user.email ?? "관리자"} restaurants={restaurants} />;
}
