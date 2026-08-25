"use server";

import { createR2PresignedUploadUrl, deleteR2Objects, getR2PublicUrl } from "@/shared/lib/r2/server";
import { storeNaverImage } from "@/shared/lib/naver-image-storage";
import { requireAdmin } from "@/shared/lib/supabase/auth";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionForContentType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export async function createImageUploadUrl(contentType: string) {
  await requireAdmin();

  if (typeof contentType !== "string" || !ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.");
  }

  const imagePath = `uploads/${crypto.randomUUID()}.${extensionForContentType(contentType)}`;
  const imageUrl = getR2PublicUrl(imagePath);
  if (!imageUrl) {
    throw new Error("R2_PUBLIC_BASE_URL 환경변수를 먼저 설정해 주세요.");
  }

  const uploadUrl = await createR2PresignedUploadUrl({
    key: imagePath,
    contentType,
  });

  return { imagePath, imageUrl, uploadUrl };
}

export async function deleteUploadedImages(imagePaths: string[]) {
  await requireAdmin();

  if (!Array.isArray(imagePaths)) return;

  const paths = imagePaths
    .filter((imagePath): imagePath is string => typeof imagePath === "string")
    .filter((imagePath) => imagePath.startsWith("uploads/"))
    .slice(0, 3);

  await deleteR2Objects(paths);
}

export async function importImageFromNaver(thumbnailUrl: string) {
  await requireAdmin();
  return storeNaverImage(thumbnailUrl);
}
