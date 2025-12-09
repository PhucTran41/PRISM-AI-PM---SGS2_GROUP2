import {
  UploadState,
  UploadProgress,
  UploadPart,
  UPLOAD_CONFIG,
  CreateMultipartResponse,
  PresignedUrlResponse,
  CompleteMultipartResponse,
} from "../services/upload/types";
import { uploadDB } from "../services/upload/indexeddb";

type ProgressCallback = (progress: UploadProgress) => void;
type StateChangeCallback = (state: UploadState) => void;

export class UploadManager {
  private activeUploads = new Map<string, AbortController>();
  private uploadQueue: string[] = [];
  private activeCount = 0;
  private progressCallbacks = new Map<string, ProgressCallback>();
  private stateCallbacks = new Map<string, StateChangeCallback>();
  private chunkProgress = new Map<string, Map<number, number>>();
  private speedTracking = new Map<
    string,
    { bytes: number; timestamp: number }[]
  >();

  constructor() {
    this.init();
  }

  private async init() {
    await uploadDB.init();
    // Resume incomplete uploads on initialization
    await this.resumeIncompleteUploads();
  }

  private async resumeIncompleteUploads() {
    const incompleteUploads = await uploadDB.getIncompleteUploads();

    for (const state of incompleteUploads) {
      if (state.status === "uploading") {
        // Mark as paused and add to queue
        state.status = "paused";
        await uploadDB.saveUploadState(state);
      }
      this.uploadQueue.push(state.id);
    }

    this.processQueue();
  }

  async addFiles(files: File[]): Promise<string[]> {
    const uploadIds: string[] = [];

    for (const file of files) {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        console.error(
          `File ${file.name} validation failed:`,
          validation.errors
        );
        continue;
      }

      const id = this.generateUploadId();
      const state: UploadState = {
        id,
        file: {
          name: this.sanitizeFileName(file.name),
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        },
        uploadId: "",
        key: "",
        chunkSize: UPLOAD_CONFIG.chunkSize,
        completedParts: [],
        nextChunkIndex: 0,
        retries: {},
        status: "queued",
        uploadedBytes: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await uploadDB.saveUploadState(state);
      this.uploadQueue.push(id);
      uploadIds.push(id);
      this.emitStateChange(state);
    }

    this.processQueue();
    return uploadIds;
  }

  private validateFile(file: File): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      errors.push(
        `File size ${file.size} exceeds maximum ${UPLOAD_CONFIG.maxFileSize}`
      );
    }

    if (file.size === 0) {
      errors.push("File is empty");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .substring(0, 255);
  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async processQueue() {
    while (
      this.activeCount < UPLOAD_CONFIG.maxParallelFiles &&
      this.uploadQueue.length > 0
    ) {
      const uploadId = this.uploadQueue.shift();
      if (!uploadId) continue;

      const state = await uploadDB.getUploadState(uploadId);
      if (!state) continue;

      this.activeCount++;
      this.startUpload(state).finally(() => {
        this.activeCount--;
        this.processQueue();
      });
    }
  }

  private async startUpload(state: UploadState) {
    try {
      const abortController = new AbortController();
      this.activeUploads.set(state.id, abortController);

      // Get original file (this is a limitation - in production, you'd need to handle this differently)
      // For resume after refresh, you'd need to prompt user to select the same file

      state.status = "starting";
      state.updatedAt = Date.now();
      await uploadDB.saveUploadState(state);
      this.emitStateChange(state);

      // Create multipart upload if not exists
      if (!state.uploadId) {
        const createResponse = await this.createMultipartUpload(state);
        state.uploadId = createResponse.uploadId;
        state.key = createResponse.key;
        await uploadDB.saveUploadState(state);
      }

      // Sync with R2 to get already uploaded parts
      await this.syncWithR2(state);

      state.status = "uploading";
      state.updatedAt = Date.now();
      await uploadDB.saveUploadState(state);
      this.emitStateChange(state);

      // Upload remaining chunks
      await this.uploadChunks(state, abortController.signal);

      // Complete multipart upload
      await this.completeUpload(state);

      state.status = "completed";
      state.updatedAt = Date.now();
      await uploadDB.saveUploadState(state);
      this.emitStateChange(state);

      this.activeUploads.delete(state.id);
      this.chunkProgress.delete(state.id);
      this.speedTracking.delete(state.id);

      // Clean up after a delay
      setTimeout(() => {
        uploadDB.deleteUploadState(state.id);
      }, 5000);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        state.status = "paused";
      } else {
        console.error("Upload failed:", error);
        state.status = "failed";
      }
      state.updatedAt = Date.now();
      await uploadDB.saveUploadState(state);
      this.emitStateChange(state);
      this.activeUploads.delete(state.id);
    }
  }

  private async createMultipartUpload(
    state: UploadState
  ): Promise<CreateMultipartResponse> {
    const response = await fetch("/api/upload/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: state.file.name,
        fileSize: state.file.size,
        mimeType: state.file.type,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create upload");
    }

    return response.json();
  }

  private async syncWithR2(state: UploadState): Promise<void> {
    try {
      const response = await fetch(
        `/api/upload/list-parts?uploadId=${
          state.uploadId
        }&key=${encodeURIComponent(state.key)}`
      );

      if (response.ok) {
        const data = await response.json();
        const remoteParts: UploadPart[] = data.parts || [];

        // Update completed parts with remote state
        state.completedParts = remoteParts;
        state.uploadedBytes = remoteParts.reduce(
          (sum, part) => sum + state.chunkSize,
          0
        );
        state.nextChunkIndex = remoteParts.length;

        await uploadDB.saveUploadState(state);
      }
    } catch (error) {
      console.warn(
        "Failed to sync with R2, continuing with local state:",
        error
      );
    }
  }

  private async uploadChunks(state: UploadState, signal: AbortSignal) {
    // This is a simplified version - you need to get the actual File object
    // In practice, you'd store a reference or prompt user to select it again after refresh
    const file = await this.getFileForUpload(state);
    if (!file) {
      throw new Error("File not available for upload");
    }

    const totalChunks = Math.ceil(state.file.size / state.chunkSize);
    const chunkPromises: Promise<void>[] = [];
    let activeChunks = 0;

    for (let i = state.nextChunkIndex; i < totalChunks; i++) {
      // Wait if we're at max parallel chunks
      while (activeChunks >= UPLOAD_CONFIG.maxParallelChunks) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (signal.aborted) throw new Error("Upload aborted");
      }

      activeChunks++;
      const chunkPromise = this.uploadChunk(state, file, i, signal).finally(
        () => {
          activeChunks--;
        }
      );
      chunkPromises.push(chunkPromise);
    }

    await Promise.all(chunkPromises);
  }

  private async getFileForUpload(state: UploadState): Promise<File | null> {
    // This is a placeholder - in production, you need a strategy to get the File object
    // Options:
    // 1. Keep File objects in memory (limited by browser memory)
    // 2. Prompt user to re-select file after refresh
    // 3. Use FileSystem Access API to maintain handles

    // For now, return null and handle in real implementation
    return null;
  }

  private async uploadChunk(
    state: UploadState,
    file: File,
    chunkIndex: number,
    signal: AbortSignal
  ): Promise<void> {
    const partNumber = chunkIndex + 1;

    // Check if already uploaded
    if (state.completedParts.some((p) => p.partNumber === partNumber)) {
      return;
    }

    let retries = state.retries[partNumber] || 0;

    while (retries <= UPLOAD_CONFIG.maxRetries) {
      try {
        const start = chunkIndex * state.chunkSize;
        const end = Math.min(start + state.chunkSize, state.file.size);
        const chunk = file.slice(start, end);

        // Get presigned URL for this part
        const urlResponse = await this.getPresignedUploadUrl(
          state.uploadId,
          state.key,
          partNumber
        );

        // Upload chunk with progress tracking
        const etag = await this.uploadChunkToR2(
          urlResponse.url,
          chunk,
          (progress) => {
            this.updateChunkProgress(state.id, partNumber, progress);
            this.updateSpeedTracking(state.id, progress);
            this.emitProgress(state);
          },
          signal
        );

        // Mark as completed
        state.completedParts.push({ partNumber, etag });
        state.completedParts.sort((a, b) => a.partNumber - b.partNumber);
        state.uploadedBytes += chunk.size;
        state.nextChunkIndex = chunkIndex + 1;
        state.updatedAt = Date.now();
        delete state.retries[partNumber];

        await uploadDB.saveUploadState(state);
        this.emitProgress(state);
        return;
      } catch (error) {
        if (signal.aborted) throw error;

        retries++;
        state.retries[partNumber] = retries;

        if (retries > UPLOAD_CONFIG.maxRetries) {
          throw new Error(
            `Failed to upload chunk ${partNumber} after ${UPLOAD_CONFIG.maxRetries} retries`
          );
        }

        // Exponential backoff
        const delay = UPLOAD_CONFIG.baseRetryDelay * Math.pow(2, retries - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async getPresignedUploadUrl(
    uploadId: string,
    key: string,
    partNumber: number
  ): Promise<PresignedUrlResponse> {
    const response = await fetch("/api/upload/presign-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId, key, partNumber }),
    });

    if (!response.ok) {
      throw new Error("Failed to get presigned URL");
    }

    return response.json();
  }

  private async uploadChunkToR2(
    url: string,
    chunk: Blob,
    onProgress: (bytes: number) => void,
    signal: AbortSignal
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const etag = xhr.getResponseHeader("ETag")?.replace(/"/g, "");
          if (!etag) {
            reject(new Error("No ETag in response"));
          } else {
            resolve(etag);
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error")));
      xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

      signal.addEventListener("abort", () => xhr.abort());

      xhr.open("PUT", url);
      xhr.send(chunk);
    });
  }

  private async completeUpload(state: UploadState): Promise<void> {
    const response = await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId: state.uploadId,
        key: state.key,
        parts: state.completedParts,
        fileName: state.file.name,
        fileSize: state.file.size,
        mimeType: state.file.type,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to complete upload");
    }

    const data: CompleteMultipartResponse = await response.json();
    console.log("Upload completed:", data.url);
  }

  async pauseUpload(uploadId: string): Promise<void> {
    const controller = this.activeUploads.get(uploadId);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(uploadId);
    }

    const state = await uploadDB.getUploadState(uploadId);
    if (state) {
      state.status = "paused";
      state.updatedAt = Date.now();
      await uploadDB.saveUploadState(state);
      this.emitStateChange(state);
    }
  }

  async resumeUpload(uploadId: string): Promise<void> {
    const state = await uploadDB.getUploadState(uploadId);
    if (!state) return;

    state.status = "queued";
    state.updatedAt = Date.now();
    await uploadDB.saveUploadState(state);
    this.emitStateChange(state);

    if (!this.uploadQueue.includes(uploadId)) {
      this.uploadQueue.push(uploadId);
    }

    this.processQueue();
  }

  async cancelUpload(uploadId: string): Promise<void> {
    const controller = this.activeUploads.get(uploadId);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(uploadId);
    }

    const state = await uploadDB.getUploadState(uploadId);
    if (state && state.uploadId) {
      // Abort multipart upload on R2
      await fetch("/api/upload/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: state.uploadId,
          key: state.key,
        }),
      });
    }

    if (state) {
      state.status = "aborted";
      state.updatedAt = Date.now();
      await uploadDB.saveUploadState(state);
      this.emitStateChange(state);
    }

    await uploadDB.deleteUploadState(uploadId);
    this.chunkProgress.delete(uploadId);
    this.speedTracking.delete(uploadId);
  }

  onProgress(uploadId: string, callback: ProgressCallback): () => void {
    this.progressCallbacks.set(uploadId, callback);
    return () => this.progressCallbacks.delete(uploadId);
  }

  onStateChange(uploadId: string, callback: StateChangeCallback): () => void {
    this.stateCallbacks.set(uploadId, callback);
    return () => this.stateCallbacks.delete(uploadId);
  }

  private updateChunkProgress(
    uploadId: string,
    partNumber: number,
    bytes: number
  ) {
    if (!this.chunkProgress.has(uploadId)) {
      this.chunkProgress.set(uploadId, new Map());
    }
    this.chunkProgress.get(uploadId)!.set(partNumber, bytes);
  }

  private updateSpeedTracking(uploadId: string, bytes: number) {
    if (!this.speedTracking.has(uploadId)) {
      this.speedTracking.set(uploadId, []);
    }
    const tracking = this.speedTracking.get(uploadId)!;
    tracking.push({ bytes, timestamp: Date.now() });

    // Keep only last 10 seconds of data
    const cutoff = Date.now() - 10000;
    while (tracking.length > 0 && tracking[0].timestamp < cutoff) {
      tracking.shift();
    }
  }

  private async emitProgress(state: UploadState) {
    const callback = this.progressCallbacks.get(state.id);
    if (!callback) return;

    const chunkProgressMap = this.chunkProgress.get(state.id) || new Map();
    const chunkProgress: Record<number, number> = {};
    chunkProgressMap.forEach((bytes, partNumber) => {
      chunkProgress[partNumber] = bytes;
    });

    const uploadedBytes = state.uploadedBytes;
    const percentage = (uploadedBytes / state.file.size) * 100;

    // Calculate speed
    const tracking = this.speedTracking.get(state.id) || [];
    let speed = 0;
    if (tracking.length >= 2) {
      const first = tracking[0];
      const last = tracking[tracking.length - 1];
      const timeDiff = (last.timestamp - first.timestamp) / 1000;
      const bytesDiff = last.bytes - first.bytes;
      speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
    }

    const remainingBytes = state.file.size - uploadedBytes;
    const eta = speed > 0 ? remainingBytes / speed : 0;

    const progress: UploadProgress = {
      id: state.id,
      fileName: state.file.name,
      uploadedBytes,
      totalBytes: state.file.size,
      percentage,
      speed,
      eta,
      status: state.status,
      chunkProgress,
    };

    callback(progress);
  }

  private emitStateChange(state: UploadState) {
    const callback = this.stateCallbacks.get(state.id);
    if (callback) {
      callback(state);
    }
  }
}

export const uploadManager = new UploadManager();
