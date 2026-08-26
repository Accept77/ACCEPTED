import { demoRestaurants } from "@/entities/restaurant/model/demo-data";
import {
  normalizeLatitude,
  normalizeLongitude,
} from "@/entities/restaurant/model/coordinates";
import { isSupabaseConfigured } from "@/shared/lib/config";
import { getR2PublicUrl } from "@/shared/lib/r2/server";
import { createClient } from "@/shared/lib/supabase/server";
import type { Database, Restaurant, RestaurantSummary } from "@/entities/restaurant/model/types";

type RestaurantRow = Database["public"]["Tables"]["restaurants"]["Row"];
type PublicRestaurantRow = Pick<
  RestaurantRow,
  | "id"
  | "name"
  | "category"
  | "area"
  | "address"
  | "memo"
  | "tags"
  | "has_visited"
  | "image_path"
  | "image_paths"
  | "latitude"
  | "longitude"
>;
type RestaurantKeyRow = Pick<RestaurantRow, "name" | "naver_url">;

const PUBLIC_INDEX_BATCH_SIZE = 500;
const ADMIN_LIST_PAGE_SIZE = 50;
const PUBLIC_INDEX_COLUMNS =
  "id, name, category, area, address, memo, tags, has_visited, image_path, image_paths, latitude, longitude";

function toRestaurant(row: RestaurantRow, imagePaths: string[], imageUrls: string[]): Restaurant {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    area: row.area,
    address: row.address,
    memo: row.memo,
    tags: row.tags ?? [],
    hasVisited: row.has_visited,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    imagePath: imagePaths[0] ?? null,
    imagePaths,
    imageSourceUrl: row.image_source_url,
    imageCredit: row.image_credit,
    imageCandidates: row.image_candidates ?? [],
    naverUrl: row.naver_url,
    latitude: normalizeLatitude(row.latitude),
    longitude: normalizeLongitude(row.longitude),
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function rowsToRestaurants(rows: RestaurantRow[]) {
  return rows.map((row) => {
    const imagePaths = Array.isArray(row.image_paths) && row.image_paths.length > 0
      ? row.image_paths
      : row.image_path
        ? [row.image_path]
        : [];
    const imageUrls = imagePaths.flatMap((imagePath) => {
      const imageUrl = getR2PublicUrl(imagePath);
      return imageUrl ? [imageUrl] : [];
    });

    return toRestaurant(row, imagePaths, imageUrls);
  });
}

function toRestaurantSummary(row: PublicRestaurantRow): RestaurantSummary {
  const imagePath = row.image_paths?.[0] ?? row.image_path;

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    area: row.area,
    address: row.address,
    memo: row.memo,
    tags: row.tags ?? [],
    hasVisited: row.has_visited,
    imageUrl: imagePath ? getR2PublicUrl(imagePath) : null,
    latitude: normalizeLatitude(row.latitude),
    longitude: normalizeLongitude(row.longitude),
  };
}

function restaurantToSummary(restaurant: Restaurant): RestaurantSummary {
  return {
    id: restaurant.id,
    name: restaurant.name,
    category: restaurant.category,
    area: restaurant.area,
    address: restaurant.address,
    memo: restaurant.memo,
    tags: restaurant.tags,
    hasVisited: restaurant.hasVisited,
    imageUrl: restaurant.imageUrl,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  };
}

export type PublicRestaurantIndex = {
  restaurants: RestaurantSummary[];
  totalCount: number;
};

export async function getPublicRestaurantIndex(): Promise<PublicRestaurantIndex> {
  if (!isSupabaseConfigured()) {
    const restaurants = demoRestaurants.map(restaurantToSummary);
    return { restaurants, totalCount: restaurants.length };
  }

  const supabase = await createClient();
  const indexQuery = supabase
    .from("restaurants")
    .select(PUBLIC_INDEX_COLUMNS)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range(0, PUBLIC_INDEX_BATCH_SIZE - 1);
  const countQuery = supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true })
    .eq("is_visible", true);

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    indexQuery,
    countQuery,
  ]);

  if (error) {
    throw new Error(`맛집을 불러오지 못했습니다: ${error.message}`);
  }
  if (countError) {
    throw new Error(`맛집 수를 확인하지 못했습니다: ${countError.message}`);
  }

  const totalCount = count ?? 0;
  const pageCount = Math.ceil(totalCount / PUBLIC_INDEX_BATCH_SIZE);
  const remainingPageQueries = Array.from({ length: Math.max(0, pageCount - 1) }, (_, pageIndex) =>
    supabase
      .from("restaurants")
      .select(PUBLIC_INDEX_COLUMNS)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .range((pageIndex + 1) * PUBLIC_INDEX_BATCH_SIZE, (pageIndex + 2) * PUBLIC_INDEX_BATCH_SIZE - 1),
  );
  const remainingResults = await Promise.all(remainingPageQueries);

  for (const result of remainingResults) {
    if (result.error) {
      throw new Error(`맛집을 불러오지 못했습니다: ${result.error.message}`);
    }
  }

  const rows = [
    ...(data ?? []),
    ...remainingResults.flatMap((result) => result.data ?? []),
  ] as PublicRestaurantRow[];

  return {
    restaurants: rows.map(toRestaurantSummary),
    totalCount,
  };
}

export type AdminVisitFilter = "all" | "visited" | "unvisited";
export type AdminVisibilityFilter = "all" | "visible" | "hidden";

export type AdminRestaurantFilters = {
  query?: string;
  visit?: AdminVisitFilter;
  visibility?: AdminVisibilityFilter;
  category?: string;
};

export type AdminRestaurantPage = {
  restaurants: Restaurant[];
  totalCount: number;
  visibleCount: number;
  visitedCount: number;
  unvisitedCount: number;
  missingImageCount: number;
  filteredCount: number;
  categories: string[];
  filters: Required<AdminRestaurantFilters>;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getAdminRestaurantPage(
  requestedPage = 1,
  pageSize = ADMIN_LIST_PAGE_SIZE,
  filters: AdminRestaurantFilters = {},
): Promise<AdminRestaurantPage> {
  const supabase = await createClient();
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const normalizedFilters: Required<AdminRestaurantFilters> = {
    query: (filters.query ?? "").trim().slice(0, 80),
    visit: filters.visit === "visited" || filters.visit === "unvisited" ? filters.visit : "all",
    visibility: filters.visibility === "visible" || filters.visibility === "hidden" ? filters.visibility : "all",
    category: (filters.category ?? "").trim().slice(0, 120),
  };
  const safeSearchTerm = normalizedFilters.query.replace(/[,%()]/g, " ").trim();
  const searchFilter = safeSearchTerm
    ? `name.ilike.%${safeSearchTerm}%,category.ilike.%${safeSearchTerm}%,area.ilike.%${safeSearchTerm}%,address.ilike.%${safeSearchTerm}%`
    : "";

  let filteredCountQuery = supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true });
  if (searchFilter) filteredCountQuery = filteredCountQuery.or(searchFilter);
  if (normalizedFilters.visit === "visited") filteredCountQuery = filteredCountQuery.eq("has_visited", true);
  if (normalizedFilters.visit === "unvisited") filteredCountQuery = filteredCountQuery.eq("has_visited", false);
  if (normalizedFilters.visibility === "visible") filteredCountQuery = filteredCountQuery.eq("is_visible", true);
  if (normalizedFilters.visibility === "hidden") filteredCountQuery = filteredCountQuery.eq("is_visible", false);
  if (normalizedFilters.category) filteredCountQuery = filteredCountQuery.eq("category", normalizedFilters.category);

  const [totalResult, visibleResult, visitedResult, unvisitedResult, missingImageResult, filteredCountResult, categoriesResult] = await Promise.all([
    supabase.from("restaurants").select("id", { count: "exact", head: true }),
    supabase
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("is_visible", true),
    supabase
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("has_visited", true),
    supabase
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("has_visited", false),
    supabase
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .is("image_path", null)
      .filter("image_paths", "eq", "{}"),
    filteredCountQuery,
    supabase.from("restaurants").select("category").order("category", { ascending: true }),
  ]);

  if (totalResult.error) {
    throw new Error(`관리자 맛집 수를 확인하지 못했습니다: ${totalResult.error.message}`);
  }
  if (visibleResult.error) {
    throw new Error(`공개 맛집 수를 확인하지 못했습니다: ${visibleResult.error.message}`);
  }
  if (visitedResult.error) {
    throw new Error(`방문한 맛집 수를 확인하지 못했습니다: ${visitedResult.error.message}`);
  }
  if (unvisitedResult.error) {
    throw new Error(`진수가 아직 안 가본 맛집 수를 확인하지 못했습니다: ${unvisitedResult.error.message}`);
  }
  if (missingImageResult.error) {
    throw new Error(`사진이 없는 맛집 수를 확인하지 못했습니다: ${missingImageResult.error.message}`);
  }
  if (filteredCountResult.error) {
    throw new Error(`관리자 맛집 필터를 적용하지 못했습니다: ${filteredCountResult.error.message}`);
  }
  if (categoriesResult.error) {
    throw new Error(`맛집 카테고리를 불러오지 못했습니다: ${categoriesResult.error.message}`);
  }

  const totalCount = totalResult.count ?? 0;
  const filteredCount = filteredCountResult.count ?? 0;
  const totalPages = Math.ceil(filteredCount / safePageSize);
  const page = Math.min(
    Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1),
    Math.max(1, totalPages),
  );
  let restaurantsQuery = supabase
    .from("restaurants")
    .select("*");
  if (searchFilter) restaurantsQuery = restaurantsQuery.or(searchFilter);
  if (normalizedFilters.visit === "visited") restaurantsQuery = restaurantsQuery.eq("has_visited", true);
  if (normalizedFilters.visit === "unvisited") restaurantsQuery = restaurantsQuery.eq("has_visited", false);
  if (normalizedFilters.visibility === "visible") restaurantsQuery = restaurantsQuery.eq("is_visible", true);
  if (normalizedFilters.visibility === "hidden") restaurantsQuery = restaurantsQuery.eq("is_visible", false);
  if (normalizedFilters.category) restaurantsQuery = restaurantsQuery.eq("category", normalizedFilters.category);
  const { data, error } = await restaurantsQuery
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range((page - 1) * safePageSize, page * safePageSize - 1);

  if (error) {
    throw new Error(`관리자 맛집을 불러오지 못했습니다: ${error.message}`);
  }

  return {
    restaurants: await rowsToRestaurants(data ?? []),
    totalCount,
    visibleCount: visibleResult.count ?? 0,
    visitedCount: visitedResult.count ?? 0,
    unvisitedCount: unvisitedResult.count ?? 0,
    missingImageCount: missingImageResult.count ?? 0,
    filteredCount,
    categories: Array.from(new Set((categoriesResult.data ?? []).map((row) => row.category).filter(Boolean))),
    filters: normalizedFilters,
    page,
    pageSize: safePageSize,
    totalPages,
  };
}

export async function getAdminRestaurantKeys(): Promise<
  Array<Pick<Restaurant, "name" | "naverUrl">>
> {
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true });

  if (countError) {
    throw new Error(`기존 맛집 수를 확인하지 못했습니다: ${countError.message}`);
  }

  const pageCount = Math.ceil((count ?? 0) / PUBLIC_INDEX_BATCH_SIZE);
  const results = await Promise.all(
    Array.from({ length: pageCount }, (_, pageIndex) =>
      supabase
        .from("restaurants")
        .select("name, naver_url")
        .order("created_at", { ascending: false })
        .range(pageIndex * PUBLIC_INDEX_BATCH_SIZE, (pageIndex + 1) * PUBLIC_INDEX_BATCH_SIZE - 1),
    ),
  );

  const rows: RestaurantKeyRow[] = [];
  for (const result of results) {
    if (result.error) {
      throw new Error(`기존 맛집을 확인하지 못했습니다: ${result.error.message}`);
    }
    rows.push(...((result.data ?? []) as RestaurantKeyRow[]));
  }

  return rows.map((row) => ({ name: row.name, naverUrl: row.naver_url }));
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

export async function getPublicRestaurantById(id: string): Promise<Restaurant | null> {
  if (!isSupabaseConfigured()) {
    return demoRestaurants.find((restaurant) => restaurant.id === id) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .eq("is_visible", true)
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
