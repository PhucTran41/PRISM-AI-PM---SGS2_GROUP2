// lib/file-access-manager.ts
import { UploadState } from "@/services/upload/types";

/**
 * File System Access API Manager
 * Stores persistent file handles that survive page refreshes
 * Only works in Chrome/Edge/Opera browsers
 */
class FileSystemManager {
  private handles = new Map<string, FileSystemFileHandle>();
  private isSupported = false;

  async init(): Promise<boolean> {
    this.isSupported =
      typeof window !== "undefined" && "showOpenFilePicker" in window;
    if (!this.isSupported) {
      console.info("File System Access API not available in this browser");
    }
    return this.isSupported;
  }

  isAvailable(): boolean {
    return this.isSupported;
  }

  async storeHandle(uploadId: string, file: File): Promise<void> {
    if (!this.isSupported) return;

    try {
      // Try to get handle from the file object (if available)
      const fileWithHandle = file as File & { handle?: FileSystemFileHandle };
      const handle = fileWithHandle.handle;

      if (handle) {
        this.handles.set(uploadId, handle);
        console.log(`Stored persistent file handle for ${uploadId}`);
      }
    } catch (error) {
      console.warn("Failed to store file handle:", error);
    }
  }

  async getFile(uploadId: string): Promise<File | null> {
    if (!this.isSupported) return null;

    const handle = this.handles.get(uploadId);
    if (!handle) return null;

    try {
      // Check if we have permission
      const permission = await handle.queryPermission({ mode: "read" });

      if (permission === "granted") {
        return await handle.getFile();
      }

      // Try to request permission
      const newPermission = await handle.requestPermission({ mode: "read" });
      if (newPermission === "granted") {
        return await handle.getFile();
      }

      console.warn("File permission denied for", uploadId);
      return null;
    } catch (error) {
      console.error("Failed to access file via handle:", error);
      this.handles.delete(uploadId); // Clean up invalid handle
      return null;
    }
  }

  removeHandle(uploadId: string): void {
    this.handles.delete(uploadId);
  }

  clear(): void {
    this.handles.clear();
  }
}

/**
 * File Re-selection Prompt Manager
 * Handles prompting users to re-select files after page refresh
 * Works in all browsers as a fallback
 */
export interface FileSelectionPrompt {
  uploadId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  lastModified: number;
  resolve: (file: File | null) => void;
  reject: (error: Error) => void;
}

class FilePromptManager {
  private pendingPrompts = new Map<string, FileSelectionPrompt>();
  private resolvedFiles = new Map<string, File>();
  private promptCallback?: (prompt: FileSelectionPrompt) => void;

  setPromptCallback(callback: (prompt: FileSelectionPrompt) => void): void {
    this.promptCallback = callback;
  }

  async requestFile(state: UploadState): Promise<File | null> {
    // Check if already resolved
    const existing = this.resolvedFiles.get(state.id);
    if (existing) return existing;

    // Check if already prompting
    const pending = this.pendingPrompts.get(state.id);
    if (pending) {
      return new Promise((resolve, reject) => {
        pending.resolve = resolve;
        pending.reject = reject;
      });
    }

    // Create new prompt
    return new Promise((resolve, reject) => {
      const prompt: FileSelectionPrompt = {
        uploadId: state.id,
        fileName: state.file.name,
        fileSize: state.file.size,
        mimeType: state.file.type,
        lastModified: state.file.lastModified,
        resolve,
        reject,
      };

      this.pendingPrompts.set(state.id, prompt);

      if (this.promptCallback) {
        this.promptCallback(prompt);
      } else {
        console.warn("No prompt callback registered. File cannot be resolved.");
        reject(new Error("No prompt callback"));
      }
    });
  }

  resolveFile(uploadId: string, file: File | null): void {
    const prompt = this.pendingPrompts.get(uploadId);
    if (!prompt) return;

    if (file) {
      // Validate file matches original
      const isValid =
        file.size === prompt.fileSize && file.type === prompt.mimeType;

      if (isValid) {
        this.resolvedFiles.set(uploadId, file);
        prompt.resolve(file);
        console.log(`File re-selected successfully for ${uploadId}`);
      } else {
        console.error("File validation failed:", {
          expected: {
            name: prompt.fileName,
            size: prompt.fileSize,
            type: prompt.mimeType,
          },
          actual: { name: file.name, size: file.size, type: file.type },
        });
        prompt.resolve(null);
      }
    } else {
      console.log(`File selection cancelled for ${uploadId}`);
      prompt.resolve(null);
    }

    this.pendingPrompts.delete(uploadId);
  }

  cancelPrompt(uploadId: string): void {
    const prompt = this.pendingPrompts.get(uploadId);
    if (prompt) {
      prompt.resolve(null);
      this.pendingPrompts.delete(uploadId);
    }
  }

  clear(uploadId: string): void {
    this.resolvedFiles.delete(uploadId);
    this.pendingPrompts.delete(uploadId);
  }

  clearAll(): void {
    this.resolvedFiles.clear();
    this.pendingPrompts.clear();
  }

  getPendingPrompts(): FileSelectionPrompt[] {
    return Array.from(this.pendingPrompts.values());
  }
}

/**
 * Hybrid File Access Manager
 * Combines in-memory, File System Access API, and user prompts
 * for maximum compatibility and best user experience
 */
export class HybridFileAccessManager {
  private inMemoryFiles = new Map<string, File>();
  private fileSystemManager = new FileSystemManager();
  private filePromptManager = new FilePromptManager();
  private maxMemoryFiles = 100;

  async init(): Promise<void> {
    await this.fileSystemManager.init();
  }

  setPromptCallback(callback: (prompt: FileSelectionPrompt) => void): void {
    this.filePromptManager.setPromptCallback(callback);
  }

  /**
   * Store a file using all available methods
   */
  async storeFile(uploadId: string, file: File): Promise<void> {
    // 1. Store in memory for immediate access
    this.inMemoryFiles.set(uploadId, file);

    // 2. Try to store persistent file handle (if supported)
    if (this.fileSystemManager.isAvailable()) {
      await this.fileSystemManager.storeHandle(uploadId, file);
    }

    // Clean up old files if memory is getting full
    this.cleanupOldFiles();
  }

  /**
   * Retrieve a file using hybrid approach:
   * 1. Check in-memory (fastest)
   * 2. Try File System Access API (persistent, Chrome only)
   * 3. Prompt user to re-select (fallback, works everywhere)
   */
  async getFile(state: UploadState, allowPrompt = true): Promise<File | null> {
    // Step 1: Try in-memory first (fastest)
    let file: File | null = this.inMemoryFiles.get(state.id) ?? null;
    if (file && this.validateFile(file, state)) {
      console.log(`Retrieved file from memory: ${state.file.name}`);
      return file;
    }

    // Step 2: Try File System Access API (if available)
    if (this.fileSystemManager.isAvailable()) {
      file = await this.fileSystemManager.getFile(state.id);
      if (file && this.validateFile(file, state)) {
        console.log(`Retrieved file from File System API: ${state.file.name}`);
        // Cache in memory for faster future access
        this.inMemoryFiles.set(state.id, file);
        return file;
      }
    }

    // Step 3: Prompt user to re-select file (if allowed)
    if (allowPrompt) {
      console.log(
        `File not available, prompting user to re-select: ${state.file.name}`
      );
      file = await this.filePromptManager.requestFile(state);
      if (file && this.validateFile(file, state)) {
        // Cache for future use
        this.inMemoryFiles.set(state.id, file);
        // Try to store handle for next time
        if (this.fileSystemManager.isAvailable()) {
          await this.fileSystemManager.storeHandle(state.id, file);
        }
        return file;
      }
    }

    console.warn(`Unable to retrieve file for upload ${state.id}`);
    return null;
  }

  /**
   * Resolve a file selection prompt (called from UI)
   */
  resolveFilePrompt(uploadId: string, file: File | null): void {
    this.filePromptManager.resolveFile(uploadId, file);
  }

  /**
   * Cancel a file selection prompt
   */
  cancelFilePrompt(uploadId: string): void {
    this.filePromptManager.cancelPrompt(uploadId);
  }

  /**
   * Get all pending file prompts (for UI display)
   */
  getPendingPrompts(): FileSelectionPrompt[] {
    return this.filePromptManager.getPendingPrompts();
  }

  /**
   * Clean up file references when upload is complete or cancelled
   */
  cleanupFile(uploadId: string): void {
    this.inMemoryFiles.delete(uploadId);
    this.fileSystemManager.removeHandle(uploadId);
    this.filePromptManager.clear(uploadId);
  }

  /**
   * Clear all stored files and prompts
   */
  clearAll(): void {
    this.inMemoryFiles.clear();
    this.fileSystemManager.clear();
    this.filePromptManager.clearAll();
  }

  /**
   * Validate that a file matches the expected state
   */
  private validateFile(file: File, state: UploadState): boolean {
    return file.size === state.file.size && file.type === state.file.type;
  }

  /**
   * Clean up old files from memory to prevent memory issues
   */
  private cleanupOldFiles(): void {
    if (this.inMemoryFiles.size <= this.maxMemoryFiles) {
      return;
    }

    // Remove oldest 20% of files
    const toRemove = Math.floor(this.maxMemoryFiles * 0.2);
    const keys = Array.from(this.inMemoryFiles.keys());

    for (let i = 0; i < toRemove && i < keys.length; i++) {
      const key = keys[i];
      this.inMemoryFiles.delete(key);
      console.log(`Cleaned up old file from memory: ${key}`);
    }
  }

  /**
   * Get statistics about stored files
   */
  getStats(): {
    inMemoryCount: number;
    fileSystemAvailable: boolean;
    pendingPromptsCount: number;
  } {
    return {
      inMemoryCount: this.inMemoryFiles.size,
      fileSystemAvailable: this.fileSystemManager.isAvailable(),
      pendingPromptsCount: this.filePromptManager.getPendingPrompts().length,
    };
  }
}

// Export singleton instance
export const hybridFileAccessManager = new HybridFileAccessManager();
