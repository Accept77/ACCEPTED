import { NextRequest, NextResponse } from "next/server";
import { request as httpsRequest } from "node:https";

import { getNaverCategoryTags } from "@/entities/restaurant/model/naver-categories";
import { isTrustedNaverImageUrl } from "@/shared/lib/naver-images";
import { getAdminStatus } from "@/shared/lib/supabase/auth";
import type { NaverSavedPlace } from "@/entities/restaurant/model/types";

export const runtime = "nodejs";

const NAVER_SAVED_LIST_PATTERN = /^\/p\/favorite\/sharedPlace\/folder\/([A-Za-z0-9_-]+)\/?$/;
const NAVER_HOSTS = new Set(["map.naver.com", "m.map.naver.com"]);
const MAX_PLACES = 5000;
const DETAIL_PAGE_SIZE = 20;
const PAGE_RETRY_DELAYS = [300, 900, 1800, 3000];
const DETAIL_RETRY_DELAYS = [200, 600];

type NaverSavedBookmark = {
  bookmarkId?: number | string;
  name?: string;
  displayName?: string;
  px?: number | string;
  py?: number | string;
  type?: string;
  sid?: number | string;
  address?: string;
  memo?: string;
  mcidName?: string;
  available?: boolean;
  placeInfo?: {
    category?: string;
    thumbnailUrls?: string[];
  } | null;
};

type NaverSavedListResponse = {
  folder?: {
    name?: string;
    bookmarkCount?: number;
    shareId?: string;
  };
  bookmarkList?: NaverSavedBookmark[];
};

function getShareId(url: URL) {
  if (!NAVER_HOSTS.has(url.hostname)) return null;
  return url.pathname.match(NAVER_SAVED_LIST_PATTERN)?.[1] ?? null;
}

async function resolveShareUrl(value: string) {
  const input = value.trim().startsWith("http") ? value.trim() : `https://${value.trim()}`;
  let current = new URL(input);

  if (!["http:", "https:"].includes(current.protocol)) {
    throw new Error("네이버 링크만 입력할 수 있습니다.");
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shareId = getShareId(current);
    if (shareId) return { shareId, canonicalUrl: current.toString() };

    if (current.hostname !== "naver.me") {
      throw new Error("네이버 공유 리스트 링크 형식이 아닙니다.");
    }

    const response = await fetch(current, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      redirect: "manual",
    });
    const location = response.headers.get("location");

    if (!location) {
      throw new Error("네이버 단축 링크를 확인하지 못했습니다.");
    }

    current = new URL(location, current);
  }

  throw new Error("네이버 공유 리스트 링크가 너무 많은 단계로 redirect됩니다.");
}

function toFiniteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeImageUrls(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter((item) => isTrustedNaverImageUrl(item)),
    ),
  ).slice(0, 3);
}

async function requestBookmarks({
  shareId,
  canonicalUrl,
  start,
  limit,
  includePlaceInfo,
  retryDelays,
}: {
  shareId: string;
  canonicalUrl: string;
  start: number;
  limit: number;
  includePlaceInfo: boolean;
  retryDelays: number[];
}) {
  const apiUrl = new URL(`https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/${encodeURIComponent(shareId)}/bookmarks`);
  apiUrl.searchParams.set("start", String(start));
  apiUrl.searchParams.set("limit", String(limit));
  apiUrl.searchParams.set("sort", "lastUseTime");
  if (includePlaceInfo) apiUrl.searchParams.set("placeInfo", "true");

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const request = httpsRequest(
          apiUrl,
          {
            headers: {
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
              "Accept-Encoding": "identity",
              Origin: "https://pages.map.naver.com",
              Referer: canonicalUrl,
              "User-Agent": "Mozilla/5.0",
            },
            timeout: 10000,
          },
          (incomingMessage) => {
            let body = "";
            incomingMessage.setEncoding("utf8");
            incomingMessage.on("data", (chunk) => {
              body += chunk;
            });
            incomingMessage.on("end", () => {
              resolve({ status: incomingMessage.statusCode ?? 0, body });
            });
            incomingMessage.on("error", reject);
          },
        );

        request.on("timeout", () => request.destroy(new Error("네이버 응답 시간이 초과되었습니다.")));
        request.on("error", reject);
        request.end();
      });

      if (response.status >= 200 && response.status < 300) {
        return JSON.parse(response.body) as NaverSavedListResponse;
      }

      // 네이버 내부 API가 간헐적으로 500/429를 반환하므로 짧게 재시도합니다.
      if (response.status < 500 && response.status !== 429) return null;
    } catch {
      // 네트워크 타임아웃도 다음 시도에서 회복될 수 있습니다.
    }

    const delay = retryDelays[attempt];
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return null;
}

async function fetchBookmarks(shareId: string, canonicalUrl: string) {
  return requestBookmarks({
    shareId,
    canonicalUrl,
    start: 0,
    limit: MAX_PLACES,
    includePlaceInfo: false,
    retryDelays: PAGE_RETRY_DELAYS,
  });
}

async function fetchDetailedPlaceInfo(
  shareId: string,
  canonicalUrl: string,
  bookmarks: NaverSavedBookmark[],
) {
  const starts: number[] = [];

  for (let start = 0; start < bookmarks.length; start += DETAIL_PAGE_SIZE) {
    if (bookmarks.slice(start, start + DETAIL_PAGE_SIZE).some((bookmark) => bookmark.type === "place")) {
      starts.push(start);
    }
  }

  const details = new Map<string, { category: string; imageUrls: string[] }>();

  // 상세 분류 요청은 20개 제한이 있어 몇 페이지씩만 병렬로 보강합니다.
  for (let index = 0; index < starts.length; index += 3) {
    const pages = await Promise.all(
      starts.slice(index, index + 3).map((start) =>
        requestBookmarks({
          shareId,
          canonicalUrl,
          start,
          limit: DETAIL_PAGE_SIZE,
          includePlaceInfo: true,
          retryDelays: DETAIL_RETRY_DELAYS,
        }),
      ),
    );

    for (const page of pages) {
      for (const bookmark of page?.bookmarkList ?? []) {
        const sid = String(bookmark.sid ?? "").trim();
        const category = String(bookmark.placeInfo?.category ?? "").trim();
        const imageUrls = normalizeImageUrls(bookmark.placeInfo?.thumbnailUrls);
        if (sid && (category || imageUrls.length > 0)) {
          details.set(sid, { category, imageUrls });
        }
      }
    }
  }

  return details;
}

function toSavedPlace(
  bookmark: NaverSavedBookmark,
  detailedInfo?: { category: string; imageUrls: string[] },
): NaverSavedPlace | null {
  if (bookmark.type !== "place") return null;

  const sid = String(bookmark.sid ?? "").trim();
  const name = String(bookmark.displayName || bookmark.name || "").trim();
  const address = String(bookmark.address || "").trim();

  if (!sid || !name || !address) return null;

  const category = String(detailedInfo?.category || bookmark.placeInfo?.category || bookmark.mcidName || "").trim() || "기타";
  const addressParts = address.split(/\s+/).filter(Boolean);
  const imageUrls = detailedInfo?.imageUrls.length
    ? detailedInfo.imageUrls
    : normalizeImageUrls(bookmark.placeInfo?.thumbnailUrls);

  return {
    id: sid,
    name,
    category,
    area: addressParts[1] || addressParts[0] || "",
    address,
    memo: String(bookmark.memo || "").trim(),
    tags: getNaverCategoryTags(category),
    imageUrls,
    naverUrl: `https://map.naver.com/p/entry/place/${encodeURIComponent(sid)}`,
    latitude: toFiniteNumber(bookmark.py),
    longitude: toFiniteNumber(bookmark.px),
  };
}

export async function GET(request: NextRequest) {
  const { isAdmin } = await getAdminStatus();
  if (!isAdmin) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const listUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!listUrl) {
    return NextResponse.json({ error: "네이버 저장 리스트 링크를 입력해 주세요." }, { status: 400 });
  }

  try {
    const { shareId, canonicalUrl } = await resolveShareUrl(listUrl);
    const payload = await fetchBookmarks(shareId, canonicalUrl);
    if (!payload) {
      return NextResponse.json(
        { error: "리스트를 읽지 못했습니다. 네이버에서 '일부 공개' 또는 '전체 공개'로 공유된 링크인지 확인해 주세요." },
        { status: 502 },
      );
    }

    const folder = payload.folder;
    const bookmarkList = payload.bookmarkList ?? [];
    const detailedPlaceInfo = await fetchDetailedPlaceInfo(shareId, canonicalUrl, bookmarkList);

    const seenIds = new Set<string>();
    const places = bookmarkList.reduce<NaverSavedPlace[]>((result, bookmark) => {
      const detailedInfo = detailedPlaceInfo.get(String(bookmark.sid ?? "").trim());
      const place = toSavedPlace(bookmark, detailedInfo);
      if (!place || seenIds.has(place.id)) return result;
      seenIds.add(place.id);
      result.push(place);
      return result;
    }, []);
    const total = Number(folder?.bookmarkCount ?? places.length);

    return NextResponse.json({
      folderName: folder?.name || "네이버 저장 리스트",
      places,
      shareId,
      total: Number.isFinite(total) ? total : places.length,
      skippedCount: bookmarkList.length - places.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "네이버 저장 리스트를 읽지 못했습니다." },
      { status: 400 },
    );
  }
}
