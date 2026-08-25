import type { RestaurantSummary } from "@/lib/types";

export const VISITED_TAG = "진수가 가봤어요";
export const NOT_VISITED_TAG = "진수가 아직 안 가봤어요";

export type VisitFilter = "all" | "visited" | "unvisited";

export function getVisitTag(hasVisited: boolean) {
  return hasVisited ? VISITED_TAG : NOT_VISITED_TAG;
}

export function getRestaurantDisplayTags(
  restaurant: Pick<RestaurantSummary, "tags" | "hasVisited">,
) {
  return Array.from(new Set([...restaurant.tags, getVisitTag(restaurant.hasVisited)]));
}

export function matchesRestaurantTags(
  restaurant: Pick<RestaurantSummary, "tags" | "hasVisited">,
  selectedTags: string[],
  visitFilter: VisitFilter,
) {
  const visitMatches =
    visitFilter === "all" ||
    (visitFilter === "visited" && restaurant.hasVisited) ||
    (visitFilter === "unvisited" && !restaurant.hasVisited);
  if (!visitMatches) return false;

  const displayTags = getRestaurantDisplayTags(restaurant);
  return selectedTags.every((tag) => displayTags.includes(tag));
}
