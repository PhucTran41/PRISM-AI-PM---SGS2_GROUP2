// types/upload.ts
export interface UploadConfig {
  chunkSize: number;
  maxParallelChunks: number;
  maxParallelFiles: number;
  maxRetries: number;
  baseRetryDelay: number;
  maxFileSize: number;
  allowedMimeTypes: string[];
  presignedUrlExpiry: number;
}

export const UPLOAD_CONFIG: UploadConfig = {
  chunkSize: 10 * 1024 * 1024, // 10MB
  maxParallelChunks: 4,
  maxParallelFiles: 3,
  maxRetries: 3,
  baseRetryDelay: 500,
  maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
  presignedUrlExpiry: 3600, // 1 hour
};

export interface UploadPart {
  partNumber: number;
  etag: string;
}

export interface UploadState {
  id: string;
  file: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
  uploadId: string;
  key: string;
  chunkSize: number;
  completedParts: UploadPart[];
  nextChunkIndex: number;
  retries: Record<number, number>;
  status: UploadStatus;
  uploadedBytes: number;
  createdAt: number;
  updatedAt: number;
}

export type UploadStatus =
  | "queued"
  | "starting"
  | "uploading"
  | "paused"
  | "retrying"
  | "completed"
  | "failed"
  | "aborted";

export interface UploadProgress {
  id: string;
  fileName: string;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  eta: number; // seconds
  status: UploadStatus;
  chunkProgress: Record<number, number>;
}

export interface CreateMultipartResponse {
  uploadId: string;
  key: string;
}

export interface PresignedUrlResponse {
  url: string;
  partNumber: number;
}

export interface CompleteMultipartRequest {
  uploadId: string;
  key: string;
  parts: UploadPart[];
}

export interface CompleteMultipartResponse {
  url: string;
  key: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface UploadValidationResponse {
  valid: boolean;
  errors?: ValidationError[];
}
