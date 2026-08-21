"use client";

import Image from "next/image";
import { MapPinned } from "lucide-react";
import { createElement, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { NaverMap } from "@/app/_components/naver-map";
import { categoryIcon } from "@/lib/category-display";
import type { Restaurant } from "@/lib/types";

type RestaurantExplorerProps = {
  restaurants: Restaurant[];
};

const placeholderStyles = [
  "linear-gradient(135deg, #dce7f7 0%, #f7e9d8 100%)",
  "linear-gradient(135deg, #e9e1f4 0%, #d8edf0 100%)",
  "linear-gradient(135deg, #f5e3c9 0%, #e2edf8 100%)",
];

function RestaurantCategoryIcon({ category, className }: { category: string; className: string }) {
  return createElement(categoryIcon(category), { "aria-hidden": "true", className, strokeWidth: 1.8 });
}

function shuffle<T>(items: T[], seed: string) {
  const shuffled = [...items];
  let state = 2166136261;

  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = Math.imul(state, 1664525) + 1013904223;
    const randomIndex = Math.floor(((state >>> 0) / 4294967296) * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 12h13m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PanelToggleIcon({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d={isCollapsed ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function RestaurantListItem({
  restaurant,
  index,
  isSelected,
  onOpen,
  onSelect,
}: {
  restaurant: Restaurant;
  index: number;
  isSelected: boolean;
  onOpen: (restaurant: Restaurant) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <article
      data-restaurant-id={restaurant.id}
      className={`overflow-hidden rounded-2xl border bg-white transition ${
        isSelected
          ? "border-[#7ea4f2] shadow-[0_10px_30px_-20px_rgba(47,111,237,0.9)] ring-2 ring-[#dce8ff]"
          : "border-slate-200/80 hover:border-slate-300 hover:shadow-[0_12px_30px_-24px_rgba(20,32,51,0.5)]"
      }`}
    >
      <button
        className="flex w-full gap-3 p-3 text-left"
        onClick={() => onSelect(restaurant.id)}
        type="button"
      >
        <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-[#edf3ff]">
          {restaurant.imageUrl ? (
            <Image
              alt={`${restaurant.name} 대표 이미지`}
              className="object-cover"
              fill
              sizes="84px"
              src={restaurant.imageUrl}
            />
          ) : (
            <div
              className="flex h-full items-center justify-center text-3xl"
              style={{ background: placeholderStyles[index % placeholderStyles.length] }}
            >
              <RestaurantCategoryIcon category={restaurant.category} className="h-8 w-8 text-slate-600" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-center gap-2 text-[0.68rem] font-bold text-[#2f6fed]">
            <span>{restaurant.category}</span>
            {restaurant.area ? <span className="text-slate-300">·</span> : null}
            <span className="truncate text-slate-400">{restaurant.area || "지역 미지정"}</span>
          </div>
          <h2 className="mt-1 truncate text-[0.98rem] font-bold tracking-[-0.03em] text-slate-900">
            {restaurant.name}
          </h2>
          {restaurant.memo ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{restaurant.memo}</p> : null}
        </div>
      </button>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          {restaurant.tags.slice(0, 2).map((tag) => (
            <span className="shrink-0 rounded-full bg-[#f1f5fb] px-2 py-1 text-[0.65rem] font-semibold text-slate-500" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
        <button
          className="shrink-0 text-xs font-bold text-[#2f6fed] transition hover:text-[#1f55bd]"
          onClick={() => onOpen(restaurant)}
          type="button"
        >
          상세 보기
        </button>
      </div>
    </article>
  );
}

function RestaurantDetail({
  restaurant,
  onClose,
}: {
  restaurant: Restaurant;
  onClose: () => void;
}) {
  const isOfficialGallery = restaurant.imageCredit === "네이버 장소 등록 이미지" && restaurant.imageCandidates.length > 0;
  const galleryImages = isOfficialGallery
    ? restaurant.imageCandidates.slice(0, 3)
    : restaurant.imageUrls.length > 0
      ? restaurant.imageUrls.slice(0, 3)
      : restaurant.imageUrl
        ? [restaurant.imageUrl]
        : [];
  const galleryLayout = galleryImages.length >= 3
    ? "grid aspect-[1.7/1] grid-cols-2 grid-rows-2 gap-1"
    : galleryImages.length === 2
      ? "grid aspect-[1.7/1] grid-cols-2 gap-1"
      : "relative aspect-[1.7/1]";

  return (
    <div
      aria-label="맛집 상세 정보"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:max-w-xl sm:rounded-[2rem]">
        <div className="relative overflow-hidden bg-slate-100">
          {galleryImages.length > 0 ? (
            <div className={galleryLayout}>
              {galleryImages.map((imageUrl, index) => (
                <div
                  className={galleryImages.length >= 3 && index === 0 ? "relative row-span-2" : "relative"}
                  key={imageUrl}
                >
                  <Image
                    alt={`${restaurant.name} 사진 ${index + 1}`}
                    className="object-cover"
                    fill
                    sizes="(max-width: 640px) 50vw, 288px"
                    src={imageUrl}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[1.7/1] items-center justify-center" style={{ background: placeholderStyles[0] }}>
              <RestaurantCategoryIcon category={restaurant.category} className="h-16 w-16 text-slate-600" />
            </div>
          )}
          <button
            aria-label="상세 정보 닫기"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#2f6fed]">
            <span>{restaurant.category}</span>
            {restaurant.area ? <span>· {restaurant.area}</span> : null}
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.06em] text-slate-900">{restaurant.name}</h2>
          {restaurant.memo ? (
            <p className="mt-5 whitespace-pre-line text-[0.95rem] leading-7 text-slate-600">{restaurant.memo}</p>
          ) : null}

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-800">주소</p>
            <p className="mt-1">{restaurant.address || "주소 정보가 없습니다."}</p>
          </div>

          {restaurant.imageUrl && restaurant.imageSourceUrl ? (
            <p className="mt-3 text-[0.68rem] leading-5 text-slate-400">
              이미지 출처: {restaurant.imageCredit ? `${restaurant.imageCredit} · ` : ""}
              <a className="underline underline-offset-2 transition hover:text-slate-600" href={restaurant.imageSourceUrl} rel="noreferrer" target="_blank">
                네이버 이미지
              </a>
            </p>
          ) : null}

          {restaurant.tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {restaurant.tags.map((tag) => (
                <span
                  className="rounded-full bg-[#edf3ff] px-3 py-1.5 text-xs font-semibold text-[#2f6fed]"
                  key={tag}
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          <a
            className="mt-7 flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#2f6fed] px-5 text-sm font-bold text-white transition hover:bg-[#255ac8]"
            href={restaurant.naverUrl}
            rel="noreferrer"
            target="_blank"
          >
            네이버 지도에서 보기
            <ArrowIcon />
          </a>
        </div>
      </div>
    </div>
  );
}

export function RestaurantExplorer({ restaurants }: RestaurantExplorerProps) {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("전체 지역");
  const [tag, setTag] = useState("전체 분류");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRandomPicksOpen, setIsRandomPicksOpen] = useState(false);
  const [isDrawingRandom, setIsDrawingRandom] = useState(false);
  const [randomSeed, setRandomSeed] = useState(0);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(restaurants[0]?.id ?? null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const restaurantListRef = useRef<HTMLDivElement>(null);
  const tagSeed = useId();

  const areas = useMemo(
    () => Array.from(new Set(restaurants.map((restaurant) => restaurant.area).filter(Boolean))).sort(),
    [restaurants],
  );
  const tags = useMemo(
    () => Array.from(new Set(restaurants.flatMap((restaurant) => restaurant.tags))).sort(),
    [restaurants],
  );
  const visibleTags = useMemo(() => shuffle(tags, tagSeed), [tagSeed, tags]);

  const filteredRestaurants = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("ko-KR");

    return restaurants.filter((restaurant) => {
      const searchableText = [
        restaurant.name,
        restaurant.category,
        restaurant.area,
        restaurant.address,
        restaurant.memo,
        ...restaurant.tags,
      ]
        .join(" ")
        .toLocaleLowerCase("ko-KR");

      return (
        (!normalizedSearch || searchableText.includes(normalizedSearch)) &&
        (area === "전체 지역" || restaurant.area === area) &&
        (tag === "전체 분류" || restaurant.tags.includes(tag))
      );
    });
  }, [area, restaurants, search, tag]);

  const randomRestaurants = useMemo(
    () => shuffle(filteredRestaurants, `${tagSeed}-${randomSeed}-${search}-${area}-${tag}`).slice(0, 5),
    [area, filteredRestaurants, randomSeed, search, tag, tagSeed],
  );

  useEffect(() => {
    if (!isDrawingRandom) return;

    const timeoutId = window.setTimeout(() => {
      setRandomSeed((seed) => seed + 1);
      setIsDrawingRandom(false);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [isDrawingRandom]);

  useEffect(() => {
    if (!selectedRestaurant) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedRestaurant(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRestaurant]);

  const selectRestaurant = useCallback((id: string) => {
    setActiveRestaurantId(id);
    setIsSidebarCollapsed(false);
  }, []);

  function openRestaurant(restaurant: Restaurant) {
    setActiveRestaurantId(restaurant.id);
    setSelectedRestaurant(restaurant);
  }

  function resetFilters() {
    setSearch("");
    setArea("전체 지역");
    setTag("전체 분류");
  }

  function drawRandomPicks() {
    if (isDrawingRandom) return;

    setIsRandomPicksOpen(true);
    if (filteredRestaurants.length > 0) {
      setIsDrawingRandom(true);
    } else {
      setRandomSeed((seed) => seed + 1);
    }
  }

  const activeFilterCount = [
    search.trim(),
    area !== "전체 지역" ? area : "",
    tag !== "전체 분류" ? tag : "",
  ].filter(Boolean).length;
  const selectedIdForView =
    activeRestaurantId && filteredRestaurants.some((restaurant) => restaurant.id === activeRestaurantId)
      ? activeRestaurantId
      : filteredRestaurants[0]?.id ?? null;

  useEffect(() => {
    if (!selectedIdForView) return;

    const list = restaurantListRef.current;
    const selectedItem = Array.from(list?.querySelectorAll<HTMLElement>("[data-restaurant-id]") ?? []).find(
      (item) => item.dataset.restaurantId === selectedIdForView,
    );

    selectedItem?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [isSidebarCollapsed, selectedIdForView]);

  return (
    <main className="h-[100dvh] w-[100dvw] overflow-hidden bg-[#eef2f5] text-[#142033]">
      <div className="flex h-full w-full flex-col lg:flex-row">
        <aside
          className={`order-2 flex h-[48dvh] min-h-0 min-w-0 w-full flex-col overflow-hidden border-t border-slate-200/80 bg-white lg:order-1 lg:h-full lg:shrink-0 lg:border-r lg:border-t-0 lg:transition-[width,opacity] lg:duration-300 lg:ease-in-out ${
            isSidebarCollapsed
              ? "lg:pointer-events-none lg:w-0 lg:opacity-0"
              : "lg:w-[clamp(360px,29dvw,480px)] lg:opacity-100"
          }`}
        >
          <div className="shrink-0 border-b border-slate-100 p-3 sm:p-4">
            <label className="flex h-11 items-center gap-3 rounded-xl bg-slate-50 px-3.5 text-slate-400 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-[#c9d9fb]">
                <SearchIcon />
                <span className="sr-only">맛집 검색</span>
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="가게명, 분류, 지역 검색"
                  value={search}
                />
                {search ? (
                  <button
                    className="text-xs font-bold text-slate-400 hover:text-slate-700"
                    onClick={() => setSearch("")}
                    type="button"
                  >
                    지우기
                  </button>
                ) : null}
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[0.68rem] font-bold text-slate-400">
                  지역
                  <select
                    className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none"
                    onChange={(event) => setArea(event.target.value)}
                    value={area}
                  >
                    <option>전체 지역</option>
                    {areas.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[0.68rem] font-bold text-slate-400">
                  분류
                  <select
                    className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none"
                    onChange={(event) => setTag(event.target.value)}
                    value={tag}
                  >
                    <option>전체 분류</option>
                    {visibleTags.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>

              {tags.length > 0 ? (
                <div className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {visibleTags.slice(0, 8).map((item) => (
                    <button
                      className={`shrink-0 rounded-full px-2.5 py-1.5 text-[0.66rem] font-semibold transition ${
                        tag === item ? "bg-[#e3edff] text-[#2f6fed]" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                      key={item}
                      onClick={() => setTag(tag === item ? "전체 분류" : item)}
                      type="button"
                    >
                      #{item}
                    </button>
                  ))}
                </div>
              ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2 sm:px-4">
            <p className="text-sm font-bold text-slate-800">
              맛집 <span className="text-[#2f6fed]">{filteredRestaurants.length}</span>
              {activeFilterCount > 0 ? <span className="ml-1 text-xs font-semibold text-slate-400">필터 적용 중</span> : null}
            </p>
            <div className="flex items-center gap-2">
              <button
                className={`rounded-full px-2.5 py-1.5 text-[0.68rem] font-bold transition ${
                  isRandomPicksOpen ? "bg-[#2f6fed] text-white" : "bg-[#edf3ff] text-[#2f6fed] hover:bg-[#dfeaff]"
                } disabled:cursor-wait disabled:opacity-60`}
                disabled={isDrawingRandom}
                onClick={drawRandomPicks}
                type="button"
              >
                랜덤 5개
              </button>
              {activeFilterCount > 0 ? (
                <button className="text-xs font-bold text-slate-400 hover:text-slate-800" onClick={resetFilters} type="button">
                  초기화
                </button>
              ) : null}
            </div>
          </div>

          {isRandomPicksOpen ? (
            <section
              aria-busy={isDrawingRandom}
              aria-label="랜덤 맛집 추천"
              className="shrink-0 border-b border-[#dce8ff] bg-[#f7faff] px-3 py-3 sm:px-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black tracking-[-0.02em] text-slate-800">
                    {isDrawingRandom ? "랜덤 슬롯을 돌리는 중..." : "필터 결과 랜덤 추천"}
                  </p>
                  <p className="mt-0.5 text-[0.66rem] text-slate-400">
                    {isDrawingRandom ? "잠시만 기다리면 오늘의 맛집이 나와요." : "현재 조건에서 최대 5곳을 골랐어요."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-[0.68rem] font-bold text-[#2f6fed] hover:text-[#255ac8] disabled:cursor-wait disabled:opacity-50"
                    disabled={isDrawingRandom}
                    onClick={drawRandomPicks}
                    type="button"
                  >
                    다시 뽑기
                  </button>
                  <button className="text-[0.68rem] font-bold text-slate-400 hover:text-slate-700" onClick={() => setIsRandomPicksOpen(false)} type="button">
                    닫기
                  </button>
                </div>
              </div>

              {isDrawingRandom ? (
                <div className="mt-2 grid grid-cols-2 gap-1.5" aria-live="polite">
                  {Array.from({ length: Math.min(5, filteredRestaurants.length) }, (_, index) => (
                    <div
                      className="slot-reel flex min-w-0 items-center gap-2 rounded-xl border border-[#e2eaff] bg-white px-2.5 py-2"
                      key={`slot-${index}`}
                      style={{ animationDelay: `${index * 65}ms` }}
                    >
                      <span className="slot-reel-icon flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#edf3ff] text-[#2f6fed]">
                        <MapPinned aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.7rem] font-bold text-slate-700">맛집을 고르는 중...</span>
                        <span className="mt-0.5 block text-[0.6rem] text-slate-400">{index + 1}번 슬롯</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : randomRestaurants.length > 0 ? (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {randomRestaurants.map((restaurant, index) => (
                    <button
                      className="slot-reveal flex min-w-0 items-center gap-2 rounded-xl border border-[#e2eaff] bg-white px-2.5 py-2 text-left transition hover:-translate-y-0.5 hover:border-[#9db9f5] hover:shadow-sm"
                      key={restaurant.id}
                      onClick={() => selectRestaurant(restaurant.id)}
                      style={{ animationDelay: `${index * 55}ms` }}
                      type="button"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#edf3ff] text-[#2f6fed]">
                        <RestaurantCategoryIcon category={restaurant.category} className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.7rem] font-bold text-slate-800">{index + 1}. {restaurant.name}</span>
                        <span className="mt-0.5 block truncate text-[0.6rem] text-slate-400">{restaurant.area || restaurant.category}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-500">현재 필터에 맞는 맛집이 없습니다.</p>
              )}
            </section>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3" ref={restaurantListRef}>
            {filteredRestaurants.length > 0 ? (
              <div className="space-y-2">
                {filteredRestaurants.map((restaurant, index) => (
                  <RestaurantListItem
                    index={index}
                    isSelected={selectedIdForView === restaurant.id}
                    key={restaurant.id}
                    onOpen={openRestaurant}
                    onSelect={selectRestaurant}
                    restaurant={restaurant}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 text-center">
                <MapPinned aria-hidden="true" className="h-9 w-9 text-[#2f6fed]" strokeWidth={1.7} />
                <h2 className="mt-4 text-sm font-bold text-slate-800">조건에 맞는 맛집이 없어요</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">검색어나 필터를 조금 바꿔 다시 찾아보세요.</p>
                <button
                  className="mt-4 rounded-full bg-[#edf3ff] px-3.5 py-2 text-xs font-bold text-[#2f6fed] transition hover:bg-[#dfeaff]"
                  onClick={resetFilters}
                  type="button"
                >
                  필터 초기화
                </button>
              </div>
            )}
          </div>
        </aside>

        <section className="relative order-1 h-[52dvh] min-h-0 min-w-0 w-full overflow-hidden border-b border-slate-200/80 bg-white lg:order-2 lg:h-full lg:flex-1 lg:border-b-0">
          <NaverMap
            onSelect={selectRestaurant}
            restaurants={filteredRestaurants}
            selectedId={selectedIdForView}
          />
          <button
            aria-expanded={!isSidebarCollapsed}
            aria-label={isSidebarCollapsed ? "맛집 목록 펼치기" : "맛집 목록 접기"}
            className="absolute left-0 top-1/2 z-30 hidden h-12 w-8 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-slate-200/90 bg-white/95 text-slate-600 shadow-lg backdrop-blur transition hover:bg-white lg:flex"
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            title={isSidebarCollapsed ? "맛집 목록 펼치기" : "맛집 목록 접기"}
            type="button"
          >
            <PanelToggleIcon isCollapsed={isSidebarCollapsed} />
          </button>
        </section>
      </div>

      {selectedRestaurant ? (
        <RestaurantDetail
          onClose={() => setSelectedRestaurant(null)}
          restaurant={selectedRestaurant}
        />
      ) : null}
    </main>
  );
}
