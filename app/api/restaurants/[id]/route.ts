import { NextResponse } from "next/server";

import { getPublicRestaurantById } from "@/entities/restaurant/api/restaurants";
import { getPublicApiCorsHeaders } from "@/shared/lib/http/cors";

type RestaurantRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RestaurantRouteContext) {
  const { id } = await params;
  const headers = getPublicApiCorsHeaders(request.headers.get("origin"));

  if (!id) {
    return NextResponse.json(
      { error: "맛집 ID가 필요합니다." },
      { headers, status: 400 },
    );
  }

  try {
    const restaurant = await getPublicRestaurantById(id);

    if (!restaurant) {
      return NextResponse.json(
        { error: "맛집을 찾을 수 없습니다." },
        { headers, status: 404 },
      );
    }

    return NextResponse.json(restaurant, { headers });
  } catch {
    return NextResponse.json(
      { error: "맛집 상세 정보를 불러오지 못했습니다." },
      { headers, status: 500 },
    );
  }
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    headers: getPublicApiCorsHeaders(request.headers.get("origin")),
    status: 204,
  });
}
