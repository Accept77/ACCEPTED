"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { importRestaurants, refreshRestaurantPhotos } from "@/app/actions/restaurants";
import type { NaverSavedPlace, RestaurantInput } from "@/lib/types";

type ExistingRestaurant = {
  name: string;
  naverUrl: string;
};

type SavedListPayload = {
  folderName: string;
  places: NaverSavedPlace[];
  shareId: string;
  total: number;
  skippedCount: number;
  error?: string;
};

function placeToInput(place: NaverSavedPlace, sortOrder: number): RestaurantInput {
  return {
    name: place.name,
    category: place.category,
    area: place.area,
    address: place.address,
    memo: place.memo,
    tags: place.tags,
    imagePath: null,
    imagePaths: [],
    imageSourceUrl: place.imageUrls.length ? place.naverUrl : null,
    imageCredit: place.imageUrls.length ? "네이버 장소 등록 이미지" : null,
    imageCandidates: place.imageUrls,
    imageImportUrl: place.imageUrls[0] ?? null,
    naverUrl: place.naverUrl,
    latitude: place.latitude,
    longitude: place.longitude,
    sortOrder,
    isVisible: true,
  };
}

export function NaverSavedListImporter({ existingRestaurants }: { existingRestaurants: ExistingRestaurant[] }) {
  const [listUrl, setListUrl] = useState("");
  const [folderName, setFolderName] = useState("");
  const [places, setPlaces] = useState<NaverSavedPlace[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [listFilter, setListFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingPhotos, setIsRefreshingPhotos] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  const existingUrls = useMemo(() => new Set(existingRestaurants.map((restaurant) => restaurant.naverUrl)), [existingRestaurants]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredPlaces = useMemo(() => {
    const query = listFilter.trim().toLowerCase();
    if (!query) return places;

    return places.filter((place) => [place.name, place.address, place.category, ...place.tags].join(" ").toLowerCase().includes(query));
  }, [listFilter, places]);
  const duplicateCount = places.filter((place) => existingUrls.has(place.naverUrl)).length;
  const selectableFilteredPlaces = filteredPlaces.filter((place) => !existingUrls.has(place.naverUrl));

  async function loadSavedList(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setResultMessage("");

    if (!listUrl.trim()) {
      setError("네이버 저장 리스트 링크를 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/naver/saved-list?url=${encodeURIComponent(listUrl.trim())}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as SavedListPayload;

      if (!response.ok) {
        setError(payload.error ?? "네이버 저장 리스트를 읽지 못했습니다.");
        return;
      }

      setFolderName(payload.folderName);
      setPlaces(payload.places);
      setTotal(payload.total);
      setSkippedCount(payload.skippedCount);
      setSelectedIds(payload.places.filter((place) => !existingUrls.has(place.naverUrl)).map((place) => place.id));

      if (!payload.places.length) {
        setError("가져올 수 있는 장소가 없습니다. 공개 리스트인지 확인해 주세요.");
      }
    } catch {
      setError("저장 리스트를 읽는 중 서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function selectVisiblePlaces() {
    setSelectedIds((current) => Array.from(new Set([...current, ...selectableFilteredPlaces.map((place) => place.id)])));
  }

  function clearVisiblePlaces() {
    const visibleIds = new Set(filteredPlaces.map((place) => place.id));
    setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)));
  }

  function togglePlace(place: NaverSavedPlace) {
    if (existingUrls.has(place.naverUrl)) return;

    setSelectedIds((current) => (current.includes(place.id) ? current.filter((id) => id !== place.id) : [...current, place.id]));
  }

  async function saveSelectedPlaces() {
    setError("");
    setResultMessage("");

    const selectedPlaces = places.filter((place) => selectedSet.has(place.id));
    if (!selectedPlaces.length) {
      setError("등록할 장소를 하나 이상 선택해 주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await importRestaurants(selectedPlaces.map(placeToInput));
      setResultMessage(`${result.insertedCount}곳을 등록했습니다. 중복 ${result.skippedCount}곳, 확인이 필요한 항목 ${result.invalidCount}곳은 제외했습니다.`);
      setPlaces((current) => current.filter((place) => !selectedSet.has(place.id)));
      setSelectedIds([]);
      setResultMessage(`${result.insertedCount}곳을 등록했습니다. 사진 ${result.imageImportedCount}개 저장, ${result.imageMissingCount}개는 보완이 필요합니다. 중복 ${result.skippedCount}곳, 제외 ${result.invalidCount}곳.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "맛집 일괄 등록에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshExistingPhotos() {
    setError("");
    setResultMessage("");

    const duplicatePlaces = places.filter((place) => existingUrls.has(place.naverUrl));
    if (!duplicatePlaces.length) {
      setError("이미 등록된 장소가 없습니다.");
      return;
    }

    setIsRefreshingPhotos(true);
    try {
      const result = await refreshRestaurantPhotos(duplicatePlaces);
      setResultMessage(`${result.updatedCount}개 장소를 확인했습니다. 사진 ${result.imageImportedCount}개 저장, ${result.imageMissingCount}개는 보완이 필요합니다.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "기존 장소 분류를 업데이트하지 못했습니다.");
    } finally {
      setIsRefreshingPhotos(false);
    }
  }

  return (
    <main className="h-[100dvh] w-[100dvw] overflow-hidden bg-[#eef2f5]">
      <div className="flex h-full flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="text-xs font-bold text-slate-400 transition hover:text-slate-700" href="/admin">
              ← 관리
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-[-0.03em] text-slate-900">네이버 저장 리스트 가져오기</p>
              <p className="truncate text-[0.68rem] text-slate-400">공유 리스트의 장소를 한 번에 등록합니다.</p>
            </div>
          </div>
          <Link className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg border border-slate-200 px-2.5 text-[0.68rem] font-bold text-slate-600 transition hover:border-slate-300 lg:h-9" href="/admin/new">
            직접 등록
          </Link>
        </header>

        <div className="min-h-0 flex-1 p-2.5 sm:p-4">
          <section className="flex h-full min-h-0 flex-col overflow-hidden border border-slate-200/80 bg-white">
            <div className="flex min-h-0 flex-1 flex-col gap-0 lg:grid lg:grid-cols-[minmax(280px,0.38fr)_minmax(0,1fr)]">
              <div className="min-h-0 overflow-y-auto border-b border-slate-100 p-4 sm:p-5 lg:overflow-visible lg:border-b-0 lg:border-r">
                <p className="text-[0.62rem] font-black tracking-[0.2em] text-[#2f6fed]">STEP 1</p>
                <h1 className="mt-2 text-lg font-bold tracking-[-0.04em] text-slate-900">공유 링크 붙여넣기</h1>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  네이버 지도에서 저장 리스트를 일부 공개 또는 전체 공개로 공유한 뒤 링크를 붙여넣으세요.
                </p>

                <form className="mt-5 space-y-2" onSubmit={loadSavedList}>
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8eaff4] focus:bg-white focus:ring-4 focus:ring-[#edf3ff]"
                    onChange={(event) => setListUrl(event.target.value)}
                    placeholder="https://naver.me/..."
                    value={listUrl}
                  />
                  <button
                    className="h-11 w-full rounded-xl bg-[#142033] text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading}
                    type="submit"
                  >
                    {isLoading ? "리스트 읽는 중..." : "저장 리스트 읽기"}
                  </button>
                </form>

                <div className="mt-5 rounded-xl bg-[#f7f9fc] p-3 text-[0.68rem] leading-5 text-slate-500">
                  <p className="font-bold text-slate-700">가져오는 정보</p>
                  <p className="mt-1">장소명, 주소, 좌표, 네이버 업종과 공식 장소 사진 후보를 가져옵니다. 업종은 분류 태그로 자동 저장됩니다.</p>
                  <p className="mt-1 text-slate-400">첫 사진부터 Storage에 자동 저장하고, 실패한 사진은 공식 후보를 관리자 화면에서 다시 선택할 수 있습니다.</p>
                </div>

                {folderName ? (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#dce8ff] bg-[#f7faff] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800">{folderName}</p>
                      <p className="mt-0.5 text-[0.65rem] text-slate-400">전체 {total}곳 · 읽음 {places.length}곳</p>
                    </div>
                    {listUrl ? (
                      <a className="shrink-0 text-[0.65rem] font-bold text-[#2f6fed]" href={listUrl} rel="noreferrer" target="_blank">
                        네이버에서 확인
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-slate-100 p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                      <p className="text-[0.62rem] font-black tracking-[0.2em] text-[#2f6fed]">STEP 2</p>
                      <h2 className="mt-2 text-lg font-bold tracking-[-0.04em] text-slate-900">
                        가져올 장소 <span className="text-[#2f6fed]">{selectedIds.length}</span>곳 선택
                      </h2>
                      {places.length ? (
                        <p className="mt-1 text-[0.68rem] text-slate-400">
                          이미 등록된 장소 {duplicateCount}곳은 자동으로 제외됩니다.
                          {skippedCount ? ` 장소로 확인되지 않은 항목 ${skippedCount}곳.` : ""}
                        </p>
                      ) : (
                        <p className="mt-1 text-[0.68rem] text-slate-400">리스트를 읽으면 장소 목록이 여기에 표시됩니다.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {duplicateCount > 0 ? (
                        <button
                          className="h-11 shrink-0 whitespace-nowrap rounded-xl border border-[#cbdafa] bg-[#f7faff] px-3 text-[0.68rem] font-bold text-[#2f6fed] transition hover:border-[#9db9f5] hover:bg-[#edf3ff] disabled:cursor-not-allowed disabled:opacity-50 lg:h-10"
                          disabled={isSaving || isRefreshingPhotos}
                          onClick={() => void refreshExistingPhotos()}
                          type="button"
                        >
                          {isRefreshingPhotos ? "사진 보완 중..." : "기존 사진 보완"}
                        </button>
                      ) : null}
                      <button
                        className="h-11 shrink-0 whitespace-nowrap rounded-xl bg-[#2f6fed] px-3.5 text-xs font-bold text-white transition hover:bg-[#255ac8] disabled:cursor-not-allowed disabled:opacity-50 lg:h-10"
                        disabled={isSaving || isRefreshingPhotos || selectedIds.length === 0}
                        onClick={() => void saveSelectedPlaces()}
                        type="button"
                      >
                        {isSaving ? "등록 중..." : `${selectedIds.length}곳 일괄 등록`}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8eaff4] focus:bg-white focus:ring-4 focus:ring-[#edf3ff] lg:h-10"
                      onChange={(event) => setListFilter(event.target.value)}
                      placeholder="장소명·주소·분류 태그로 목록 검색"
                      value={listFilter}
                    />
                    <div className="flex gap-1.5">
                      <button className="h-11 whitespace-nowrap rounded-xl border border-slate-200 px-2.5 text-[0.68rem] font-bold text-slate-600 transition hover:border-slate-300 disabled:opacity-50 lg:h-10" disabled={!selectableFilteredPlaces.length} onClick={selectVisiblePlaces} type="button">
                        현재 결과 선택
                      </button>
                      <button className="h-11 whitespace-nowrap rounded-xl border border-slate-200 px-2.5 text-[0.68rem] font-bold text-slate-500 transition hover:border-slate-300 disabled:opacity-50 lg:h-10" disabled={!filteredPlaces.length} onClick={clearVisiblePlaces} type="button">
                        선택 해제
                      </button>
                    </div>
                  </div>
                </div>

                <div className="safe-area-bottom min-h-0 flex-1 overflow-y-auto">
                  {filteredPlaces.length ? (
                    filteredPlaces.map((place) => {
                      const isDuplicate = existingUrls.has(place.naverUrl);
                      const isSelected = selectedSet.has(place.id);

                      return (
                        <label className={`[content-visibility:auto] [contain-intrinsic-size:0_78px] flex cursor-pointer gap-3 border-b border-slate-100 px-4 py-3 transition last:border-b-0 sm:px-5 ${isDuplicate ? "cursor-not-allowed bg-slate-50/70 opacity-65" : "hover:bg-[#f8faff]"}`} key={place.id}>
                          <input checked={isSelected} className="mt-1 h-4 w-4 accent-[#2f6fed]" disabled={isDuplicate} onChange={() => togglePlace(place)} type="checkbox" />
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#edf3ff]">
                            {place.imageUrls[0] ? (
                              <Image alt="" className="object-cover" fill sizes="48px" src={place.imageUrls[0]} />
                            ) : (
                              <span className="flex h-full items-center justify-center text-[0.6rem] font-bold text-slate-400">사진 없음</span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-bold text-slate-800">{place.name}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6rem] font-bold text-slate-500">{place.category}</span>
                              {isDuplicate ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6rem] font-bold text-amber-600">이미 등록</span> : null}
                            </span>
                            <span className="mt-1 block truncate text-[0.68rem] text-slate-400">{place.address}</span>
                            {place.tags.length ? <span className="mt-1 block truncate text-[0.62rem] text-[#6b8dcc]">{place.tags.join(" · ")}</span> : null}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="flex min-h-64 items-center justify-center px-6 text-center text-xs text-slate-400">
                      {places.length ? "검색 결과가 없습니다." : "먼저 네이버 저장 리스트를 읽어 주세요."}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error ? <p className="shrink-0 border-t border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-600" role="alert">{error}</p> : null}
            {resultMessage ? <p className="shrink-0 border-t border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700" role="status">{resultMessage}</p> : null}
          </section>
        </div>
      </div>
    </main>
  );
}
