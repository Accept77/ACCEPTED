"use client";

import { memo } from "react";
import { NaverMap, type RestaurantMapProps } from "@/features/restaurant-explorer/ui/naver-map";

export type { RestaurantMapProps };

/** Provider-neutral map seam. The current adapter is Naver; another provider can replace it without changing the explorer. */
export const RestaurantMap = memo(function RestaurantMap(props: RestaurantMapProps) {
  return <NaverMap {...props} />;
});
