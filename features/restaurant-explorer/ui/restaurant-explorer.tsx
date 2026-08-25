"use client";

import Image from "next/image";
import { LocateFixed, MapPinned, Utensils } from "lucide-react";
import { createElement, memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { RestaurantMap } from "@/features/restaurant-explorer/ui/restaurant-map";
import { RestaurantRecommendationModal } from "@/features/restaurant-explorer/ui/restaurant-recommendation-modal";
import { categoryIcon } from "@/entities/restaurant/model/category-display";
import { distanceInMeters, formatDistance, type UserLocation } from "@/shared/lib/geo";
import { getLocationHierarchy } from "@/entities/restaurant/model/locations";
import { getRestaurantDisplayTags, getVisitTag, matchesRestaurantTags, type VisitFilter } from "@/entities/restaurant/model/restaurant-filters";
import type { Restaurant, RestaurantSummary } from "@/entities/restaurant/model/types";

type RestaurantExplorerProps = {
  restaurants: RestaurantSummary[];
  totalCount: number;
};

const placeholderStyles = [
  "linear-gradient(135deg, #dce7f7 0%, #f7e9d8 100%)",
  "linear-gradient(135deg, #e9e1f4 0%, #d8edf0 100%)",
  "linear-gradient(135deg, #f5e3c9 0%, #e2edf8 100%)",
];
const ALL_REGION = "전체 지역";
const ALL_DISTRICTS = "전체 구/군";
const ALL_TAGS = "전체 분류";
const LIST_BATCH_SIZE = 50;
const NEARBY_RADIUS_OPTIONS = [1, 3, 5] as const;

type LocationStatus = "idle" | "locating" | "ready" | "error";

function restaurantLocationLabel(restaurant: Pick<Restaurant, "address" | "area">) {
  const location = getLocationHierarchy(restaurant.address, restaurant.area);
  return [location.region, location.district].filter(Boolean).join(" · ");
}

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

const RestaurantSearchBar = memo(function RestaurantSearchBar({
  value,
  onApply,
}: {
  value: string;
  onApply: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <form
      className="flex h-11 items-center gap-3 rounded-xl bg-slate-50 px-3.5 text-slate-400 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-[#c9d9fb]"
      onSubmit={(event) => {
        event.preventDefault();
        const normalizedDraft = draft.trim();
        setDraft(normalizedDraft);
        onApply(normalizedDraft);
      }}
    >
      <SearchIcon />
      <label className="sr-only" htmlFor="restaurant-search">맛집 검색</label>
      <input
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
        id="restaurant-search"
        onChange={(event) => setDraft(event.target.value)}
        placeholder="가게명, 분류, 지역 검색"
        value={draft}
      />
      {draft ? (
        <button
          className="min-h-11 shrink-0 px-1 text-xs font-bold text-slate-400 hover:text-slate-700 lg:min-h-0"
          onClick={() => {
            setDraft("");
            onApply("");
          }}
          type="button"
        >
          지우기
        </button>
      ) : null}
      <button
        aria-label="검색 적용"
        className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-bold text-[#2f6fed] transition hover:bg-[#e3edff] lg:min-h-0"
        type="submit"
      >
        검색
      </button>
    </form>
  );
});

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

const RestaurantListItem = memo(function RestaurantListItem({
  restaurant,
  index,
  isSelected,
  distance,
  onOpen,
  onSelect,
}: {
  restaurant: RestaurantSummary;
  index: number;
  isSelected: boolean;
  distance: number | null;
  onOpen: (restaurant: RestaurantSummary) => void;
  onSelect: (id: string) => void;
}) {
  const locationLabel = restaurantLocationLabel(restaurant);
  const visitTag = getVisitTag(restaurant.hasVisited);
  const previewTags = [visitTag, ...getRestaurantDisplayTags(restaurant).filter((tag) => tag !== visitTag)].slice(0, 2);

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

        <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
          <div className="flex items-center gap-2 text-[0.68rem] font-bold text-[#2f6fed]">
            <span>{restaurant.category}</span>
            {locationLabel ? <span className="text-slate-300">·</span> : null}
            <span className="truncate text-slate-400">{locationLabel || "지역 미지정"}</span>
          </div>
          <h2 className="truncate text-[0.98rem] font-bold tracking-[-0.03em] text-slate-900">
            {restaurant.name}
          </h2>
          {distance !== null ? <p className="text-xs font-semibold text-[#2f6fed]">현재 위치에서 {formatDistance(distance)}</p> : null}
          {restaurant.memo ? <p className="line-clamp-2 text-xs leading-5 text-slate-500">{restaurant.memo}</p> : null}
        </div>
      </button>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          {previewTags.map((tag) => (
            <span className="shrink-0 rounded-full bg-[#f1f5fb] px-2 py-1 text-[0.65rem] font-semibold text-slate-500" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
        <button
          className="min-h-11 lg:min-h-0 shrink-0 px-1 text-xs font-bold text-[#2f6fed] transition hover:text-[#1f55bd]"
          onClick={() => onOpen(restaurant)}
          type="button"
        >
          상세 보기
        </button>
      </div>
    </article>
  );
});

function RestaurantDetail({
  restaurant,
  onClose,
}: {
  restaurant: Restaurant;
  onClose: () => void;
}) {
  const locationLabel = restaurantLocationLabel(restaurant);
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
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white lg:h-10 lg:w-10"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#2f6fed]">
            <span>{restaurant.category}</span>
            {locationLabel ? <span>· {locationLabel}</span> : null}
          </div>
          <h2 className="text-3xl font-bold tracking-[-0.06em] text-slate-900">{restaurant.name}</h2>
          {restaurant.memo ? (
            <p className="whitespace-pre-line text-[0.95rem] leading-7 text-slate-600">{restaurant.memo}</p>
          ) : null}

          <div className="flex flex-col gap-1 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-800">주소</p>
            <p>{restaurant.address || "주소 정보가 없습니다."}</p>
          </div>

          {restaurant.imageUrl && restaurant.imageSourceUrl ? (
            <p className="text-[0.68rem] leading-5 text-slate-400">
              이미지 출처: {restaurant.imageCredit ? `${restaurant.imageCredit} · ` : ""}
              <a className="underline underline-offset-2 transition hover:text-slate-600" href={restaurant.imageSourceUrl} rel="noreferrer" target="_blank">
                네이버 이미지
              </a>
            </p>
          ) : null}

          {getRestaurantDisplayTags(restaurant).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {getRestaurantDisplayTags(restaurant).map((tag) => (
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
            className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#2f6fed] px-5 text-sm font-bold text-white transition hover:bg-[#255ac8]"
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

function getLocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "위치 권한이 거부됐어요. 브라우저 설정에서 허용해 주세요.";
  if (error.code === error.POSITION_UNAVAILABLE) return "현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
  if (error.code === error.TIMEOUT) return "위치 확인이 오래 걸리고 있어요. 다시 시도해 주세요.";
  return "현재 위치를 확인하지 못했어요. 다시 시도해 주세요.";
}

function RestaurantDetailStatus({
  restaurant,
  error,
  isLoading,
  onClose,
  onRetry,
}: {
  restaurant: RestaurantSummary;
  error: string;
  isLoading: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
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
      <div className="flex w-full flex-col items-center gap-4 rounded-t-[2rem] bg-white p-8 text-center shadow-2xl sm:max-w-xl sm:rounded-[2rem]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf3ff]">
          <RestaurantCategoryIcon category={restaurant.category} className="h-8 w-8 text-[#2f6fed]" />
        </div>
        <h2 className="text-xl font-bold tracking-[-0.04em] text-slate-900">{restaurant.name}</h2>
        <p className="text-sm text-slate-500">
          {isLoading ? "상세 정보를 불러오는 중이에요." : error}
        </p>
        <div className="flex justify-center gap-2">
          {!isLoading && error ? (
            <button
              className="rounded-xl bg-[#2f6fed] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#255ac8]"
              onClick={onRetry}
              type="button"
            >
              다시 시도
            </button>
          ) : null}
          <button
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export function RestaurantExplorer({ restaurants, totalCount }: RestaurantExplorerProps) {
  const [search, setSearch] = useState("");
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [region, setRegion] = useState(ALL_REGION);
  const [district, setDistrict] = useState(ALL_DISTRICTS);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [tagPickerValue, setTagPickerValue] = useState(ALL_TAGS);
  const [visitFilter, setVisitFilter] = useState<VisitFilter>("all");
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationError, setLocationError] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRecommendationOpen, setIsRecommendationOpen] = useState(false);
  const [isDrawingRecommendation, setIsDrawingRecommendation] = useState(false);
  const [recommendationSeed, setRecommendationSeed] = useState(0);
  const [visibleCount, setVisibleCount] = useState(LIST_BATCH_SIZE);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(restaurants[0]?.id ?? null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedRestaurantSummary, setSelectedRestaurantSummary] = useState<RestaurantSummary | null>(null);
  const [detailError, setDetailError] = useState("");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const restaurantListRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const detailRequestIdRef = useRef(0);
  const detailCacheRef = useRef(new Map<string, Restaurant>());
  const tagSeed = useId();

  const regions = useMemo(
    () =>
      Array.from(
        new Set(
          restaurants
            .map((restaurant) => getLocationHierarchy(restaurant.address, restaurant.area).region)
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right, "ko-KR")),
    [restaurants],
  );
  const districts = useMemo(() => {
    if (region === ALL_REGION) return [];

    return Array.from(
      new Set(
        restaurants
          .filter((restaurant) => getLocationHierarchy(restaurant.address, restaurant.area).region === region)
          .map((restaurant) => getLocationHierarchy(restaurant.address, restaurant.area).district)
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right, "ko-KR"));
  }, [region, restaurants]);
  const tags = useMemo(
    () => Array.from(new Set(restaurants.flatMap((restaurant) => restaurant.tags))).sort(),
    [restaurants],
  );
  const visibleTags = useMemo(() => shuffle(tags, tagSeed), [tagSeed, tags]);

  const hasPendingTagChanges = useMemo(
    () => pendingTags.length !== selectedTags.length || pendingTags.some((tag) => !selectedTags.includes(tag)),
    [pendingTags, selectedTags],
  );

  const filteredRestaurants = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("ko-KR");

    return restaurants.filter((restaurant) => {
      const location = getLocationHierarchy(restaurant.address, restaurant.area);
      const displayTags = getRestaurantDisplayTags(restaurant);
      const searchableText = [
        restaurant.name,
        restaurant.category,
        restaurant.area,
        location.region,
        location.district,
        restaurant.address,
        restaurant.memo,
        ...displayTags,
      ]
        .join(" ")
        .toLocaleLowerCase("ko-KR");
      const nearbyMatches =
        nearbyRadiusKm === null ||
        (userLocation !== null &&
          restaurant.latitude !== null &&
          restaurant.longitude !== null &&
          distanceInMeters(userLocation, {
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
          }) <= nearbyRadiusKm * 1000);

      return (
        (!normalizedSearch || searchableText.includes(normalizedSearch)) &&
        (region === ALL_REGION || location.region === region) &&
        (district === ALL_DISTRICTS || location.district === district) &&
        matchesRestaurantTags(restaurant, selectedTags, visitFilter) &&
        nearbyMatches
      );
    });
  }, [district, nearbyRadiusKm, region, restaurants, search, selectedTags, userLocation, visitFilter]);

  const restaurantDistances = useMemo(() => {
    const distances = new Map<string, number>();
    if (!userLocation) return distances;

    restaurants.forEach((restaurant) => {
      if (restaurant.latitude === null || restaurant.longitude === null) return;
      distances.set(
        restaurant.id,
        distanceInMeters(userLocation, {
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
        }),
      );
    });

    return distances;
  }, [restaurants, userLocation]);

  const recommendationCandidates = useMemo(
    () => shuffle(filteredRestaurants, `${tagSeed}-${recommendationSeed}-${search}-${region}-${district}-${selectedTags.join(",")}-${visitFilter}-${nearbyRadiusKm ?? "all"}`).slice(0, 5),
    [district, filteredRestaurants, nearbyRadiusKm, recommendationSeed, region, search, selectedTags, tagSeed, visitFilter],
  );
  const hasMoreRestaurants = visibleCount < filteredRestaurants.length;
  const visibleRestaurants = useMemo(
    () => filteredRestaurants.slice(0, visibleCount),
    [filteredRestaurants, visibleCount],
  );

  useEffect(() => {
    if (!isDrawingRecommendation) return;

    const timeoutId = window.setTimeout(() => {
      setIsDrawingRecommendation(false);
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [isDrawingRecommendation]);

  useEffect(() => {
    if (!selectedRestaurantSummary) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRestaurant();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRestaurantSummary]);

  useEffect(() => {
    if (!isRecommendationOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDrawingRecommendation) setIsRecommendationOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawingRecommendation, isRecommendationOpen]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const scrollRoot = restaurantListRef.current;
    if (!sentinel || !scrollRoot || !hasMoreRestaurants) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisibleCount((currentCount) =>
          Math.min(currentCount + LIST_BATCH_SIZE, filteredRestaurants.length),
        );
      },
      { root: scrollRoot, rootMargin: "320px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredRestaurants.length, hasMoreRestaurants, visibleCount]);

  const selectRestaurant = useCallback((id: string) => {
    setActiveRestaurantId(id);
    setIsSidebarCollapsed(false);
    const index = filteredRestaurants.findIndex((restaurant) => restaurant.id === id);
    if (index >= 0) {
      setVisibleCount((currentCount) =>
        Math.max(currentCount, Math.min(filteredRestaurants.length, Math.ceil((index + 1) / LIST_BATCH_SIZE) * LIST_BATCH_SIZE)),
      );
    }
  }, [filteredRestaurants]);

  const openRestaurant = useCallback(async (restaurant: RestaurantSummary) => {
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    setActiveRestaurantId(restaurant.id);
    setSelectedRestaurantSummary(restaurant);
    setSelectedRestaurant(null);
    setDetailError("");

    const cachedRestaurant = detailCacheRef.current.get(restaurant.id);
    if (cachedRestaurant) {
      setSelectedRestaurant(cachedRestaurant);
      setIsDetailLoading(false);
      return;
    }

    setIsDetailLoading(true);

    try {
      const response = await fetch(`/api/restaurants/${encodeURIComponent(restaurant.id)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("상세 정보를 불러오지 못했습니다.");
      }

      const detail = (await response.json()) as Restaurant;
      if (detailRequestIdRef.current !== requestId) return;

      detailCacheRef.current.set(detail.id, detail);
      setSelectedRestaurant(detail);
    } catch (error) {
      if (detailRequestIdRef.current !== requestId) return;
      setDetailError(error instanceof Error ? error.message : "상세 정보를 불러오지 못했습니다.");
    } finally {
      if (detailRequestIdRef.current === requestId) setIsDetailLoading(false);
    }
  }, []);

  function closeRestaurant() {
    detailRequestIdRef.current += 1;
    setSelectedRestaurant(null);
    setSelectedRestaurantSummary(null);
    setDetailError("");
    setIsDetailLoading(false);
  }

  function requestUserLocation() {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("이 브라우저에서는 현재 위치를 사용할 수 없어요.");
      return;
    }

    setLocationStatus("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({
          accuracy: coords.accuracy,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setActiveRestaurantId(null);
        setVisibleCount(LIST_BATCH_SIZE);
        setLocationStatus("ready");
      },
      (error) => {
        setLocationStatus("error");
        setLocationError(getLocationErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 10_000,
      },
    );
  }

  function resetFilters() {
    setSearch("");
    setSearchResetKey((key) => key + 1);
    setRegion(ALL_REGION);
    setDistrict(ALL_DISTRICTS);
    setSelectedTags([]);
    setPendingTags([]);
    setTagPickerValue(ALL_TAGS);
    setVisitFilter("all");
    setNearbyRadiusKm(null);
    setVisibleCount(LIST_BATCH_SIZE);
  }

  const applySearch = useCallback((value: string) => {
    setSearch(value.trim());
    setVisibleCount(LIST_BATCH_SIZE);
  }, []);

  function togglePendingTag(tag: string) {
    setPendingTags((currentTags) => currentTags.includes(tag)
      ? currentTags.filter((tagItem) => tagItem !== tag)
      : [...currentTags, tag]);
    setTagPickerValue(ALL_TAGS);
  }

  function applyTagFilter() {
    setSelectedTags(pendingTags);
    setVisibleCount(LIST_BATCH_SIZE);
  }

  function drawRecommendation() {
    if (isDrawingRecommendation) return;

    setIsRecommendationOpen(true);
    setRecommendationSeed((seed) => seed + 1);
    setIsDrawingRecommendation(filteredRestaurants.length > 0);
  }

  function closeRecommendation() {
    if (isDrawingRecommendation) return;
    setIsRecommendationOpen(false);
  }

  function openRecommendationRestaurant(restaurant: RestaurantSummary) {
    setIsRecommendationOpen(false);
    void openRestaurant(restaurant);
  }

  const activeFilterCount = [
    search.trim(),
    region !== ALL_REGION ? region : "",
    district !== ALL_DISTRICTS ? district : "",
    selectedTags.length > 0 ? selectedTags.join(",") : "",
    visitFilter !== "all" ? visitFilter : "",
    nearbyRadiusKm !== null ? String(nearbyRadiusKm) : "",
  ].filter(Boolean).length;
  const selectedIdForView =
    activeRestaurantId && filteredRestaurants.some((restaurant) => restaurant.id === activeRestaurantId)
      ? activeRestaurantId
      : userLocation
        ? null
        : filteredRestaurants[0]?.id ?? null;

  useEffect(() => {
    if (!selectedIdForView) return;

    const list = restaurantListRef.current;
    const selectedItem = Array.from(list?.querySelectorAll<HTMLElement>("[data-restaurant-id]") ?? []).find(
      (item) => item.dataset.restaurantId === selectedIdForView,
    );

    selectedItem?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [isSidebarCollapsed, selectedIdForView, visibleCount]);

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
          <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 p-3 sm:p-4">
            <RestaurantSearchBar key={searchResetKey} onApply={applySearch} value={search} />

              <div className="grid grid-cols-2 gap-2">
                <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[0.68rem] font-bold text-slate-400 lg:min-h-0">
                  지역
                  <select
                    className="min-w-0 flex-1 truncate bg-transparent text-xs font-bold text-slate-700 outline-none"
                    onChange={(event) => {
                      setRegion(event.target.value);
                      setDistrict(ALL_DISTRICTS);
                      setVisibleCount(LIST_BATCH_SIZE);
                    }}
                    value={region}
                  >
                    <option value={ALL_REGION}>{ALL_REGION}</option>
                    {regions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[0.68rem] font-bold text-slate-400 lg:min-h-0">
                  세부 지역
                  <select
                    className="min-w-0 flex-1 truncate bg-transparent text-xs font-bold text-slate-700 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
                    disabled={region === ALL_REGION || districts.length === 0}
                    onChange={(event) => {
                      setDistrict(event.target.value);
                      setVisibleCount(LIST_BATCH_SIZE);
                    }}
                    value={district}
                  >
                    <option value={ALL_DISTRICTS}>
                      {region === ALL_REGION ? "지역을 먼저 선택" : ALL_DISTRICTS}
                    </option>
                    {districts.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[0.68rem] font-bold text-slate-400 lg:min-h-0">
                분류 추가
                <select
                  className="min-w-0 flex-1 truncate bg-transparent text-xs font-bold text-slate-700 outline-none"
                  onChange={(event) => {
                    const nextTag = event.target.value;
                    if (nextTag !== ALL_TAGS) togglePendingTag(nextTag);
                  }}
                  value={tagPickerValue}
                >
                  <option value={ALL_TAGS}>{ALL_TAGS}</option>
                  {visibleTags.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              {pendingTags.length > 0 || selectedTags.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5" aria-label="선택한 분류">
                  {pendingTags.map((item) => (
                    <button
                      className="rounded-full bg-[#2f6fed] px-3 py-1.5 text-[0.66rem] font-bold text-white transition hover:bg-[#255ac8]"
                      key={item}
                      onClick={() => togglePendingTag(item)}
                      type="button"
                    >
                      #{item} ×
                    </button>
                  ))}
                  {hasPendingTagChanges ? (
                    <button
                      className="rounded-full bg-[#142033] px-3 py-1.5 text-[0.66rem] font-bold text-white transition hover:bg-[#263a58]"
                      onClick={applyTagFilter}
                      type="button"
                    >
                      태그 적용
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="진수의 방문 여부 필터">
                {[
                  ["all", "전체"],
                  ["visited", getVisitTag(true)],
                  ["unvisited", getVisitTag(false)],
                ].map(([value, label]) => (
                  <button
                    aria-pressed={visitFilter === value}
                    className={`min-h-11 lg:min-h-0 shrink-0 rounded-full px-3 py-1.5 text-[0.66rem] font-semibold transition ${
                      visitFilter === value ? "bg-[#e3edff] text-[#2f6fed]" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                    key={value}
                    onClick={() => {
                      setVisitFilter(value as VisitFilter);
                      setVisibleCount(LIST_BATCH_SIZE);
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {userLocation ? (
                <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="내 주변 맛집 거리 필터">
                  <span className="shrink-0 px-1 text-[0.66rem] font-bold text-slate-400">내 주변</span>
                  <button
                    aria-pressed={nearbyRadiusKm === null}
                    className={`min-h-11 lg:min-h-0 shrink-0 rounded-full px-3 py-1.5 text-[0.66rem] font-semibold transition ${
                      nearbyRadiusKm === null ? "bg-[#e3edff] text-[#2f6fed]" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                    onClick={() => {
                      setNearbyRadiusKm(null);
                      setVisibleCount(LIST_BATCH_SIZE);
                    }}
                    type="button"
                  >
                    전체
                  </button>
                  {NEARBY_RADIUS_OPTIONS.map((radius) => (
                    <button
                      aria-pressed={nearbyRadiusKm === radius}
                      className={`min-h-11 lg:min-h-0 shrink-0 rounded-full px-3 py-1.5 text-[0.66rem] font-semibold transition ${
                        nearbyRadiusKm === radius ? "bg-[#e3edff] text-[#2f6fed]" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                      key={radius}
                      onClick={() => {
                        setNearbyRadiusKm(radius);
                        setVisibleCount(LIST_BATCH_SIZE);
                      }}
                      type="button"
                    >
                      {radius}km
                    </button>
                  ))}
                </div>
              ) : null}

              {region !== ALL_REGION && districts.length > 0 ? (
                <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="선택한 지역의 세부 지역">
                  {districts.slice(0, 8).map((item) => (
                    <button
                      aria-pressed={district === item}
                      className={`min-h-11 lg:min-h-0 shrink-0 rounded-full px-3 py-1.5 text-[0.66rem] font-semibold transition ${
                        district === item ? "bg-[#e3edff] text-[#2f6fed]" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                      key={item}
                      onClick={() => {
                        setDistrict(district === item ? ALL_DISTRICTS : item);
                        setVisibleCount(LIST_BATCH_SIZE);
                      }}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}

              {tags.length > 0 ? (
                <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {visibleTags.slice(0, 8).map((item) => (
                    <button
                      aria-pressed={pendingTags.includes(item)}
                      className={`min-h-11 lg:min-h-0 shrink-0 rounded-full px-3 py-1.5 text-[0.66rem] font-semibold transition ${
                        pendingTags.includes(item) ? "bg-[#e3edff] text-[#2f6fed]" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                      key={item}
                      onClick={() => togglePendingTag(item)}
                      type="button"
                    >
                      #{item}
                    </button>
                  ))}
                </div>
              ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2 sm:px-4">
            <p className="min-w-0 text-sm font-bold text-slate-800">
              맛집 <span className="text-[#2f6fed]">{(activeFilterCount > 0 ? filteredRestaurants.length : totalCount).toLocaleString("ko-KR")}</span>곳
              {activeFilterCount > 0 ? (
                <span className="pl-1 text-xs font-semibold text-slate-400">
                  / 전체 {totalCount.toLocaleString("ko-KR")}곳 · 필터 적용 중
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 ? (
                <button className="min-h-11 shrink-0 px-1 text-xs font-bold text-slate-400 hover:text-slate-800 lg:min-h-0" onClick={resetFilters} type="button">
                  초기화
                </button>
              ) : null}
            </div>
          </div>

          <div className="safe-area-bottom-preserving min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3" ref={restaurantListRef}>
            {filteredRestaurants.length > 0 ? (
              <div className="flex flex-col gap-2">
                {visibleRestaurants.map((restaurant, index) => (
                  <RestaurantListItem
                    distance={restaurantDistances.get(restaurant.id) ?? null}
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
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 px-6 text-center">
                <MapPinned aria-hidden="true" className="h-9 w-9 text-[#2f6fed]" strokeWidth={1.7} />
                <h2 className="text-sm font-bold text-slate-800">조건에 맞는 맛집이 없어요</h2>
                <p className="text-xs leading-5 text-slate-500">검색어나 필터를 조금 바꿔 다시 찾아보세요.</p>
                <button
                  className="min-h-11 rounded-full bg-[#edf3ff] px-3.5 py-2 text-xs font-bold text-[#2f6fed] transition hover:bg-[#dfeaff] lg:min-h-0"
                  onClick={resetFilters}
                  type="button"
                >
                  필터 초기화
                </button>
              </div>
            )}
            {hasMoreRestaurants ? (
              <div
                aria-live="polite"
                className="flex min-h-16 items-center justify-center px-3 text-xs font-semibold text-slate-400"
                ref={loadMoreRef}
              >
                스크롤하면 더 많은 맛집을 불러와요
              </div>
            ) : null}
          </div>
        </aside>

        <section className="relative order-1 h-[52dvh] min-h-0 min-w-0 w-full overflow-hidden border-b border-slate-200/80 bg-white lg:order-2 lg:h-full lg:flex-1 lg:border-b-0">
          <RestaurantMap
            onSelect={selectRestaurant}
            restaurants={filteredRestaurants}
            selectedId={selectedIdForView}
            userLocation={userLocation}
          />
          <div className="absolute bottom-5 right-4 z-40 flex flex-col items-end gap-2 sm:right-5">
            {locationError ? (
              <p className="max-w-[min(18rem,calc(100vw-2rem))] rounded-xl bg-slate-900/85 px-3 py-2 text-right text-xs font-semibold leading-5 text-white shadow-lg backdrop-blur" role="alert">
                {locationError}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                aria-label="현재 위치 찾기"
                className={`flex h-12 items-center gap-2 rounded-2xl border border-white/80 px-4 text-sm font-black shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-wait disabled:opacity-60 ${
                  locationStatus === "ready" ? "bg-[#e3edff]/95 text-[#2f6fed]" : "bg-white/95 text-slate-700"
                }`}
                disabled={locationStatus === "locating"}
                onClick={requestUserLocation}
                title={locationStatus === "ready" ? "현재 위치를 다시 확인" : "현재 위치 찾기"}
                type="button"
              >
                <LocateFixed className={locationStatus === "locating" ? "h-4 w-4 animate-pulse" : "h-4 w-4"} aria-hidden="true" strokeWidth={2.1} />
                <span className="hidden sm:inline">
                  {locationStatus === "locating" ? "찾는 중..." : locationStatus === "ready" ? "내 위치" : "내 위치 찾기"}
                </span>
              </button>
              <button
                aria-label="메뉴추천 열기"
                className="flex h-12 items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-4 text-sm font-black text-[#2f6fed] shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isDrawingRecommendation || filteredRestaurants.length === 0}
                onClick={drawRecommendation}
                type="button"
              >
                <Utensils aria-hidden="true" className="h-4 w-4" strokeWidth={2.1} />
                메뉴추천
              </button>
            </div>
          </div>
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
          onClose={closeRestaurant}
          restaurant={selectedRestaurant}
        />
      ) : selectedRestaurantSummary ? (
        <RestaurantDetailStatus
          error={detailError}
          isLoading={isDetailLoading}
          onClose={closeRestaurant}
          onRetry={() => void openRestaurant(selectedRestaurantSummary)}
          restaurant={selectedRestaurantSummary}
        />
      ) : null}

      {isRecommendationOpen ? (
        <RestaurantRecommendationModal
          candidates={recommendationCandidates}
          isDrawing={isDrawingRecommendation}
          onClose={closeRecommendation}
          onOpenRestaurant={openRecommendationRestaurant}
          onRedraw={drawRecommendation}
          recommendations={recommendationCandidates}
        />
      ) : null}
    </main>
  );
}
