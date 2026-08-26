export function getExplorerApiUrl(apiBaseUrl: string | undefined, path: string) {
  const normalizedBaseUrl = apiBaseUrl?.trim().replace(/\/+$/, "");
  return normalizedBaseUrl ? `${normalizedBaseUrl}${path}` : path;
}
