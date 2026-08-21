"use server";

import { revalidatePath } from "next/cache";

import { storeNaverImage } from "@/lib/naver-image-storage";
import { isTrustedNaverImageUrl } from "@/lib/naver-images";
import { STORAGE_BUCKET } from "@/lib/constants";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { NaverSavedPlace, RestaurantInput } from "@/lib/types";

const MAX_IMPORT_COUNT = 5000;
const DUPLICATE_CHECK_BATCH_SIZE = 50;
const DUPLICATE_CHECK_CONCURRENCY = 4;
const IMAGE_IMPORT_CONCURRENCY = 4;
const OFFICIAL_IMAGE_CREDIT = "네이버 장소 등록 이미지";

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanTags(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((tag) => cleanText(tag, 30))
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

function cleanCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function cleanImageCandidates(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((candidate) => cleanText(candidate, 1000))
        .filter((candidate) => isTrustedNaverImageUrl(candidate)),
    ),
  ).slice(0, 3);
}

function cleanImagePaths(value: unknown, legacyPath: unknown) {
  const paths = Array.isArray(value)
    ? value.map((path) => cleanText(path, 300)).filter(Boolean)
    : [];
  const fallbackPath = legacyPath ? cleanText(legacyPath, 300) : "";

  return Array.from(new Set([...paths, fallbackPath].filter(Boolean))).slice(0, 3);
}

function cleanImageImportUrl(value: unknown) {
  const candidate = cleanText(value, 1000);
  return candidate && isTrustedNaverImageUrl(candidate) ? candidate : null;
}

function validateRestaurantInput(input: RestaurantInput): RestaurantInput {
  const name = cleanText(input.name, 100);
  const category = cleanText(input.category, 120);
  const area = cleanText(input.area, 50);
  const address = cleanText(input.address, 200);
  const memo = cleanText(input.memo, 1200);
  const naverUrl = cleanText(input.naverUrl, 500);
  const imageSourceUrl = input.imageSourceUrl ? cleanText(input.imageSourceUrl, 1000) : null;
  const imageCredit = input.imageCredit ? cleanText(input.imageCredit, 300) : null;
  const imageCandidates = cleanImageCandidates(input.imageCandidates);
  const imagePaths = cleanImagePaths(input.imagePaths, input.imagePath);
  const imageImportUrl = cleanImageImportUrl(input.imageImportUrl);

  if (name.length < 2) throw new Error("가게 이름을 2자 이상 입력해 주세요.");
  if (!category) throw new Error("카테고리를 입력해 주세요.");
  if (!address) throw new Error("주소를 입력해 주세요.");

  try {
    const url = new URL(naverUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error("네이버 지도 링크가 올바르지 않습니다.");
  }

  if (imageSourceUrl) {
    try {
      const url = new URL(imageSourceUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      throw new Error("이미지 출처 링크가 올바르지 않습니다.");
    }
  }

  return {
    name,
    category,
    area,
    address,
    memo,
    tags: cleanTags(input.tags),
    imagePath: imagePaths[0] ?? null,
    imagePaths,
    imageSourceUrl,
    imageCredit,
    imageCandidates,
    imageImportUrl,
    naverUrl,
    latitude: cleanCoordinate(input.latitude),
    longitude: cleanCoordinate(input.longitude),
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
    isVisible: Boolean(input.isVisible),
  };
}

export async function createRestaurant(input: RestaurantInput) {
  await requireAdmin();
  const restaurant = validateRestaurantInput(input);
  const supabase = await createClient();

  const { error } = await supabase.from("restaurants").insert({
    name: restaurant.name,
    category: restaurant.category,
    area: restaurant.area,
    address: restaurant.address,
    memo: restaurant.memo,
    tags: restaurant.tags,
    image_path: restaurant.imagePath,
    image_paths: restaurant.imagePaths,
    image_source_url: restaurant.imageSourceUrl,
    image_credit: restaurant.imageCredit,
    image_candidates: restaurant.imageCandidates,
    naver_url: restaurant.naverUrl,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    sort_order: restaurant.sortOrder,
    is_visible: restaurant.isVisible,
  });

  if (error) throw new Error(`맛집을 저장하지 못했습니다: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/admin");
}

async function prepareImportedImages(restaurants: RestaurantInput[]) {
  let imageImportedCount = 0;
  let imageMissingCount = 0;
  const prepared: Array<{ restaurant: RestaurantInput; imagePaths: string[] }> = [];

  for (let index = 0; index < restaurants.length; index += IMAGE_IMPORT_CONCURRENCY) {
    const batch = restaurants.slice(index, index + IMAGE_IMPORT_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (restaurant) => {
        if (restaurant.imagePaths.length > 0) {
          return { restaurant, imagePaths: restaurant.imagePaths, imageImported: false };
        }

        const candidates = Array.from(
          new Set(
            [restaurant.imageImportUrl, ...restaurant.imageCandidates].filter(
              (candidate): candidate is string => Boolean(candidate),
            ),
          ),
        );
        let imagePath: string | null = null;

        for (const candidate of candidates) {
          try {
            const stored = await storeNaverImage(candidate);
            imagePath = stored.imagePath;
            break;
          } catch {
            // Try the next official thumbnail. A missing image must not block place import.
          }
        }

        return { restaurant, imagePaths: imagePath ? [imagePath] : [], imageImported: Boolean(imagePath) };
      }),
    );

    for (const result of results) {
      prepared.push({ restaurant: result.restaurant, imagePaths: result.imagePaths });
      if (result.imageImported) imageImportedCount += 1;
      if (result.imagePaths.length === 0) imageMissingCount += 1;
    }
  }

  return { prepared, imageImportedCount, imageMissingCount };
}

export async function importRestaurants(inputs: RestaurantInput[]) {
  await requireAdmin();

  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("가져올 맛집을 하나 이상 선택해 주세요.");
  }
  if (inputs.length > MAX_IMPORT_COUNT) {
    throw new Error(`한 번에 가져올 수 있는 맛집은 ${MAX_IMPORT_COUNT.toLocaleString()}곳까지입니다.`);
  }

  const validated: RestaurantInput[] = [];
  let invalidCount = 0;

  for (const input of inputs) {
    try {
      validated.push(validateRestaurantInput(input));
    } catch {
      invalidCount += 1;
    }
  }

  const seenUrls = new Set<string>();
  const uniqueRestaurants = validated.filter((restaurant) => {
    if (seenUrls.has(restaurant.naverUrl)) return false;
    seenUrls.add(restaurant.naverUrl);
    return true;
  });
  let skippedCount = validated.length - uniqueRestaurants.length;

  const supabase = await createClient();
  const existingUrls = new Set<string>();

  if (uniqueRestaurants.length > 0) {
    for (
      let index = 0;
      index < uniqueRestaurants.length;
      index += DUPLICATE_CHECK_BATCH_SIZE * DUPLICATE_CHECK_CONCURRENCY
    ) {
      const batches = Array.from({ length: DUPLICATE_CHECK_CONCURRENCY }, (_, batchIndex) =>
        uniqueRestaurants.slice(
          index + batchIndex * DUPLICATE_CHECK_BATCH_SIZE,
          index + (batchIndex + 1) * DUPLICATE_CHECK_BATCH_SIZE,
        ),
      ).filter((batch) => batch.length > 0);

      const results = await Promise.all(
        batches.map(async (batch) => {
          const { data, error } = await supabase
            .from("restaurants")
            .select("naver_url")
            .in(
              "naver_url",
              batch.map((restaurant) => restaurant.naverUrl),
            );

          if (error) throw new Error(`기존 맛집 중복 확인에 실패했습니다. ${error.message}`);
          return data ?? [];
        }),
      );

      for (const rows of results) {
        for (const row of rows) existingUrls.add(row.naver_url);
      }
    }
  }

  const restaurantsToInsert = uniqueRestaurants
    .filter((restaurant) => {
      if (existingUrls.has(restaurant.naverUrl)) {
        skippedCount += 1;
        return false;
      }
      return true;
  });
  const { prepared, imageImportedCount, imageMissingCount } = await prepareImportedImages(restaurantsToInsert);
  const uploadedImagePaths = prepared
    .filter(({ restaurant }) => restaurant.imagePaths.length === 0)
    .flatMap(({ imagePaths }) => imagePaths);
  const rows = prepared.map(({ restaurant, imagePaths }) => ({
      name: restaurant.name,
      category: restaurant.category,
      area: restaurant.area,
      address: restaurant.address,
      memo: restaurant.memo,
      tags: restaurant.tags,
      image_path: imagePaths[0] ?? null,
      image_paths: imagePaths,
      image_source_url: restaurant.imageSourceUrl,
      image_credit: restaurant.imageCredit,
      image_candidates: restaurant.imageCandidates,
      naver_url: restaurant.naverUrl,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      sort_order: restaurant.sortOrder,
      is_visible: restaurant.isVisible,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("restaurants").insert(rows);
    if (error && uploadedImagePaths.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(uploadedImagePaths);
    }
    if (error) throw new Error(`맛집 일괄 등록에 실패했습니다. ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/import");

  return {
    insertedCount: rows.length,
    invalidCount,
    skippedCount,
    imageImportedCount,
    imageMissingCount,
  };
}

export async function refreshRestaurantCategories(places: NaverSavedPlace[]) {
  await requireAdmin();

  if (!Array.isArray(places) || places.length === 0) {
    throw new Error("업데이트할 장소가 없습니다.");
  }
  if (places.length > MAX_IMPORT_COUNT) {
    throw new Error(`한 번에 업데이트할 장소는 ${MAX_IMPORT_COUNT.toLocaleString()}곳까지입니다.`);
  }

  const supabase = await createClient();
  let updatedCount = 0;
  const updatedAt = new Date().toISOString();

  for (let index = 0; index < places.length; index += 20) {
    const batch = places.slice(index, index + 20);
    const results = await Promise.all(
      batch.map(async (place) => {
        const { data, error } = await supabase
          .from("restaurants")
          .update({
            category: cleanText(place.category, 120) || "기타",
            tags: Array.from(new Set(place.tags.map((tag) => cleanText(tag, 30)).filter(Boolean))).slice(0, 12),
            updated_at: updatedAt,
          })
          .eq("naver_url", cleanText(place.naverUrl, 500))
          .select("naver_url");

        if (error) throw new Error(`기존 맛집 분류를 업데이트하지 못했습니다: ${error.message}`);
        return data?.length ?? 0;
      }),
    );

    updatedCount += results.reduce((total, count) => total + count, 0);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/import");

  return { updatedCount };
}

export async function refreshRestaurantPhotos(places: NaverSavedPlace[]) {
  await requireAdmin();

  if (!Array.isArray(places) || places.length === 0) {
    throw new Error("보완할 장소가 없습니다.");
  }
  if (places.length > MAX_IMPORT_COUNT) {
    throw new Error(`한 번에 보완할 장소는 ${MAX_IMPORT_COUNT.toLocaleString()}개까지입니다.`);
  }

  const supabase = await createClient();
  const existingByUrl = new Map<string, {
    id: string;
    naver_url: string;
    image_path: string | null;
    image_paths: string[];
    image_candidates: string[];
  }>();

  for (let index = 0; index < places.length; index += DUPLICATE_CHECK_BATCH_SIZE * DUPLICATE_CHECK_CONCURRENCY) {
    const batches = Array.from({ length: DUPLICATE_CHECK_CONCURRENCY }, (_, batchIndex) =>
      places.slice(
        index + batchIndex * DUPLICATE_CHECK_BATCH_SIZE,
        index + (batchIndex + 1) * DUPLICATE_CHECK_BATCH_SIZE,
      ),
    ).filter((batch) => batch.length > 0);
    const results = await Promise.all(
      batches.map(async (batch) => {
        const { data, error } = await supabase
          .from("restaurants")
          .select("id, naver_url, image_path, image_paths, image_candidates")
          .in("naver_url", batch.map((place) => cleanText(place.naverUrl, 500)));

        if (error) throw new Error(`기존 맛집 사진을 확인하지 못했습니다. ${error.message}`);
        return data ?? [];
      }),
    );

    for (const rows of results) {
      for (const row of rows) existingByUrl.set(row.naver_url, row);
    }
  }

  let updatedCount = 0;
  let imageImportedCount = 0;
  let imageMissingCount = 0;

  for (let index = 0; index < places.length; index += IMAGE_IMPORT_CONCURRENCY) {
    const batch = places.slice(index, index + IMAGE_IMPORT_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (place) => {
        const current = existingByUrl.get(cleanText(place.naverUrl, 500));
        if (!current) return { updated: 0, imageImported: false, imageMissing: false };

        const latestCandidates = cleanImageCandidates(place.imageUrls);
        const imageCandidates = latestCandidates.length
          ? latestCandidates
          : cleanImageCandidates(current.image_candidates);
        const currentImagePaths = Array.isArray(current.image_paths) && current.image_paths.length > 0
          ? current.image_paths
          : current.image_path
            ? [current.image_path]
            : [];
        let imagePath = currentImagePaths[0] ?? null;
        let imagePaths = currentImagePaths;
        let imageImported = false;

        if (!imagePath) {
          for (const candidate of imageCandidates) {
            try {
              const stored = await storeNaverImage(candidate);
              imagePath = stored.imagePath;
              imagePaths = [stored.imagePath];
              imageImported = true;
              break;
            } catch {
              // Keep trying the remaining official candidates.
            }
          }
        }

        const updatePayload = {
          category: cleanText(place.category, 120) || "기타",
          tags: cleanTags(place.tags),
          image_paths: imagePaths,
          image_candidates: imageCandidates,
          ...(currentImagePaths.length > 0 || !imagePath
            ? {}
            : {
                image_path: imagePath,
                image_source_url: cleanText(place.naverUrl, 500),
                image_credit: OFFICIAL_IMAGE_CREDIT,
              }),
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from("restaurants")
          .update(updatePayload)
          .eq("id", current.id)
          .select("id");

        if (error) {
          if (imageImported && imagePath) {
            await supabase.storage.from(STORAGE_BUCKET).remove([imagePath]);
          }
          throw new Error(`맛집 사진을 보완하지 못했습니다. ${error.message}`);
        }

        return {
          updated: data?.length ?? 0,
          imageImported,
          imageMissing: imagePaths.length === 0,
        };
      }),
    );

    for (const result of results) {
      updatedCount += result.updated;
      if (result.imageImported) imageImportedCount += 1;
      if (result.imageMissing) imageMissingCount += 1;
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/import");

  return { updatedCount, imageImportedCount, imageMissingCount };
}

export async function updateRestaurant(id: string, input: RestaurantInput) {
  await requireAdmin();
  const restaurant = validateRestaurantInput(input);
  const supabase = await createClient();

  const { data: previous, error: previousError } = await supabase
    .from("restaurants")
    .select("image_path, image_paths")
    .eq("id", id)
    .maybeSingle();

  if (previousError) throw new Error(`기존 맛집을 확인하지 못했습니다: ${previousError.message}`);

  const { error } = await supabase
    .from("restaurants")
    .update({
      name: restaurant.name,
      category: restaurant.category,
      area: restaurant.area,
      address: restaurant.address,
      memo: restaurant.memo,
      tags: restaurant.tags,
      image_path: restaurant.imagePath,
      image_paths: restaurant.imagePaths,
      image_source_url: restaurant.imageSourceUrl,
      image_credit: restaurant.imageCredit,
      image_candidates: restaurant.imageCandidates,
      naver_url: restaurant.naverUrl,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      sort_order: restaurant.sortOrder,
      is_visible: restaurant.isVisible,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`맛집을 수정하지 못했습니다: ${error.message}`);

  const previousPaths = Array.isArray(previous?.image_paths) && previous.image_paths.length > 0
    ? previous.image_paths
    : previous?.image_path
      ? [previous.image_path]
      : [];
  const nextPaths = new Set(restaurant.imagePaths);
  const pathsToRemove = Array.from(new Set(previousPaths.filter((path) => !nextPaths.has(path))));
  if (pathsToRemove.length > 0) {
    await supabase.storage.from(STORAGE_BUCKET).remove(pathsToRemove);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
}

export async function setRestaurantVisibility(id: string, isVisible: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ is_visible: Boolean(isVisible), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`공개 상태를 변경하지 못했습니다: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteRestaurant(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: restaurant, error: readError } = await supabase
    .from("restaurants")
    .select("image_path, image_paths")
    .eq("id", id)
    .maybeSingle();

  if (readError) throw new Error(`맛집을 확인하지 못했습니다: ${readError.message}`);

  const { error } = await supabase.from("restaurants").delete().eq("id", id);
  if (error) throw new Error(`맛집을 삭제하지 못했습니다: ${error.message}`);

  const imagePaths = Array.isArray(restaurant?.image_paths) && restaurant.image_paths.length > 0
    ? restaurant.image_paths
    : restaurant?.image_path
      ? [restaurant.image_path]
      : [];
  if (imagePaths.length > 0) {
    await supabase.storage.from(STORAGE_BUCKET).remove(Array.from(new Set(imagePaths)));
  }

  revalidatePath("/");
  revalidatePath("/admin");
}
