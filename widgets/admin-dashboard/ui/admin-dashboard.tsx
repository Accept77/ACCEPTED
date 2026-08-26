"use client";

import Image from "next/image";
import Form from "next/form";
import Link from "next/link";
import { MapPinned, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteRestaurant, setRestaurantVisibility } from "@/features/restaurant-management/api/restaurants";
import { signOutAdmin } from "@/features/auth/api/actions";
import type { AdminRestaurantFilters } from "@/entities/restaurant/api/restaurants";
import { getVisitTag } from "@/entities/restaurant/model/restaurant-filters";
import type { Restaurant } from "@/entities/restaurant/model/types";

function AdminPlaceRow({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleVisibility() {
    setError("");
    startTransition(async () => {
      try {
        await setRestaurantVisibility(restaurant.id, !restaurant.isVisible);
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "상태 변경에 실패했습니다.");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`“${restaurant.name}”을 삭제할까요?`)) return;

    setError("");
    startTransition(async () => {
      try {
        await deleteRestaurant(restaurant.id);
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "삭제에 실패했습니다.");
      }
    });
  }

  return (
    <article className={`grid grid-cols-[56px_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-slate-100 p-3 last:border-b-0 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center ${isPending ? "opacity-60" : ""}`}>
      <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-[#edf3ff]">
        {restaurant.imageUrl ? (
          <Image alt="" className="object-cover" fill sizes="56px" src={restaurant.imageUrl} />
        ) : (
          <div className="flex h-full items-center justify-center text-xl" aria-hidden="true">
            <UtensilsCrossed className="h-6 w-6 text-slate-500" strokeWidth={1.8} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1 self-center">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-bold text-slate-900">{restaurant.name}</h2>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold ${restaurant.isVisible ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
            {restaurant.isVisible ? "공개" : "숨김"}
          </span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold ${restaurant.hasVisited ? "bg-blue-50 text-[#2f6fed]" : "bg-slate-100 text-slate-500"}`}>
            {getVisitTag(restaurant.hasVisited)}
          </span>
          {!restaurant.imageUrl ? <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[0.6rem] font-bold text-amber-600">사진 보완</span> : null}
        </div>
        <p className="truncate text-xs text-slate-400">
          {restaurant.category} · {restaurant.area || "지역 미지정"} · {restaurant.address}
        </p>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>

      <div className="col-start-2 flex flex-wrap justify-start gap-1.5 sm:col-start-auto sm:justify-end">
        <button
          className="h-11 rounded-lg border border-slate-200 px-2.5 text-[0.68rem] font-bold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed lg:h-8"
          disabled={isPending}
          onClick={handleVisibility}
          type="button"
        >
          {restaurant.isVisible ? "숨기기" : "공개"}
        </button>
        <Link className="flex h-11 items-center rounded-lg border border-slate-200 px-2.5 text-[0.68rem] font-bold text-slate-600 transition hover:border-slate-300 lg:h-8" href={`/admin/${restaurant.id}`}>
          수정
        </Link>
        <button
          className="h-11 rounded-lg border border-rose-100 px-2.5 text-[0.68rem] font-bold text-rose-500 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed lg:h-8"
          disabled={isPending}
          onClick={handleDelete}
          type="button"
        >
          삭제
        </button>
      </div>
    </article>
  );
}

function adminQueryString(filters: Required<AdminRestaurantFilters>, page?: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.visit !== "all") params.set("visit", filters.visit);
  if (filters.visibility !== "all") params.set("visibility", filters.visibility);
  if (filters.category) params.set("category", filters.category);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

function AdminPagination({ currentPage, totalPages, filters }: { currentPage: number; totalPages: number; filters: Required<AdminRestaurantFilters> }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="관리자 맛집 페이지" className="flex items-center justify-center gap-3 border-t border-slate-100 px-3 py-3">
      {currentPage > 1 ? (
        <Link
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300"
          href={adminQueryString(filters, currentPage - 1)}
        >
          이전
        </Link>
      ) : (
        <span className="rounded-lg border border-slate-100 px-3 py-2 text-xs font-bold text-slate-300">이전</span>
      )}
      <span className="text-xs font-bold text-slate-500">
        {currentPage} / {totalPages} 페이지
      </span>
      {currentPage < totalPages ? (
        <Link
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300"
          href={adminQueryString(filters, currentPage + 1)}
        >
          다음
        </Link>
      ) : (
        <span className="rounded-lg border border-slate-100 px-3 py-2 text-xs font-bold text-slate-300">다음</span>
      )}
    </nav>
  );
}

type AdminDashboardProps = {
  restaurants: Restaurant[];
  email: string;
  totalCount: number;
  visibleCount: number;
  visitedCount: number;
  unvisitedCount: number;
  missingImageCount: number;
  filteredCount: number;
  categories: string[];
  filters: Required<AdminRestaurantFilters>;
  page: number;
  totalPages: number;
};

export function AdminDashboard({
  restaurants,
  email,
  totalCount,
  visibleCount,
  visitedCount,
  unvisitedCount,
  missingImageCount,
  filteredCount,
  categories,
  filters,
  page,
  totalPages,
}: AdminDashboardProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOutAdmin();
    } finally {
      setIsSigningOut(false);
      router.refresh();
    }
  }

  return (
    <main className="h-[100dvh] w-[100dvw] overflow-hidden bg-[#eef2f5]">
      <div className="flex h-full flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-[-0.03em] text-slate-900">맛집 관리</p>
            <p className="max-w-[42vw] truncate text-[0.68rem] text-slate-400">{email}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg border border-slate-200 px-2.5 text-[0.68rem] font-bold text-slate-600 transition hover:border-slate-300 lg:h-9" href="/" target="_blank">
              공개 페이지
            </Link>
            <button
              className="h-11 shrink-0 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 text-[0.68rem] font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-800 disabled:opacity-50 lg:h-9"
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
            >
              로그아웃
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 p-2.5 sm:p-4">
          <section className="flex h-full min-h-0 flex-col overflow-hidden border border-slate-200/80 bg-white">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 sm:px-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="truncate text-base font-bold tracking-[-0.04em] text-slate-900">
                  등록된 맛집 <span className="text-[#2f6fed]">{totalCount.toLocaleString("ko-KR")}</span>곳
                </h1>
                <p className="text-[0.68rem] text-slate-400">
                  공개 {visibleCount} · 숨김 {totalCount - visibleCount} · {getVisitTag(true)} {visitedCount} · {getVisitTag(false)} {unvisitedCount} · 사진 보완 {missingImageCount}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg border border-[#dce8ff] bg-[#f7faff] px-2.5 text-[0.68rem] font-bold text-[#2f6fed] transition hover:border-[#b8cffb] lg:h-9" href="/admin/import">
                  네이버 리스트 가져오기
                </Link>
                <Link className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg bg-[#2f6fed] px-3 text-[0.68rem] font-bold text-white transition hover:bg-[#255ac8] lg:h-9" href="/admin/new">
                  + 맛집 등록
                </Link>
              </div>
            </div>

            <Form action="/admin" className="grid shrink-0 gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] sm:px-4" replace scroll={false}>
              <label className="flex h-11 min-w-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-400 sm:h-9">
                <span className="sr-only">맛집 검색</span>
                <input
                  className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  defaultValue={filters.query}
                  name="q"
                  placeholder="가게명, 주소, 지역 검색"
                />
              </label>
              <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none sm:h-9" defaultValue={filters.visit} name="visit">
                <option value="all">전체</option>
                <option value="visited">{getVisitTag(true)}</option>
                <option value="unvisited">{getVisitTag(false)}</option>
              </select>
              <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none sm:h-9" defaultValue={filters.visibility} name="visibility">
                <option value="all">공개 전체</option>
                <option value="visible">공개</option>
                <option value="hidden">숨김</option>
              </select>
              <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none sm:h-9" defaultValue={filters.category} name="category">
                <option value="">카테고리 전체</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <button className="h-11 rounded-xl bg-[#142033] px-4 text-xs font-bold text-white transition hover:bg-slate-700 sm:h-9" type="submit">
                검색
              </button>
            </Form>

            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2 text-xs sm:px-4">
              <p className="font-semibold text-slate-500">현재 조건 <span className="font-black text-[#2f6fed]">{filteredCount.toLocaleString("ko-KR")}</span>곳</p>
              {filters.query || filters.visit !== "all" || filters.visibility !== "all" || filters.category ? (
                <Link className="font-bold text-slate-400 transition hover:text-slate-700" href="/admin">필터 초기화</Link>
              ) : null}
            </div>

            <div className="safe-area-bottom min-h-0 flex-1 overflow-y-auto">
              {restaurants.length > 0 ? (
                restaurants.map((restaurant) => <AdminPlaceRow key={restaurant.id} restaurant={restaurant} />)
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
                  <MapPinned aria-hidden="true" className="h-9 w-9 text-[#2f6fed]" strokeWidth={1.7} />
                  {totalCount > 0 ? (
                    <>
                      <h2 className="text-sm font-bold text-slate-800">조건에 맞는 맛집이 없어요</h2>
                      <p className="text-xs text-slate-500">검색어나 필터를 조금 바꿔 다시 찾아보세요.</p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-sm font-bold text-slate-800">아직 등록한 맛집이 없어요</h2>
                      <p className="text-xs text-slate-500">첫 번째 장소를 등록해 공개 페이지를 채워 보세요.</p>
                      <Link className="flex h-9 items-center rounded-lg bg-[#edf3ff] px-3 text-xs font-bold text-[#2f6fed]" href="/admin/new">
                        첫 맛집 등록하기
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
            <AdminPagination currentPage={page} filters={filters} totalPages={totalPages} />
          </section>
        </div>
      </div>
    </main>
  );
}
