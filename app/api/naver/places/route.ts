import { NextRequest, NextResponse } from "next/server";

import {
  normalizeLatitude,
  normalizeLongitude,
} from "@/entities/restaurant/model/coordinates";
import { getNaverApiConfig } from "@/shared/lib/config";
import { getAdminStatus } from "@/shared/lib/supabase/auth";
import type { NaverPlaceSearchResult } from "@/entities/restaurant/model/types";

type NaverResponse = {
  items?: Array<{
    title?: string;
    category?: string;
    link?: string;
    address?: string;
    roadAddress?: string;
    mapx?: string;
    mapy?: string;
  }>;
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

function createMapUrl(name: string, address: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${name} ${address}`)}`;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ error: "검색어를 2자 이상 입력해 주세요." }, { status: 400 });
  }

  const apiConfig = getNaverApiConfig();
  if (!apiConfig) {
    return NextResponse.json(
      { error: "NAVER API HUB 환경변수가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { isAdmin } = await getAdminStatus();
  if (!isAdmin) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const searchUrl = new URL("https://naverapihub.apigw.ntruss.com/search/v1/local");
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("display", "5");
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
      return NextResponse.json({ error: "네이버 검색 한도를 초과했습니다." }, { status: 429 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: "네이버 장소 검색에 실패했습니다." }, { status: 502 });
    }

    const payload = (await response.json()) as NaverResponse;
    const items: NaverPlaceSearchResult[] = (payload.items ?? []).map((item, index) => {
      const name = stripHtml(item.title ?? "이름 없는 장소");
      const address = item.roadAddress || item.address || "주소 정보 없음";
      const sourceUrl = item.link || createMapUrl(name, address);
      const category = stripHtml(item.category ?? "기타").trim() || "기타";

      return {
        id: `${name}-${address}-${index}`,
        name,
        category,
        address,
        roadAddress: item.roadAddress ?? "",
        sourceUrl,
        mapUrl: createMapUrl(name, address),
        latitude: normalizeLatitude(item.mapy),
        longitude: normalizeLongitude(item.mapx),
      };
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "네이버 검색 서버에 연결하지 못했습니다." }, { status: 502 });
  }
}
