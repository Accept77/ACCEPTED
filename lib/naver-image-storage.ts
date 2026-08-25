import { getR2PublicUrl, uploadR2Object } from "@/lib/r2/server";
import { isTrustedNaverImageUrl } from "@/lib/naver-images";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionForContentType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export async function storeNaverImage(sourceUrl: string) {
  if (!isTrustedNaverImageUrl(sourceUrl)) {
    throw new Error("신뢰할 수 있는 네이버 이미지 후보만 저장할 수 있습니다.");
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

  const imagePath = `naver-imports/${crypto.randomUUID()}.${extensionForContentType(contentType)}`;
  if (!getR2PublicUrl(imagePath)) {
    throw new Error("R2_PUBLIC_BASE_URL 환경변수를 먼저 설정해 주세요.");
  }

  return uploadR2Object({
    key: imagePath,
    body: bytes,
    cacheControl: "31536000",
    contentType,
  });
}
