import { NextRequest, NextResponse } from "next/server";

import { getNaverApiConfig } from "@/shared/lib/config";
import { isTrustedNaverImageUrl } from "@/shared/lib/naver-images";
import { getAdminStatus } from "@/shared/lib/supabase/auth";
import type { NaverImageCandidate } from "@/entities/restaurant/model/types";

export const runtime = "nodejs";

const MAX_RESULTS = 8;

type NaverImageResponse = {
  items?: Array<{
    title?: string;
    link?: string;
    thumbnail?: string;
    sizeheight?: string | number;
    sizewidth?: string | number;
  }>;
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
}

function toDimension(value: string | number | undefined) {
  const dimension = Number(value);
  return Number.isFinite(dimension) && dimension > 0 ? dimension : null;
}

function toHttpsUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { isAdmin } = await getAdminStatus();
  if (!isAdmin) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ error: "이미지 검색어를 2자 이상 입력해 주세요." }, { status: 400 });
  }

  const apiConfig = getNaverApiConfig();
  if (!apiConfig) {
    return NextResponse.json(
      { error: "NAVER API HUB 환경변수가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const searchUrl = new URL("https://naverapihub.apigw.ntruss.com/search/v1/image");
  searchUrl.searchParams.set("query", query.slice(0, 200));
  searchUrl.searchParams.set("display", String(MAX_RESULTS));
  searchUrl.searchParams.set("sort", "sim");
  searchUrl.searchParams.set("format", "json");

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": apiConfig.clientId,
        "X-NCP-APIGW-API-KEY": apiConfig.clientSecret,
      },
      cache: "no-store",
    });

    if (response.status === 429) {
      return NextResponse.json({ error: "네이버 이미지 검색 한도를 초과했습니다." }, { status: 429 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: "네이버 이미지 검색에 실패했습니다." }, { status: 502 });
    }

    const payload = (await response.json()) as NaverImageResponse;
    const candidates = (payload.items ?? []).reduce<NaverImageCandidate[]>((result, item, index) => {
      const imageUrl = toHttpsUrl(item.link);
      const thumbnailUrl = toHttpsUrl(item.thumbnail);

      // 미리보기와 서버 복사는 네이버가 제공한 이미지 프록시 URL만 사용합니다.
      if (!imageUrl || !thumbnailUrl || !isTrustedNaverImageUrl(thumbnailUrl)) return result;

      result.push({
        id: `${imageUrl}-${index}`,
        title: stripHtml(item.title ?? "네이버 이미지"),
        imageUrl,
        thumbnailUrl,
        sourceUrl: imageUrl,
        width: toDimension(item.sizewidth),
        height: toDimension(item.sizeheight),
      });
      return result;
    }, []);

    return NextResponse.json({ items: candidates });
  } catch {
    return NextResponse.json({ error: "네이버 이미지 검색 서버에 연결하지 못했습니다." }, { status: 502 });
  }
}
