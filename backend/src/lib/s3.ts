import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
  },
});

const BUCKET = process.env.S3_BUCKET as string;

export function buildStorageKey(originalFileName: string): string {
  const safeName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
}

export async function createPresignedUploadUrl(storageKey: string, mimeType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: mimeType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 300 });
}

export function publicFileUrl(storageKey: string): string {
  const base = process.env.S3_PUBLIC_BASE_URL as string;
  return `${base}/${storageKey}`;
}
