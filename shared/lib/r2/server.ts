import "server-only";

import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
  type ObjectIdentifier,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Config = {
  accountId: string;
  endpoint: string;
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string | null;
};

type UploadR2ObjectInput = {
  key: string;
  body: Uint8Array | ArrayBuffer | string;
  contentType: string;
  cacheControl?: string;
};

type PresignedUploadInput = {
  key: string;
  contentType: string;
  expiresIn?: number;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`R2 환경변수 ${name}이(가) 설정되지 않았습니다.`);
  }

  return value;
}

function normalizeEndpoint(value: string) {
  const endpoint = new URL(value);

  if (endpoint.protocol !== "https:") {
    throw new Error("R2_ENDPOINT는 HTTPS 주소여야 합니다.");
  }

  return endpoint.toString().replace(/\/$/, "");
}

function normalizePublicBaseUrl(value: string | undefined) {
  if (!value?.trim()) return null;

  const publicUrl = new URL(value);
  if (!["http:", "https:"].includes(publicUrl.protocol)) {
    throw new Error("R2_PUBLIC_BASE_URL은 HTTP 또는 HTTPS 주소여야 합니다.");
  }

  return publicUrl.toString().replace(/\/$/, "");
}

export function getR2Config(): R2Config {
  return {
    accountId: requiredEnv("R2_ACCOUNT_ID"),
    endpoint: normalizeEndpoint(requiredEnv("R2_ENDPOINT")),
    region: process.env.R2_REGION?.trim() || "auto",
    bucketName: requiredEnv("R2_BUCKET_NAME"),
    accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    publicBaseUrl: normalizePublicBaseUrl(process.env.R2_PUBLIC_BASE_URL),
  };
}

export function isR2Configured() {
  try {
    getR2Config();
    return Boolean(getR2PublicBaseUrl());
  } catch {
    return false;
  }
}

export function getR2PublicBaseUrl() {
  return normalizePublicBaseUrl(process.env.R2_PUBLIC_BASE_URL);
}

export function createR2Client() {
  const config = getR2Config();

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function getR2PublicUrl(key: string) {
  const publicBaseUrl = getR2PublicBaseUrl();
  if (!publicBaseUrl) return null;

  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${publicBaseUrl}/${encodedKey}`;
}

export async function uploadR2Object({
  key,
  body,
  contentType,
  cacheControl,
}: UploadR2ObjectInput) {
  const config = getR2Config();
  const client = createR2Client();
  const uploadBody =
    typeof body === "string"
      ? body
      : Buffer.from(body instanceof ArrayBuffer ? new Uint8Array(body) : body);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: uploadBody,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );

  const imageUrl = getR2PublicUrl(key);
  if (!imageUrl) {
    throw new Error("R2_PUBLIC_BASE_URL 환경변수를 먼저 설정해 주세요.");
  }

  return {
    imagePath: key,
    imageUrl,
  };
}

export async function createR2PresignedUploadUrl({
  key,
  contentType,
  expiresIn = 600,
}: PresignedUploadInput) {
  const config = getR2Config();
  const client = createR2Client();
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteR2Objects(keys: string[]) {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
  if (uniqueKeys.length === 0) return;

  const config = getR2Config();
  const client = createR2Client();

  for (let index = 0; index < uniqueKeys.length; index += 1000) {
    const objects: ObjectIdentifier[] = uniqueKeys.slice(index, index + 1000).map((key) => ({ Key: key }));

    await client.send(
      new DeleteObjectsCommand({
        Bucket: config.bucketName,
        Delete: { Objects: objects, Quiet: true },
      }),
    );
  }
}
