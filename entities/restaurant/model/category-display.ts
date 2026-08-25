import {
  Beef,
  Beer,
  Coffee,
  Croissant,
  Dessert,
  Drumstick,
  Fish,
  IceCreamBowl,
  Pizza,
  Sandwich,
  Soup,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";

export function categoryIcon(category: string): LucideIcon {
  const normalizedCategory = category.toLocaleLowerCase("ko-KR");

  if (normalizedCategory.includes("카페")) return Coffee;
  if (normalizedCategory.includes("베이커리") || normalizedCategory.includes("빵")) return Croissant;
  if (normalizedCategory.includes("디저트")) return Dessert;
  if (normalizedCategory.includes("아이스크림") || normalizedCategory.includes("빙수")) return IceCreamBowl;
  if (
    normalizedCategory.includes("고기") ||
    normalizedCategory.includes("스테이크") ||
    normalizedCategory.includes("바비큐") ||
    normalizedCategory.includes("갈비")
  ) {
    return Beef;
  }
  if (normalizedCategory.includes("치킨") || normalizedCategory.includes("닭") || normalizedCategory.includes("튀김")) {
    return Drumstick;
  }
  if (
    normalizedCategory.includes("한식") ||
    normalizedCategory.includes("국수") ||
    normalizedCategory.includes("면") ||
    normalizedCategory.includes("카레") ||
    normalizedCategory.includes("분식") ||
    normalizedCategory.includes("떡볶이")
  ) {
    return Soup;
  }
  if (normalizedCategory.includes("일식") || normalizedCategory.includes("초밥") || normalizedCategory.includes("스시") || normalizedCategory.includes("회")) {
    return Fish;
  }
  if (normalizedCategory.includes("피자")) return Pizza;
  if (normalizedCategory.includes("햄버거") || normalizedCategory.includes("버거")) return Sandwich;
  if (normalizedCategory.includes("와인") || normalizedCategory.includes("칵테일")) return Wine;
  if (
    normalizedCategory.includes("술집") ||
    normalizedCategory.includes("바(") ||
    normalizedCategory.includes("bar") ||
    normalizedCategory.includes("맥주")
  ) {
    return Beer;
  }

  return UtensilsCrossed;
}
