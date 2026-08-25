export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

export function getNaverMapClientId() {
  return process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";
}

export function getNaverApiConfig() {
  const clientId = process.env.NAVER_API_HUB_CLIENT_ID;
  const clientSecret = process.env.NAVER_API_HUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}
