/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";

import type { PublicRestaurantIndex } from "@/entities/restaurant/model/types";
import { RestaurantExplorer } from "@/features/restaurant-explorer/ui/restaurant-explorer";
import type { ExplorerImageProps } from "@/features/restaurant-explorer/model/platform";
import { getExplorerApiUrl } from "@/features/restaurant-explorer/model/api";

import { appsInTossPlatform } from "./platform";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || "https://www.hungryjinsu.com";
const mapClientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID?.trim() || "";
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || "";
const faviconUrl = `${import.meta.env.BASE_URL}favicon.png`;

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: PublicRestaurantIndex };

function isPublicRestaurantIndex(value: unknown): value is PublicRestaurantIndex {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Record<string, unknown>;
  return Array.isArray(record.restaurants) && typeof record.totalCount === "number";
}

function WebViewImage({ alt, className, fill, src }: ExplorerImageProps) {
  const imageClassName = [
    fill ? "absolute inset-0 h-full w-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <img
      alt={alt}
      className={imageClassName}
      decoding="async"
      loading="lazy"
      src={src}
    />
  );
}

function useGoogleAnalytics() {
  useEffect(() => {
    if (!gaMeasurementId) return;

    const analyticsWindow = window as Window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
    analyticsWindow.gtag = (...args: unknown[]) => {
      analyticsWindow.dataLayer?.push(args);
    };
    analyticsWindow.gtag("js", new Date());
    analyticsWindow.gtag("config", gaMeasurementId);

    const scriptId = "toss-google-analytics";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.async = true;
    script.id = scriptId;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
    document.head.appendChild(script);
  }, []);
}

function LoadingScreen() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f6f7f9] p-6">
      <div className="flex flex-col items-center gap-4 rounded-[2rem] bg-white px-10 py-9 text-center shadow-[0_20px_70px_-35px_rgba(20,32,51,0.45)]">
        <img
          alt="배고프면 진수에게"
          className="h-16 w-16 rounded-2xl object-cover"
          src={faviconUrl}
        />
        <p className="text-sm font-bold text-slate-600">맛집을 불러오는 중...</p>
      </div>
    </main>
  );
}

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f6f7f9] p-6">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-[2rem] bg-white px-7 py-8 text-center shadow-[0_20px_70px_-35px_rgba(20,32,51,0.45)]">
        <img
          alt=""
          aria-hidden="true"
          className="h-14 w-14 rounded-2xl object-cover opacity-80"
          src={faviconUrl}
        />
        <h1 className="text-lg font-black text-slate-900">
          맛집을 불러오지 못했어요
        </h1>
        <p className="text-sm leading-6 text-slate-500">
          잠시 후 다시 시도해 주세요.
        </p>
        <button
          className="mt-2 rounded-xl bg-[#2f6fed] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#255ac8]"
          onClick={onRetry}
          type="button"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}

export function TossApp() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  useGoogleAnalytics();

  const loadRestaurants = useCallback(async () => {
    try {
      const response = await fetch(getExplorerApiUrl(apiBaseUrl, "/api/restaurants"), {
        cache: "no-store",
      });
      const payload: unknown = await response.json();

      if (!response.ok || !isPublicRestaurantIndex(payload)) {
        throw new Error("맛집 목록을 불러오지 못했어요.");
      }

      setLoadState({ data: payload, status: "ready" });
    } catch {
      setLoadState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRestaurants();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRestaurants]);

  if (loadState.status === "loading") return <LoadingScreen />;
  if (loadState.status === "error") {
    return (
      <ErrorScreen
        onRetry={() => {
          setLoadState({ status: "loading" });
          void loadRestaurants();
        }}
      />
    );
  }

  return (
    <RestaurantExplorer
      apiBaseUrl={apiBaseUrl}
      imageComponent={WebViewImage}
      mapClientId={mapClientId}
      platform={appsInTossPlatform}
      restaurants={loadState.data.restaurants}
      totalCount={loadState.data.totalCount}
    />
  );
}
