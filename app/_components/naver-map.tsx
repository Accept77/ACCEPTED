"use client";

import {
  Component,
  createElement,
  memo,
  type ComponentProps,
  type ReactNode,
  useMemo,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapPinned } from "lucide-react";
import {
  Container,
  Marker,
  NaverMap as ReactNaverMap,
  NavermapsProvider,
  useNavermaps,
} from "react-naver-maps";

import { getNaverMapClientId } from "@/lib/config";
import { categoryIcon } from "@/lib/category-display";
import type { Restaurant } from "@/lib/types";

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

type NaverMapProps = {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

type MapStatusCardProps = {
  title: string;
  description: string;
  code?: string;
};

function MapStatusCard({ title, description, code }: MapStatusCardProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[radial-gradient(circle_at_50%_38%,#f8fbff_0,#e9f0f7_48%,#dbe5ef_100%)] p-6">
      <div className="max-w-sm rounded-[1.75rem] border border-white/80 bg-white/90 p-7 text-center shadow-[0_20px_70px_-35px_rgba(20,32,51,0.45)] backdrop-blur">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9f1ff] text-2xl"
          aria-hidden="true"
        >
          <MapPinned
            aria-hidden="true"
            className="h-7 w-7 text-[#2f6fed]"
            strokeWidth={1.7}
          />
        </div>
        <h2 className="mt-5 text-lg font-bold tracking-[-0.04em] text-slate-900">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
        {code ? (
          <code className="mt-5 block rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
            {code}
          </code>
        ) : null}
      </div>
    </div>
  );
}

type MapErrorBoundaryProps = {
  children: ReactNode;
};

type MapErrorBoundaryState = {
  hasError: boolean;
};

class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <MapStatusCard
          description="네이버 지도 API를 불러오지 못했습니다. Maps 애플리케이션의 Client ID와 Web 서비스 URL을 확인해주세요."
          title="지도를 불러오지 못했어요"
        />
      );
    }

    return this.props.children;
  }
}

function markerPalette(category: string) {
  const normalizedCategory = category.toLocaleLowerCase("ko-KR");

  if (
    normalizedCategory.includes("카페") ||
    normalizedCategory.includes("베이커리")
  ) {
    return { fill: "#f5eadb", accent: "#a26732" };
  }
  if (
    normalizedCategory.includes("한식") ||
    normalizedCategory.includes("국수")
  ) {
    return { fill: "#e5efff", accent: "#5077bd" };
  }
  if (
    normalizedCategory.includes("일식") ||
    normalizedCategory.includes("초밥") ||
    normalizedCategory.includes("스시")
  ) {
    return { fill: "#ffe8eb", accent: "#c85e6d" };
  }
  if (
    normalizedCategory.includes("중식") ||
    normalizedCategory.includes("딤섬")
  ) {
    return { fill: "#f0e7ff", accent: "#7958b2" };
  }
  if (
    normalizedCategory.includes("술집") ||
    normalizedCategory.includes("바(") ||
    normalizedCategory.includes("bar")
  ) {
    return { fill: "#e1f5ed", accent: "#368467" };
  }

  return { fill: "#edf2f7", accent: "#64748b" };
}

type MarkerIcon = NonNullable<ComponentProps<typeof Marker>["icon"]>;

function markerIcon(category: string, isSelected: boolean): MarkerIcon {
  const palette = markerPalette(category);
  const CategoryIcon = categoryIcon(category);
  const width = isSelected ? 48 : 40;
  const height = isSelected ? 56 : 48;
  const centerX = width / 2;
  const radius = isSelected ? 19 : 16;
  const centerY = radius + 3;
  const tailY = height - 2;
  const iconSize = isSelected ? 21 : 18;
  const background = isSelected ? "#2f6fed" : palette.fill;
  const border = isSelected ? "#ffffff" : palette.accent;
  const iconMarkup = renderToStaticMarkup(
    createElement(CategoryIcon, {
      "aria-hidden": "true",
      color: isSelected ? "#ffffff" : palette.accent,
      size: isSelected ? 21 : 18,
      strokeWidth: 2.2,
    }),
  );
  const positionedIcon = iconMarkup.replace(
    "<svg",
    `<svg x="${centerX - iconSize / 2}" y="${centerY - iconSize / 2}"`,
  );
  const pinPath = `M ${centerX} ${tailY} C ${centerX - 3} ${tailY - 4}, ${centerX - radius} ${centerY + radius * 0.55}, ${centerX - radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY} C ${centerX + radius} ${centerY + radius * 0.55}, ${centerX + 3} ${tailY - 4}, ${centerX} ${tailY} Z`;
  const selectedHalo = isSelected
    ? `<circle cx="${centerX}" cy="${centerY}" r="${radius + 4}" fill="none" stroke="#2f6fed" stroke-width="2" stroke-opacity=".28"/>`
    : "";
  const content = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <filter id="marker-shadow" x="-40%" y="-30%" width="180%" height="190%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#142033" flood-opacity="${isSelected ? ".3" : ".2"}"/>
      </filter>
    </defs>
    ${selectedHalo}
    <path d="${pinPath}" fill="${background}" stroke="${border}" stroke-width="${isSelected ? 2.5 : 2}" stroke-linejoin="round" filter="url(#marker-shadow)"/>
    <circle cx="${centerX}" cy="${centerY}" r="${radius - 3}" fill="${isSelected ? "#255ac8" : palette.accent}" fill-opacity="${isSelected ? "1" : ".12"}"/>
    ${positionedIcon}
  </svg>`;

  return {
    anchor: { x: width / 2, y: height },
    content,
    size: { height, width },
  };
}

const MappableMarker = memo(function MappableMarker({
  restaurant,
  isSelected,
  onSelect,
}: {
  restaurant: Restaurant;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  if (restaurant.latitude === null || restaurant.longitude === null)
    return null;

  return (
    <Marker
      defaultPosition={{ lat: restaurant.latitude, lng: restaurant.longitude }}
      icon={markerIcon(restaurant.category, isSelected)}
      onClick={() => onSelect(restaurant.id)}
      title={restaurant.name}
      zIndex={isSelected ? 1000 : 1}
    />
  );
});

function MapContent({ restaurants, selectedId, onSelect }: NaverMapProps) {
  const navermaps = useNavermaps();
  const mappableRestaurants = useMemo(
    () =>
      restaurants.filter(
        (restaurant) =>
          restaurant.latitude !== null && restaurant.longitude !== null,
      ),
    [restaurants],
  );
  const selectedRestaurant = useMemo(
    () =>
      mappableRestaurants.find((restaurant) => restaurant.id === selectedId) ??
      null,
    [mappableRestaurants, selectedId],
  );
  const focusedRestaurant =
    selectedRestaurant ??
    (mappableRestaurants.length === 1 ? mappableRestaurants[0] : null);
  const bounds = useMemo(() => {
    if (focusedRestaurant || mappableRestaurants.length < 2) return undefined;

    const firstRestaurant = mappableRestaurants[0];
    const firstPosition = new navermaps.LatLng(
      firstRestaurant.latitude!,
      firstRestaurant.longitude!,
    );
    const nextBounds = new navermaps.LatLngBounds(firstPosition, firstPosition);
    mappableRestaurants.forEach((restaurant) => {
      nextBounds.extend(
        new navermaps.LatLng(restaurant.latitude!, restaurant.longitude!),
      );
    });
    return nextBounds;
  }, [focusedRestaurant, mappableRestaurants, navermaps]);

  return (
    <ReactNaverMap
      center={
        focusedRestaurant
          ? {
              lat: focusedRestaurant.latitude!,
              lng: focusedRestaurant.longitude!,
            }
          : undefined
      }
      bounds={bounds}
      defaultCenter={SEOUL_CENTER}
      defaultZoom={11}
      zoom={focusedRestaurant ? 16 : undefined}
      zoomControl
    >
      {mappableRestaurants.map((restaurant) => (
        <MappableMarker
          isSelected={restaurant.id === selectedId}
          key={restaurant.id}
          onSelect={onSelect}
          restaurant={restaurant}
        />
      ))}
    </ReactNaverMap>
  );
}

export function NaverMap({ restaurants, selectedId, onSelect }: NaverMapProps) {
  const mapClientId = getNaverMapClientId();
  const mappableCount = restaurants.filter(
    (restaurant) =>
      restaurant.latitude !== null && restaurant.longitude !== null,
  ).length;

  return (
    <section className="relative h-full min-h-0 w-full overflow-hidden bg-[#e8eef5]">
      {mapClientId ? (
        <MapErrorBoundary>
          <NavermapsProvider ncpKeyId={mapClientId}>
            <Container
              className="absolute inset-0"
              fallback={
                <MapStatusCard
                  description="네이버 지도 스크립트를 준비하고 있습니다. 잠시만 기다려주세요."
                  title="지도를 준비 중이에요"
                />
              }
              style={{ height: "100%", width: "100%" }}
            >
              <MapContent
                onSelect={onSelect}
                restaurants={restaurants}
                selectedId={selectedId}
              />
            </Container>
          </NavermapsProvider>
        </MapErrorBoundary>
      ) : (
        <MapStatusCard
          code="NEXT_PUBLIC_NAVER_MAP_CLIENT_ID"
          description="Web Dynamic Map Client ID를 환경변수에 넣으면 저장된 장소를 지도에 표시할 수 있습니다."
          title="네이버 지도 연결이 필요해요"
        />
      )}

      <div className="pointer-events-none absolute right-4 top-4 z-30 rounded-full border border-white/80 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
        {mappableCount}곳 표시 중
      </div>

      {mapClientId && mappableCount === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-5">
          <p className="rounded-full bg-slate-900/80 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur">
            좌표가 등록된 장소가 없어 지도에 표시할 수 없어요.
          </p>
        </div>
      ) : null}
    </section>
  );
}
