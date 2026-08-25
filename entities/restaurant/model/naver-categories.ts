const GENERIC_NAVER_CATEGORIES = new Set(["음식점", "식당", "맛집", "dining", "restaurant"]);

export function getNaverCategoryTags(value: string, fallbackCategory?: string) {
  const source = value.trim() || fallbackCategory?.trim() || "";
  const tags = source
    .split(/[>,/|·,，]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag && tag !== "기타" && !GENERIC_NAVER_CATEGORIES.has(tag.toLowerCase()));

  return Array.from(new Set(tags)).slice(0, 12);
}
