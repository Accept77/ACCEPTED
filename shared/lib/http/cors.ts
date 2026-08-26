const DEFAULT_APPS_IN_TOSS_APP_NAME = "hungry-jinsu";

function getAllowedOrigins() {
  const appName =
    process.env.APPS_IN_TOSS_APP_NAME?.trim() ||
    DEFAULT_APPS_IN_TOSS_APP_NAME;
  const configuredOrigins = (process.env.APPS_IN_TOSS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([
    `https://${appName}.apps.tossmini.com`,
    `https://${appName}.private-apps.tossmini.com`,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...configuredOrigins,
  ]);
}

export function getPublicApiCorsHeaders(origin: string | null) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    Vary: "Origin",
  });

  if (!origin || !getAllowedOrigins().has(origin)) return headers;

  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Max-Age", "600");

  return headers;
}
