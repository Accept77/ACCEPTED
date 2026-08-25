"use client";

import Link from "next/link";
import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createImageUploadUrl, deleteUploadedImages, importImageFromNaver } from "@/app/actions/images";
import { createRestaurant, updateRestaurant } from "@/app/actions/restaurants";
import { RESTAURANT_CATEGORIES } from "@/lib/constants";
import { getNaverCategoryTags } from "@/lib/naver-categories";
import { getVisitTag } from "@/lib/restaurant-filters";
import type { NaverImageCandidate, NaverPlaceSearchResult, Restaurant, RestaurantInput } from "@/lib/types";

const inputClass =
  "mt-2 h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8eaff4] focus:ring-4 focus:ring-[#edf3ff]";
const compactInputClass = inputClass.replace("h-13", "h-11").replace("rounded-2xl", "rounded-xl").replace("px-4", "px-3");
const MAX_IMAGES = 3;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const emptyForm: RestaurantInput = {
  name: "",
  category: "기타",
  area: "",
  address: "",
  memo: "",
  tags: [],
  hasVisited: false,
  imagePath: null,
  imagePaths: [],
  imageSourceUrl: null,
  imageCredit: null,
  imageCandidates: [],
  naverUrl: "https://map.naver.com/",
  latitude: null,
  longitude: null,
  sortOrder: 0,
  isVisible: true,
};

function guessArea(address: string) {
  const parts = address.split(" ").filter(Boolean);
  return parts[1] ?? parts[0] ?? "";
}

export function RestaurantForm({
  mode,
  initialRestaurant,
  isConfigured,
  isStorageConfigured,
}: {
  mode: "create" | "edit";
  initialRestaurant?: Restaurant;
  isConfigured: boolean;
  isStorageConfigured: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<RestaurantInput>(() =>
    initialRestaurant
      ? {
          name: initialRestaurant.name,
          category: initialRestaurant.category,
          area: initialRestaurant.area,
          address: initialRestaurant.address,
          memo: initialRestaurant.memo,
          tags: initialRestaurant.tags,
          hasVisited: initialRestaurant.hasVisited,
          imagePath: initialRestaurant.imagePath,
          imagePaths: initialRestaurant.imagePaths,
          imageSourceUrl: initialRestaurant.imageSourceUrl,
          imageCredit: initialRestaurant.imageCredit,
          imageCandidates: initialRestaurant.imageCandidates,
          naverUrl: initialRestaurant.naverUrl,
          latitude: initialRestaurant.latitude,
          longitude: initialRestaurant.longitude,
          sortOrder: initialRestaurant.sortOrder,
          isVisible: initialRestaurant.isVisible,
        }
      : emptyForm,
  );
  const [searchTerm, setSearchTerm] = useState(initialRestaurant?.name ?? "");
  const [searchResults, setSearchResults] = useState<NaverPlaceSearchResult[]>([]);
  const [searchError, setSearchError] = useState("");
  const [formError, setFormError] = useState("");
  const [imagePreviews, setImagePreviews] = useState<string[]>(
    initialRestaurant?.imageUrls.length
      ? initialRestaurant.imageUrls.slice(0, MAX_IMAGES)
      : initialRestaurant?.imageUrl
        ? [initialRestaurant.imageUrl]
        : [],
  );
  const [isPlaceSearchOpen, setIsPlaceSearchOpen] = useState(mode === "create");
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(mode === "create" || imagePreviews.length === 0);
  const [selectedOfficialImages, setSelectedOfficialImages] = useState<string[]>([]);
  const [selectedNaverImageIds, setSelectedNaverImageIds] = useState<string[]>([]);
  const [imageCandidates, setImageCandidates] = useState<NaverImageCandidate[]>([]);
  const [imageSearchError, setImageSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [isImportingImage, setIsImportingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function updateText(field: "name" | "category" | "area" | "address" | "memo" | "naverUrl", value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "category" ? { tags: getNaverCategoryTags(value, value) } : {}),
    }));
  }

  async function searchNaverPlaces() {
    setSearchError("");

    if (searchTerm.trim().length < 2) {
      setSearchError("가게명이나 지역을 2자 이상 입력해 주세요.");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/naver/places?query=${encodeURIComponent(searchTerm.trim())}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { items?: NaverPlaceSearchResult[]; error?: string };

      if (!response.ok) {
        setSearchError(payload.error ?? "검색에 실패했습니다.");
        return;
      }

      setSearchResults(payload.items ?? []);
      if (!payload.items?.length) setSearchError("검색 결과가 없어요. 다른 검색어를 입력해 보세요.");
    } catch {
      setSearchError("검색 서버에 연결하지 못했습니다.");
    } finally {
      setIsSearching(false);
    }
  }

  function selectPlace(place: NaverPlaceSearchResult) {
    const address = place.roadAddress || place.address;
    const category = place.category.trim() || "기타";
    setForm((previous) => ({
      ...previous,
      name: place.name,
      category,
      area: guessArea(address),
      address,
      tags: getNaverCategoryTags(place.category, category),
      naverUrl: place.mapUrl,
      latitude: place.latitude,
      longitude: place.longitude,
    }));
    setSearchTerm(place.name);
    setSearchResults([]);
    setSearchError("");
    setImageCandidates([]);
    setImageSearchError("");
    if (isConfigured) {
      void searchNaverImages([place.name, address].filter(Boolean).join(" "));
    }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;
    if (!isStorageConfigured) {
      setFormError("이미지를 업로드하려면 R2 환경변수를 먼저 설정해 주세요.");
      return;
    }
    const remainingSlots = MAX_IMAGES - form.imagePaths.length;
    if (remainingSlots <= 0) {
      setFormError("이미지는 최대 3장까지 등록할 수 있습니다.");
      return;
    }
    if (selectedFiles.some((file) => !ALLOWED_IMAGE_TYPES.has(file.type))) {
      setFormError("JPG, PNG, WEBP 이미지 파일만 업로드할 수 있어요.");
      return;
    }
    if (selectedFiles.some((file) => file.size > 5 * 1024 * 1024)) {
      setFormError("이미지는 장당 5MB 이하로 업로드해 주세요.");
      return;
    }

    const files = selectedFiles.slice(0, remainingSlots);
    const wasLimited = selectedFiles.length > files.length;
    setFormError(wasLimited ? "이미지는 최대 3장까지만 저장됩니다." : "");
    setIsUploading(true);
    try {
      const results = await Promise.allSettled(
        files.map(async (file) => {
          const { imagePath, imageUrl, uploadUrl } = await createImageUploadUrl(file.type);
          const response = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!response.ok) throw new Error("R2 이미지 업로드에 실패했습니다.");

          return {
            path: imagePath,
            url: imageUrl,
          };
        }),
      );
      const uploaded = results
        .filter((result): result is PromiseFulfilledResult<{ path: string; url: string }> => result.status === "fulfilled")
        .map((result) => result.value);
      const failed = results.find((result) => result.status === "rejected");

      if (failed) {
        if (uploaded.length > 0) {
          await deleteUploadedImages(uploaded.map(({ path }) => path));
        }
        throw failed.reason instanceof Error ? failed.reason : new Error("이미지 업로드에 실패했습니다.");
      }

      const uploadedPaths = uploaded.map(({ path }) => path);
      const uploadedUrls = uploaded.map(({ url }) => url);
      setForm((previous) => ({
        ...previous,
        imagePath: [...previous.imagePaths, ...uploadedPaths][0] ?? null,
        imagePaths: [...previous.imagePaths, ...uploadedPaths].slice(0, MAX_IMAGES),
        imageSourceUrl: null,
        imageCredit: null,
      }));
      setImagePreviews((previous) => [...previous, ...uploadedUrls].slice(0, MAX_IMAGES));
      setSelectedOfficialImages([]);
      setSelectedNaverImageIds([]);
    } catch (uploadError) {
      setFormError(`이미지를 업로드하지 못했습니다: ${uploadError instanceof Error ? uploadError.message : ""}`);
    } finally {
      setIsUploading(false);
    }
  }

  function removeImage(index: number) {
    setForm((previous) => ({
      ...previous,
      imagePath: previous.imagePaths.filter((_, imageIndex) => imageIndex !== index)[0] ?? null,
      imagePaths: previous.imagePaths.filter((_, imageIndex) => imageIndex !== index),
      ...(previous.imagePaths.length <= 1 ? { imageSourceUrl: null, imageCredit: null } : {}),
    }));
    setImagePreviews((previous) => previous.filter((_, imageIndex) => imageIndex !== index));
  }

  async function searchNaverImages(searchQuery?: string) {
    setImageSearchError("");

    const query = searchQuery ?? [form.name.trim(), form.address.trim()].filter(Boolean).join(" ");
    if (query.trim().length < 2) {
      setImageSearchError("가게 이름과 주소를 먼저 입력해 주세요.");
      return;
    }

    setIsSearchingImages(true);
    try {
      const response = await fetch(`/api/naver/images?query=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { items?: NaverImageCandidate[]; error?: string };

      if (!response.ok) {
        setImageSearchError(payload.error ?? "이미지 검색에 실패했습니다.");
        return;
      }

      setImageCandidates(payload.items ?? []);
      if (!payload.items?.length) setImageSearchError("이미지 후보가 없습니다. 가게 이름을 조금 바꿔 검색해 보세요.");
    } catch {
      setImageSearchError("이미지 검색 서버에 연결하지 못했습니다.");
    } finally {
      setIsSearchingImages(false);
    }
  }

  async function selectNaverImage(candidate: NaverImageCandidate) {
    if (form.imagePaths.length >= MAX_IMAGES) {
      setFormError("이미지는 최대 3장까지 선택할 수 있습니다.");
      return;
    }
    setImageSearchError("");
    setFormError("");
    setIsImportingImage(true);

    try {
      const result = await importImageFromNaver(candidate.thumbnailUrl);
      setForm((previous) => {
        const imagePaths = [...previous.imagePaths, result.imagePath].slice(0, MAX_IMAGES);
        return {
          ...previous,
          imagePath: imagePaths[0] ?? null,
          imagePaths,
          imageSourceUrl: previous.imageSourceUrl ?? candidate.sourceUrl,
          imageCredit: previous.imageCredit ?? candidate.title,
        };
      });
      setImagePreviews((previous) => [...previous, result.imageUrl].slice(0, MAX_IMAGES));
      setSelectedNaverImageIds((previous) => Array.from(new Set([...previous, candidate.id])));
    } catch (actionError) {
      setFormError(actionError instanceof Error ? actionError.message : "네이버 이미지를 저장하지 못했습니다.");
    } finally {
      setIsImportingImage(false);
    }
  }

  async function selectOfficialImage(imageUrl: string) {
    if (form.imagePaths.length >= MAX_IMAGES) {
      setFormError("이미지는 최대 3장까지 선택할 수 있습니다.");
      return;
    }
    setImageSearchError("");
    setFormError("");
    setIsImportingImage(true);

    try {
      const result = await importImageFromNaver(imageUrl);
      setForm((previous) => ({
        ...previous,
        imagePath: [...previous.imagePaths, result.imagePath][0] ?? null,
        imagePaths: [...previous.imagePaths, result.imagePath].slice(0, MAX_IMAGES),
        imageSourceUrl: previous.imageSourceUrl ?? initialRestaurant?.naverUrl ?? null,
        imageCredit: previous.imageCredit ?? (initialRestaurant?.naverUrl ? "네이버 장소 등록 이미지" : null),
      }));
      setImagePreviews((previous) => [...previous, result.imageUrl].slice(0, MAX_IMAGES));
      setSelectedOfficialImages((previous) => Array.from(new Set([...previous, imageUrl])));
    } catch (actionError) {
      setFormError(actionError instanceof Error ? actionError.message : "네이버 장소 이미지를 저장하지 못했습니다.");
    } finally {
      setIsImportingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!isConfigured) {
      setFormError("Supabase 환경변수를 먼저 설정해 주세요.");
      return;
    }

    setIsSaving(true);
    const payload: RestaurantInput = {
      ...form,
      tags: form.tags,
    };

    try {
      if (mode === "create") {
        await createRestaurant(payload);
      } else if (initialRestaurant) {
        await updateRestaurant(initialRestaurant.id, payload);
      }

      router.push("/admin");
      router.refresh();
    } catch (actionError) {
      setFormError(actionError instanceof Error ? actionError.message : "저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  const isCompact = mode === "edit";
  const formSectionClass = isCompact
    ? "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_35px_-28px_rgba(20,32,51,0.35)] sm:p-5"
    : "rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_-35px_rgba(20,32,51,0.35)] sm:p-7";
  const contentSpacingClass = isCompact ? "mt-4" : "mt-6";
  const fieldClass = isCompact ? compactInputClass : inputClass;

  return (
    <form className={isCompact ? "space-y-4" : "space-y-8"} onSubmit={handleSubmit}>
      <details className={formSectionClass} onToggle={(event) => setIsPlaceSearchOpen(event.currentTarget.open)} open={isPlaceSearchOpen}>
        <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black tracking-[0.22em] text-[#2f6fed]">NAVER PLACE SEARCH</p>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.05em] text-slate-900">장소를 먼저 찾아보세요.</h2>
            <p className="mt-2 text-sm text-slate-500">검색 결과를 선택하면 기본 정보가 자동으로 채워집니다.</p>
          </div>
          </div>
        </summary>

        <div className={`${contentSpacingClass} flex flex-col gap-3 sm:flex-row`}>
          <input
            className={`${isCompact ? "h-11 rounded-xl px-3" : "h-13 rounded-2xl px-4"} flex-1 border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8eaff4] focus:bg-white focus:ring-4 focus:ring-[#edf3ff]`}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchNaverPlaces();
              }
            }}
            placeholder="예: 성수 카페, 망원 국수"
            value={searchTerm}
          />
          <button
            className={`${isCompact ? "h-11 rounded-xl px-4" : "h-13 rounded-2xl px-5"} bg-[#142033] text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={isSearching || !isConfigured}
            onClick={() => {
              void searchNaverPlaces();
            }}
            type="button"
          >
            {isSearching ? "검색 중..." : "네이버 검색"}
          </button>
        </div>

        {searchError ? <p className="mt-3 text-sm text-rose-600">{searchError}</p> : null}
        {searchResults.length > 0 ? (
          <div className={`${isCompact ? "mt-3 rounded-xl" : "mt-4 rounded-2xl"} divide-y divide-slate-100 overflow-hidden border border-slate-200`}>
            {searchResults.map((place) => (
              <button
                className={`${isCompact ? "px-3 py-3" : "px-4 py-4"} block w-full text-left transition hover:bg-[#f8faff]`}
                key={place.id}
                onClick={() => selectPlace(place)}
                type="button"
              >
                <span className="block font-bold text-slate-800">{place.name}</span>
                <span className="mt-1 block text-xs text-slate-400">{place.category} · {place.roadAddress || place.address}</span>
              </button>
            ))}
          </div>
        ) : null}
      </details>

      <section className={formSectionClass}>
        <div>
          <p className="text-xs font-black tracking-[0.22em] text-slate-400">CURATION DETAILS</p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.05em] text-slate-900">나만의 설명을 더해보세요.</h2>
        </div>

        <div className={`${contentSpacingClass} grid gap-3 sm:grid-cols-2 sm:gap-4`}>
          <label className="sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">가게 이름</span>
            <input className={fieldClass} onChange={(event) => updateText("name", event.target.value)} required value={form.name} />
          </label>

          <label>
            <span className="text-xs font-bold text-slate-600">카테고리</span>
            <select className={fieldClass} onChange={(event) => updateText("category", event.target.value)} value={form.category}>
              {Array.from(new Set([...RESTAURANT_CATEGORIES, form.category])).map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-xs font-bold text-slate-600">지역</span>
            <input className={fieldClass} onChange={(event) => updateText("area", event.target.value)} placeholder="예: 성수, 연남" value={form.area} />
          </label>

          <label className="sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">주소</span>
            <input className={fieldClass} onChange={(event) => updateText("address", event.target.value)} required value={form.address} />
          </label>

          <label className="sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">추천 메모</span>
            <textarea
              className={`${isCompact ? "min-h-24 rounded-xl px-3" : "min-h-32 rounded-2xl px-4"} mt-2 w-full resize-y border border-slate-200 bg-white py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8eaff4] focus:ring-4 focus:ring-[#edf3ff]`}
              onChange={(event) => updateText("memo", event.target.value)}
              placeholder="왜 좋아하는 곳인지, 누구와 가기 좋은지 적어보세요."
              value={form.memo}
            />
          </label>

          <label className={`sm:col-span-2 flex cursor-pointer items-start border border-[#dce8ff] bg-[#f7faff] ${isCompact ? "gap-2 rounded-xl p-3" : "gap-3 rounded-2xl p-4"} transition hover:border-[#b8cffb]`}>
            <input
              checked={form.hasVisited}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#2f6fed]"
              onChange={(event) => {
                setForm((previous) => ({ ...previous, hasVisited: event.target.checked }));
              }}
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-bold text-slate-800">진수가 가본 식당</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">체크하면 공개 화면에 ‘{getVisitTag(true)}’ 태그가 자동으로 표시됩니다.</span>
            </span>
          </label>

          <div className="sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">네이버 분류</span>
            {form.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.tags.map((tag) => (
                  <span className="rounded-full bg-[#e3edff] px-2.5 py-1.5 text-xs font-semibold text-[#2f6fed]" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-400">
                네이버 검색 결과를 선택하면 장소 분류가 자동으로 채워집니다.
              </div>
            )}
            <span className="mt-2 block text-xs text-slate-400">관리자가 직접 입력하지 않고 네이버 장소 분류에서 자동 생성됩니다.</span>
          </div>

          <label className="sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">네이버 지도 링크</span>
            <input className={fieldClass} onChange={(event) => updateText("naverUrl", event.target.value)} required type="url" value={form.naverUrl} />
          </label>
        </div>
      </section>

      <details className={formSectionClass} onToggle={(event) => setIsImageManagerOpen(event.currentTarget.open)} open={isImageManagerOpen}>
        <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.22em] text-slate-400">COVER IMAGE</p>
              <h2 className="mt-1 text-xl font-bold tracking-[-0.05em] text-slate-900">대표 사진 관리</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {imagePreviews.length}/{MAX_IMAGES}장 등록됨 · 펼쳐서 사진을 추가하거나 교체하세요.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">열기</span>
          </div>
        </summary>

        <div className={`${contentSpacingClass} flex flex-col gap-4 sm:flex-row sm:items-start`}>
          <div className={`grid w-full gap-2 ${imagePreviews.length === 1 ? "max-w-xs grid-cols-1" : "max-w-sm grid-cols-2"}`}>
            {imagePreviews.length > 0 ? (
              imagePreviews.map((imageUrl, index) => (
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#edf3ff]" key={`${imageUrl}-${index}`}>
                  <Image alt={`대표 이미지 ${index + 1} 미리보기`} className="object-cover" fill sizes="(max-width: 640px) 45vw, 176px" src={imageUrl} />
                  <button
                    aria-label={`이미지 ${index + 1} 제거`}
                    className="absolute right-2 top-2 rounded-full bg-slate-950/70 px-2 py-1 text-[0.65rem] font-bold text-white transition hover:bg-slate-950"
                    onClick={() => removeImage(index)}
                    type="button"
                  >
                    제거
                  </button>
                </div>
              ))
            ) : (
              <div className="relative col-span-2 flex aspect-[1.45/1] items-center justify-center overflow-hidden rounded-2xl bg-[#edf3ff]">
                <UtensilsCrossed aria-hidden="true" className="h-12 w-12 text-slate-500" strokeWidth={1.6} />
              </div>
            )}
          </div>
          <div className="flex min-w-40 flex-col items-start gap-3">
            <p className="text-xs font-bold text-slate-500">{imagePreviews.length}/{MAX_IMAGES}장 등록됨</p>
            <label className={`cursor-pointer rounded-xl bg-[#142033] px-4 py-3 text-xs font-bold text-white transition hover:bg-slate-700 ${imagePreviews.length >= MAX_IMAGES ? "pointer-events-none opacity-50" : ""}`}>
              {isUploading ? "업로드 중..." : "이미지 추가"}
              <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isUploading || isImportingImage || !isStorageConfigured || imagePreviews.length >= MAX_IMAGES} multiple onChange={uploadImage} type="file" />
            </label>
            <p className="text-xs leading-5 text-slate-400">이미지는 최대 3장, 장당 5MB까지 등록할 수 있습니다.</p>
          </div>
        </div>

        {form.imageCandidates.length > 0 ? (
          <div className={`${isCompact ? "mt-5 pt-4" : "mt-7 pt-6"} border-t border-slate-100`}>
            <div>
              <p className="text-sm font-bold text-slate-800">네이버 장소 등록 사진</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">저장 리스트에서 가져온 공식 사진 후보입니다.</p>
            </div>
            <div className={`${isCompact ? "mt-3 gap-2" : "mt-4 gap-3"} grid grid-cols-2 sm:max-w-md sm:grid-cols-3`}>
              {form.imageCandidates.map((candidate, index) => {
                const isSelected = selectedOfficialImages.includes(candidate);

                return (
                  <button
                    aria-label={`네이버 장소 사진 ${index + 1} 선택`}
                    className={`overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-60 ${isSelected ? "border-[#2f6fed] ring-2 ring-[#dce8ff]" : "border-slate-200"}`}
                    disabled={isImportingImage || isUploading || !isStorageConfigured || imagePreviews.length >= MAX_IMAGES || isSelected}
                    key={candidate}
                    onClick={() => {
                      void selectOfficialImage(candidate);
                    }}
                    type="button"
                  >
                    <div className="relative aspect-square bg-slate-100">
                      <Image alt="" className="object-cover" fill sizes="(max-width: 640px) 33vw, 128px" src={candidate} />
                      {isSelected ? <span className="absolute left-2 top-2 rounded-full bg-[#2f6fed] px-2 py-1 text-[0.6rem] font-bold text-white">선택됨</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className={`${isCompact ? "mt-5 pt-4" : "mt-7 pt-6"} border-t border-slate-100`}>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold text-slate-800">네이버 추천 이미지</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">장소를 선택하면 자동으로 후보를 불러옵니다. 선택한 이미지는 내 Storage로 복사됩니다.</p>
              <p className="mt-1 text-[0.68rem] leading-5 text-amber-600">사용 전에 이미지 출처와 사용 권한을 확인해 주세요.</p>
            </div>
            <button
              className="h-10 rounded-xl border border-[#cbdafa] bg-[#f7faff] px-3.5 text-xs font-bold text-[#2f6fed] transition hover:border-[#9db9f5] hover:bg-[#edf3ff] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSearchingImages || isImportingImage || !isConfigured}
              onClick={() => {
                void searchNaverImages();
              }}
              type="button"
            >
              {isSearchingImages ? "후보 불러오는 중..." : "네이버 후보 불러오기"}
            </button>
          </div>

          {imageSearchError ? <p className="mt-3 text-xs leading-5 text-rose-600">{imageSearchError}</p> : null}
          {imageCandidates.length > 0 ? (
            <div className={`${isCompact ? "mt-3 gap-2" : "mt-4 gap-3"} grid grid-cols-2 sm:grid-cols-4`}>
              {imageCandidates.map((candidate) => {
                const isSelected = selectedNaverImageIds.includes(candidate.id);

                return (
                  <button
                    aria-label={`${candidate.title} 이미지 선택`}
                    className={`overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-60 ${isSelected ? "border-[#2f6fed] ring-2 ring-[#dce8ff]" : "border-slate-200"}`}
                    disabled={isImportingImage || isUploading || !isStorageConfigured || imagePreviews.length >= MAX_IMAGES || isSelected}
                    key={candidate.id}
                    onClick={() => {
                      void selectNaverImage(candidate);
                    }}
                    type="button"
                  >
                    <div className="relative aspect-square bg-slate-100">
                      <Image alt="" className="object-cover" fill sizes="(max-width: 640px) 50vw, 160px" src={candidate.thumbnailUrl} />
                      {isSelected ? <span className="absolute left-2 top-2 rounded-full bg-[#2f6fed] px-2 py-1 text-[0.6rem] font-bold text-white">선택됨</span> : null}
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-[0.68rem] font-bold text-slate-700">{candidate.title || "네이버 이미지"}</p>
                      {candidate.width && candidate.height ? <p className="mt-1 text-[0.6rem] text-slate-400">{candidate.width} × {candidate.height}</p> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </details>

      {formError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-600" role="alert">{formError}</p> : null}

      <div className={isCompact ? "sticky bottom-3 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:justify-end" : "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"}>
        <Link className={`${isCompact ? "h-11 rounded-xl px-4" : "h-13 rounded-2xl px-5"} flex items-center justify-center border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:border-slate-300`} href="/admin">
          취소
        </Link>
        <button className={`${isCompact ? "h-11 rounded-xl px-6" : "h-13 rounded-2xl px-7"} bg-[#2f6fed] text-sm font-bold text-white shadow-lg shadow-blue-500/15 transition hover:bg-[#255ac8] disabled:cursor-not-allowed disabled:opacity-50`} disabled={isSaving || isUploading} type="submit">
          {isSaving ? "저장 중..." : mode === "create" ? "맛집 등록하기" : "변경사항 저장"}
        </button>
      </div>
    </form>
  );
}
