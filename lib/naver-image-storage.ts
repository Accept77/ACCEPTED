import { STORAGE_BUCKET } from "@/lib/constants";
import { isTrustedNaverImageUrl } from "@/lib/naver-images";
import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionForContentType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export async function storeNaverImage(sourceUrl: string) {
  if (!isTrustedNaverImageUrl(sourceUrl)) {
    throw new Error("네이버 이미지 후보만 저장할 수 있습니다.");
  }

  let response: Response;
  try {
    response = await fetch(sourceUrl, {
      cache: "no-store",
      headers: { Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("네이버 이미지를 불러오지 못했습니다.");
  }

  if (!response.ok) {
    throw new Error("네이버 이미지 응답이 올바르지 않습니다.");
  }

  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  const contentLength = Number(response.headers.get("content-length"));
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error("JPG, PNG, WEBP 형식의 이미지만 저장할 수 있습니다.");
  }
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_SIZE) {
    throw new Error("이미지는 5MB 이하만 저장할 수 있습니다.");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_SIZE) {
    throw new Error("이미지는 5MB 이하만 저장할 수 있습니다.");
  }

  const path = `naver-imports/${crypto.randomUUID()}.${extensionForContentType(contentType)}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    cacheControl: "31536000",
    contentType,
    upsert: false,
  });

  if (error) throw new Error(`이미지를 저장하지 못했습니다: ${error.message}`);

  const imageUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  return { imagePath: path, imageUrl };
}
