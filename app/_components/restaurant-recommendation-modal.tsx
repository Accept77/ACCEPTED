"use client";

import { MapPinned, Utensils, X } from "lucide-react";
import { createElement } from "react";

import { categoryIcon } from "@/lib/category-display";
import { getLocationHierarchy } from "@/lib/locations";
import type { RestaurantSummary } from "@/lib/types";

type RestaurantRecommendationModalProps = {
  candidates: RestaurantSummary[];
  recommendations: RestaurantSummary[];
  isDrawing: boolean;
  onClose: () => void;
  onRedraw: () => void;
  onOpenRestaurant: (restaurant: RestaurantSummary) => void;
};

function locationLabel(restaurant: RestaurantSummary) {
  const location = getLocationHierarchy(restaurant.address, restaurant.area);
  return [location.region, location.district].filter(Boolean).join(" · ") || restaurant.category;
}

export function RestaurantRecommendationModal({
  candidates,
  recommendations,
  isDrawing,
  onClose,
  onRedraw,
  onOpenRestaurant,
}: RestaurantRecommendationModalProps) {
  const title = "메뉴추천";
  const reelCandidates = candidates.length > 0 ? [...candidates, ...candidates] : [];

  return (
    <div
      aria-label={`${title} 추천`}
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDrawing) onClose();
      }}
      role="dialog"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
        <div className="relative overflow-hidden bg-[#eef5ff] px-6 pb-7 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-[#2f6fed]">
                <Utensils aria-hidden="true" className="h-4 w-4" strokeWidth={2.1} />
                TODAY&apos;S PICK
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.07em] text-slate-900">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isDrawing ? "오늘의 맛집을 고르는 중이에요." : `${recommendations.length}곳을 골랐어요. 원하는 식당을 골라보세요.`}
              </p>
            </div>
            <button
              aria-label="추천 닫기"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-600 transition hover:bg-white disabled:cursor-wait disabled:opacity-50"
              disabled={isDrawing}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-white/80 bg-white/75 p-3 shadow-[0_16px_45px_-28px_rgba(20,32,51,0.55)]">
            {isDrawing ? (
              <div aria-live="polite" className="relative h-52 overflow-hidden rounded-2xl">
                {reelCandidates.length > 0 ? (
                  <div className="slot-machine-strip space-y-2">
                    {reelCandidates.map((restaurant, index) => {
                  const CandidateIcon = categoryIcon(restaurant.category);
                  return (
                    <div
                      className="slot-reel flex min-h-14 items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2"
                      key={`${restaurant.id}-${index}`}
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <span className="slot-reel-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf3ff] text-[#2f6fed]">
                        {createElement(CandidateIcon, { "aria-hidden": "true", className: "h-5 w-5", strokeWidth: 1.8 })}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-800">{restaurant.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">{locationLabel(restaurant)}</span>
                      </span>
                    </div>
                  );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-28 items-center justify-center text-sm text-slate-500">현재 조건에 맞는 식당이 없어요.</div>
                )}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white via-white/70 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/70 to-transparent" />
              </div>
            ) : recommendations.length > 0 ? (
              <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
                {recommendations.map((restaurant, index) => {
                  const CandidateIcon = categoryIcon(restaurant.category);

                  return (
                    <button
                      aria-label={`Open ${restaurant.name} details`}
                      className="slot-reveal flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#cbdafa] hover:shadow-[0_12px_28px_-20px_rgba(47,111,237,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6fed]"
                      key={restaurant.id}
                      onClick={() => onOpenRestaurant(restaurant)}
                      style={{ animationDelay: `${index * 70}ms` }}
                      type="button"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf3ff] text-[#2f6fed]">
                        {createElement(CandidateIcon, { "aria-hidden": "true", className: "h-5 w-5", strokeWidth: 1.8 })}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-800">
                          {index + 1}. {restaurant.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                          {restaurant.category} · {locationLabel(restaurant)}
                        </span>
                        {restaurant.memo ? <span className="mt-1 block line-clamp-1 text-xs text-slate-500">{restaurant.memo}</span> : null}
                      </span>
                      <span aria-hidden="true" className="shrink-0 text-xl leading-none text-slate-300">
                        ›
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-28 flex-col items-center justify-center text-center">
                <MapPinned aria-hidden="true" className="h-8 w-8 text-slate-400" strokeWidth={1.7} />
                <p className="mt-3 text-sm font-bold text-slate-600">현재 조건에 맞는 식당이 없어요.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <button
            className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-slate-300 disabled:cursor-wait disabled:opacity-50"
            disabled={isDrawing || candidates.length === 0}
            onClick={onRedraw}
            type="button"
          >
            다시 뽑기
          </button>
        </div>
      </div>
    </div>
  );
}
