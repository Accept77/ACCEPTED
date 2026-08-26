const ADMIN_ROOT_PATH = "/admin";
const INTERNAL_ORIGIN = "https://admin-return.local";

export function normalizeAdminReturnPath(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate || candidate.length > 1000) return ADMIN_ROOT_PATH;

  try {
    const url = new URL(candidate, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN || url.pathname !== ADMIN_ROOT_PATH) return ADMIN_ROOT_PATH;

    return `${ADMIN_ROOT_PATH}${url.search}`;
  } catch {
    return ADMIN_ROOT_PATH;
  }
}

export function withAdminReturnPath(path: `/admin/${string}`, returnTo: string) {
  const params = new URLSearchParams({ returnTo: normalizeAdminReturnPath(returnTo) });
  return `${path}?${params.toString()}`;
}
