const NAVER_INTEGER_COORDINATE_SCALE = 10_000_000;

function normalizeCoordinate(
  value: number | string | null | undefined,
  maximumAbsoluteValue: number,
) {
  if (value === null || value === undefined || value === "") return null;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  if (Math.abs(numericValue) <= maximumAbsoluteValue) return numericValue;

  const scaledValue = numericValue / NAVER_INTEGER_COORDINATE_SCALE;
  return Math.abs(scaledValue) <= maximumAbsoluteValue ? scaledValue : null;
}

export function normalizeLatitude(value: number | string | null | undefined) {
  return normalizeCoordinate(value, 90);
}

export function normalizeLongitude(value: number | string | null | undefined) {
  return normalizeCoordinate(value, 180);
}
