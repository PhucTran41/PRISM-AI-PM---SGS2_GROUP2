// types/file-system.d.ts
// Type definitions for File System Access API

interface FileSystemHandle {
  kind: "file" | "directory";
  name: string;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
  queryPermission(
    descriptor?: FileSystemHandlePermissionDescriptor
  ): Promise<PermissionState>;
  requestPermission(
    descriptor?: FileSystemHandlePermissionDescriptor
  ): Promise<PermissionState>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: "file";
  getFile(): Promise<File>;
  createWritable(
    options?: FileSystemCreateWritableOptions
  ): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: "directory";
  getFileHandle(
    name: string,
    options?: FileSystemGetFileOptions
  ): Promise<FileSystemFileHandle>;
  getDirectoryHandle(
    name: string,
    options?: FileSystemGetDirectoryOptions
  ): Promise<FileSystemDirectoryHandle>;
  removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>;
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
  keys(): AsyncIterableIterator<string>;
  values(): AsyncIterableIterator<FileSystemHandle>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

interface FileSystemGetFileOptions {
  create?: boolean;
}

interface FileSystemGetDirectoryOptions {
  create?: boolean;
}

interface FileSystemRemoveOptions {
  recursive?: boolean;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string | WriteParams): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface WriteParams {
  type: "write" | "seek" | "truncate";
  data?: BufferSource | Blob | string;
  position?: number;
  size?: number;
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string | string[]>;
}

interface FilePickerOptions {
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
}

interface SaveFilePickerOptions extends FilePickerOptions {
  suggestedName?: string;
}

interface DirectoryPickerOptions {
  mode?: "read" | "readwrite";
}

interface Window {
  showOpenFilePicker(
    options?: FilePickerOptions
  ): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(
    options?: SaveFilePickerOptions
  ): Promise<FileSystemFileHandle>;
  showDirectoryPicker(
    options?: DirectoryPickerOptions
  ): Promise<FileSystemDirectoryHandle>;
}

// Extend File interface to include handle
interface File {
  handle?: FileSystemFileHandle;
}

// Type guard for File System Access API support
declare global {
  interface Window {
    showOpenFilePicker?: (
      options?: FilePickerOptions
    ) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (
      options?: SaveFilePickerOptions
    ) => Promise<FileSystemFileHandle>;
    showDirectoryPicker?: (
      options?: DirectoryPickerOptions
    ) => Promise<FileSystemDirectoryHandle>;
  }
}
