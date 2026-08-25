import type { Metadata } from "next";

import { AdminDashboard } from "@/widgets/admin-dashboard/ui/admin-dashboard";
import { getAdminRestaurantPage, type AdminRestaurantFilters, type AdminVisitFilter, type AdminVisibilityFilter } from "@/entities/restaurant/api/restaurants";
import { requireAdmin } from "@/shared/lib/supabase/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "맛집 관리",
  robots: { index: false, follow: false },
};

type AdminPageProps = {
  searchParams: Promise<{
    page?: string | string[] | undefined;
    q?: string | string[] | undefined;
    visit?: string | string[] | undefined;
    visibility?: string | string[] | undefined;
    category?: string | string[] | undefined;
  }>;
};

function parsePage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(rawValue ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseVisit(value: string | string[] | undefined): AdminVisitFilter {
  const normalized = firstValue(value);
  return normalized === "visited" || normalized === "unvisited" ? normalized : "all";
}

function parseVisibility(value: string | string[] | undefined): AdminVisibilityFilter {
  const normalized = firstValue(value);
  return normalized === "visible" || normalized === "hidden" ? normalized : "all";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const user = await requireAdmin();
  const params = await searchParams;
  const filters: AdminRestaurantFilters = {
    query: firstValue(params.q),
    visit: parseVisit(params.visit),
    visibility: parseVisibility(params.visibility),
    category: firstValue(params.category),
  };
  const pageData = await getAdminRestaurantPage(parsePage(params.page), undefined, filters);

  return <AdminDashboard email={user.email ?? "관리자"} {...pageData} />;
}
