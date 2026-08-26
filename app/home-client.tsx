"use client";

import Image from "next/image";

import { RestaurantExplorer } from "@/features/restaurant-explorer/ui/restaurant-explorer";
import { browserExplorerPlatform } from "@/features/restaurant-explorer/model/platform";
import type { ExplorerImageProps } from "@/features/restaurant-explorer/model/platform";
import type { RestaurantSummary } from "@/entities/restaurant/model/types";

function NextExplorerImage({ alt, ...props }: ExplorerImageProps) {
  return <Image {...props} alt={alt} />;
}

export function HomeClient({
  restaurants,
  totalCount,
}: {
  restaurants: RestaurantSummary[];
  totalCount: number;
}) {
  return (
    <RestaurantExplorer
      imageComponent={NextExplorerImage}
      platform={browserExplorerPlatform}
      restaurants={restaurants}
      totalCount={totalCount}
    />
  );
}
