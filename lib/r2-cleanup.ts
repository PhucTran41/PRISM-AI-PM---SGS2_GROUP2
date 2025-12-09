// lib/r2-cleanup.ts
import {
  ListMultipartUploadsCommand,
  AbortMultipartUploadCommand,
  ListMultipartUploadsCommandOutput,
} from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "./r2-client";

export interface MultipartUploadInfo {
  key: string;
  uploadId: string;
  initiated: Date;
  initiator?: string;
  owner?: string;
}

export interface CleanupResult {
  total: number;
  aborted: number;
  failed: number;
  errors: Array<{ key: string; uploadId: string; error: string }>;
}

export class R2MultipartCleanup {
  /**
   * List all incomplete multipart uploads in the bucket
   */
  async listIncompleteUploads(
    prefix?: string,
    maxResults = 1000
  ): Promise<MultipartUploadInfo[]> {
    const uploads: MultipartUploadInfo[] = [];
    let keyMarker: string | undefined;
    let uploadIdMarker: string | undefined;
    let isTruncated = true;

    try {
      while (isTruncated && uploads.length < maxResults) {
        const command = new ListMultipartUploadsCommand({
          Bucket: R2_BUCKET_NAME,
          Prefix: prefix,
          KeyMarker: keyMarker,
          UploadIdMarker: uploadIdMarker,
          MaxUploads: Math.min(1000, maxResults - uploads.length),
        });

        const response: ListMultipartUploadsCommandOutput = await r2Client.send(
          command
        );

        if (response.Uploads && response.Uploads.length > 0) {
          for (const upload of response.Uploads) {
            if (upload.Key && upload.UploadId && upload.Initiated) {
              uploads.push({
                key: upload.Key,
                uploadId: upload.UploadId,
                initiated: upload.Initiated,
                initiator: upload.Initiator?.DisplayName,
                owner: upload.Owner?.DisplayName,
              });
            }
          }
        }

        isTruncated = response.IsTruncated || false;
        keyMarker = response.NextKeyMarker;
        uploadIdMarker = response.NextUploadIdMarker;

        // Safety break
        if (uploads.length >= maxResults) {
          break;
        }
      }

      return uploads;
    } catch (error) {
      console.error("Failed to list multipart uploads:", error);
      throw error;
    }
  }

  /**
   * Abort a single multipart upload
   */
  async abortUpload(key: string, uploadId: string): Promise<boolean> {
    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
      });

      await r2Client.send(command);
      console.log(`Aborted multipart upload: ${key} (${uploadId})`);
      return true;
    } catch (error) {
      console.error(`Failed to abort upload ${key}:`, error);
      return false;
    }
  }

  /**
   * Abort all incomplete multipart uploads
   */
  async abortAllUploads(
    prefix?: string,
    olderThanHours?: number
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      total: 0,
      aborted: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Get all incomplete uploads
      const uploads = await this.listIncompleteUploads(prefix);
      result.total = uploads.length;

      console.log(`Found ${uploads.length} incomplete multipart uploads`);

      if (uploads.length === 0) {
        return result;
      }

      // Filter by age if specified
      let uploadsToAbort = uploads;
      if (olderThanHours) {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

        uploadsToAbort = uploads.filter(
          (upload) => upload.initiated < cutoffDate
        );

        console.log(
          `Filtered to ${uploadsToAbort.length} uploads older than ${olderThanHours} hours`
        );
      }

      // Abort uploads in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < uploadsToAbort.length; i += batchSize) {
        const batch = uploadsToAbort.slice(i, i + batchSize);

        const batchPromises = batch.map(async (upload) => {
          const success = await this.abortUpload(upload.key, upload.uploadId);
          if (success) {
            result.aborted++;
          } else {
            result.failed++;
            result.errors.push({
              key: upload.key,
              uploadId: upload.uploadId,
              error: "Abort failed",
            });
          }
        });

        await Promise.all(batchPromises);

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < uploadsToAbort.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log(
        `Cleanup complete: ${result.aborted} aborted, ${result.failed} failed`
      );
      return result;
    } catch (error) {
      console.error("Cleanup failed:", error);
      throw error;
    }
  }

  /**
   * Get statistics about incomplete uploads
   */
  async getUploadStats(prefix?: string): Promise<{
    total: number;
    byAge: {
      lessThan1Hour: number;
      lessThan24Hours: number;
      lessThan7Days: number;
      moreThan7Days: number;
    };
    totalSizeEstimate: number;
    oldestUpload?: Date;
  }> {
    const uploads = await this.listIncompleteUploads(prefix);
    const now = new Date();

    const stats = {
      total: uploads.length,
      byAge: {
        lessThan1Hour: 0,
        lessThan24Hours: 0,
        lessThan7Days: 0,
        moreThan7Days: 0,
      },
      totalSizeEstimate: 0,
      oldestUpload: undefined as Date | undefined,
    };

    let oldestDate: Date | undefined;

    for (const upload of uploads) {
      const ageHours =
        (now.getTime() - upload.initiated.getTime()) / (1000 * 60 * 60);

      if (ageHours < 1) {
        stats.byAge.lessThan1Hour++;
      } else if (ageHours < 24) {
        stats.byAge.lessThan24Hours++;
      } else if (ageHours < 24 * 7) {
        stats.byAge.lessThan7Days++;
      } else {
        stats.byAge.moreThan7Days++;
      }

      if (!oldestDate || upload.initiated < oldestDate) {
        oldestDate = upload.initiated;
      }
    }

    stats.oldestUpload = oldestDate;

    return stats;
  }
}

// Export singleton instance
export const r2MultipartCleanup = new R2MultipartCleanup();
