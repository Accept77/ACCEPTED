"use client";

import {
  getVisitTag,
  type VisitFilter,
} from "@/entities/restaurant/model/restaurant-filters";

function getVisitFilterClass(value: VisitFilter, isSelected: boolean) {
  if (value === "visited") {
    return isSelected
      ? "bg-emerald-100 text-emerald-700"
      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100";
  }

  if (value === "unvisited") {
    return isSelected
      ? "bg-amber-100 text-amber-700"
      : "bg-amber-50 text-amber-600 hover:bg-amber-100";
  }

  return isSelected
    ? "bg-[#e3edff] text-[#2f6fed]"
    : "bg-slate-50 text-slate-500 hover:bg-slate-100";
}

type RestaurantFilterControlsProps = {
  allDistricts: string;
  allRegion: string;
  allTags: string;
  districts: string[];
  hasPendingTagChanges: boolean;
  pendingTags: string[];
  region: string;
  regions: string[];
  selectedTags: string[];
  tagPickerValue: string;
  tags: string[];
  visibleTags: string[];
  visitFilter: VisitFilter;
  district: string;
  onApplyTagFilter: () => void;
  onDistrictChange: (value: string) => void;
  onDistrictToggle: (value: string) => void;
  onRegionChange: (value: string) => void;
  onTagPickerChange: (value: string) => void;
  onTogglePendingTag: (tag: string) => void;
  onVisitFilterChange: (value: VisitFilter) => void;
};

export function RestaurantFilterControls({
  allDistricts,
  allRegion,
  allTags,
  districts,
  hasPendingTagChanges,
  pendingTags,
  region,
  regions,
  selectedTags,
  tagPickerValue,
  tags,
  visibleTags,
  visitFilter,
  district,
  onApplyTagFilter,
  onDistrictChange,
  onDistrictToggle,
  onRegionChange,
  onTagPickerChange,
  onTogglePendingTag,
  onVisitFilterChange,
}: RestaurantFilterControlsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[0.68rem] font-bold text-slate-400 lg:min-h-0">
          지역
          <select
            className="min-w-0 flex-1 truncate bg-transparent text-xs font-bold text-slate-700 outline-none"
            onChange={(event) => onRegionChange(event.target.value)}
            value={region}
          >
            <option value={allRegion}>{allRegion}</option>
            {regions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[0.68rem] font-bold text-slate-400 lg:min-h-0">
          동네 지역
          <select
            className="min-w-0 flex-1 truncate bg-transparent text-xs font-bold text-slate-700 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={region === allRegion || districts.length === 0}
            onChange={(event) => onDistrictChange(event.target.value)}
            value={district}
          >
            <option value={allDistricts}>
              {region === allRegion ? "지역을 먼저 선택" : allDistricts}
            </option>
            {districts.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[0.68rem] font-bold text-slate-400 lg:min-h-0">
        분류 추가
        <select
          className="min-w-0 flex-1 truncate bg-transparent text-xs font-bold text-slate-700 outline-none"
          onChange={(event) => onTagPickerChange(event.target.value)}
          value={tagPickerValue}
        >
          <option value={allTags}>{allTags}</option>
          {visibleTags.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      {pendingTags.length > 0 || selectedTags.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-1.5"
          aria-label="선택한 분류"
        >
          {pendingTags.map((item) => (
            <button
              className="rounded-full bg-[#2f6fed] px-3 py-1.5 text-[0.66rem] font-bold text-white transition hover:bg-[#255ac8]"
              key={item}
              onClick={() => onTogglePendingTag(item)}
              type="button"
            >
              #{item} ×
            </button>
          ))}
          {hasPendingTagChanges ? (
            <button
              className="rounded-full bg-[#142033] px-3 py-1.5 text-[0.66rem] font-bold text-white transition hover:bg-[#263a58]"
              onClick={onApplyTagFilter}
              type="button"
            >
              태그 적용
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="진수의 방문 상태 필터"
      >
        {[
          ["all", "전체"],
          ["visited", getVisitTag(true)],
          ["unvisited", getVisitTag(false)],
        ].map(([value, label]) => (
          <button
            aria-pressed={visitFilter === value}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[0.66rem] font-semibold transition lg:min-h-0 ${getVisitFilterClass(value as VisitFilter, visitFilter === value)}`}
            key={value}
            onClick={() => onVisitFilterChange(value as VisitFilter)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {region !== allRegion && districts.length > 0 ? (
        <div
          className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="선택한 지역의 동네"
        >
          {districts.slice(0, 8).map((item) => (
            <button
              aria-pressed={district === item}
              className={`min-h-11 shrink-0 rounded-full px-3 py-1.5 text-[0.66rem] font-semibold transition lg:min-h-0 ${
                district === item
                  ? "bg-[#e3edff] text-[#2f6fed]"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
              key={item}
              onClick={() => onDistrictToggle(item)}
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
              className={`shrink-0 rounded-full px-3 py-1.5 text-[0.66rem] font-semibold transition lg:min-h-0 ${
                pendingTags.includes(item)
                  ? "bg-[#e3edff] text-[#2f6fed]"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
              key={item}
              onClick={() => onTogglePendingTag(item)}
              type="button"
            >
              #{item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
