import { S3Client } from "@aws-sdk/client-s3";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;

// Validation config
export const UPLOAD_VALIDATION = {
  maxFileSize: 1 * 1024 * 1024 * 1024, // 1GB
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
  presignedUrlExpiry: 3600, // 1 hour in seconds
};

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 255);
}

export function generateFileKey(fileName: string, userId?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sanitized = sanitizeFileName(fileName);
  const prefix = userId ? `users/${userId}` : "uploads";
  return `${prefix}/${timestamp}_${random}_${sanitized}`;
}
