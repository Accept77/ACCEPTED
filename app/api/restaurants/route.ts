import { NextResponse } from "next/server";

import { getPublicRestaurantIndex } from "@/entities/restaurant/api/restaurants";
import { getPublicApiCorsHeaders } from "@/shared/lib/http/cors";

export async function GET(request: Request) {
  try {
    const index = await getPublicRestaurantIndex();

    return NextResponse.json(index, {
      headers: getPublicApiCorsHeaders(request.headers.get("origin")),
    });
  } catch {
    return NextResponse.json(
      { error: "맛집 목록을 불러오지 못했어요." },
      {
        headers: getPublicApiCorsHeaders(request.headers.get("origin")),
        status: 500,
      },
    );
  }
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    headers: getPublicApiCorsHeaders(request.headers.get("origin")),
    status: 204,
  });
}
