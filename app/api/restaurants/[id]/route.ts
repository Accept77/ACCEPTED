import { NextResponse } from "next/server";

import { getPublicRestaurantById } from "@/lib/data/restaurants";

type RestaurantRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RestaurantRouteContext) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "맛집 ID가 필요합니다." }, { status: 400 });
  }

  try {
    const restaurant = await getPublicRestaurantById(id);

    if (!restaurant) {
      return NextResponse.json({ error: "맛집을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(restaurant);
  } catch {
    return NextResponse.json({ error: "맛집 상세 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
