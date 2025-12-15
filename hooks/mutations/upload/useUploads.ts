import { useState, useEffect, useCallback } from "react";
import { hybridUploadManager } from "@/lib/hybrid-upload-manager";
import { UploadState, UploadProgress } from "@/services/upload/types";

export interface Upload {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: UploadState["status"];
  error?: string;
  uploadedUrl?: string;
}

export function useUploads() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initManager = async () => {
      if (!isInitialized) {
        await hybridUploadManager.init();
        setIsInitialized(true);
      }
    };
    initManager();
  }, [isInitialized]);

  useEffect(() => {
    return () => {
      uploads.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
      });
    };
  }, []);

  const addFilesToUpload = useCallback(
    async (files: File[]) => {
      if (!isInitialized) {
        console.error("Upload manager is not initialized yet.");
        return;
      }

      const newUploads: Upload[] = [];

      for (const file of files) {
        const previewUrl = URL.createObjectURL(file);
        const tempId = `temp_${Date.now()}_${file.name}`;

        const newUpload: Upload = {
          id: tempId,
          file,
          previewUrl,
          progress: 0,
          status: "queued",
        };
        newUploads.push(newUpload);
      }

      setUploads((prev) => [...prev, ...newUploads]);

      const uploadIds = await hybridUploadManager.addFiles(files);

      setUploads((prev) =>
        prev.map((upload, index) =>
          upload.id.startsWith("temp_") &&
          index >= prev.length - newUploads.length
            ? {
                ...upload,
                id: uploadIds[index - (prev.length - newUploads.length)],
              }
            : upload
        )
      );

      uploadIds.forEach((id) => {
        hybridUploadManager.onStateChange(id, (state) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === id
                ? {
                    ...u,
                    status: state.status,
                    uploadedUrl:
                      state.status === "completed" ? "some-url" : undefined, // Placeholder for the final URL
                  }
                : u
            )
          );
        });

        hybridUploadManager.onProgress(id, (progress) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === id ? { ...u, progress: progress.percentage } : u
            )
          );
        });
      });
    },
    [isInitialized]
  );

  const removeUpload = (id: string) => {
    const upload = uploads.find((u) => u.id === id);
    if (upload && upload.previewUrl) {
      URL.revokeObjectURL(upload.previewUrl);
    }
    setUploads((prev) => prev.filter((u) => u.id !== id));
    // Optionally, also cancel the upload in the manager
    hybridUploadManager.cancelUpload(id);
  };

  return { uploads, addFilesToUpload, removeUpload };
}
