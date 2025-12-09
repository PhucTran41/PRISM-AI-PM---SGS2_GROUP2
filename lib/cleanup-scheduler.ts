import { r2MultipartCleanup } from "./r2-cleanup";

export interface CleanupSchedulerConfig {
  enabled: boolean;
  intervalHours: number; // How often to run cleanup
  abortOlderThanHours: number; // Abort uploads older than this
  runOnStartup: boolean; // Run immediately when server starts
  dryRun: boolean; // If true, only log what would be deleted
}

const DEFAULT_CONFIG: CleanupSchedulerConfig = {
  enabled: true,
  intervalHours: 24, // Run once per day
  abortOlderThanHours: 24, // Clean uploads older than 24 hours
  runOnStartup: false,
  dryRun: false,
};

export class CleanupScheduler {
  private config: CleanupSchedulerConfig;
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config?: Partial<CleanupSchedulerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the cleanup scheduler
   */
  start(): void {
    if (this.intervalId) {
      console.warn("Cleanup scheduler already running");
      return;
    }

    if (!this.config.enabled) {
      console.log("Cleanup scheduler is disabled");
      return;
    }

    console.log("Starting cleanup scheduler", {
      intervalHours: this.config.intervalHours,
      abortOlderThanHours: this.config.abortOlderThanHours,
      dryRun: this.config.dryRun,
    });

    // Run immediately on startup if configured
    if (this.config.runOnStartup) {
      this.runCleanup();
    }

    // Schedule periodic cleanup
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, intervalMs);
  }

  /**
   * Stop the cleanup scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log("Cleanup scheduler stopped");
    }
  }

  /**
   * Run cleanup now
   */
  async runCleanup(): Promise<void> {
    if (this.isRunning) {
      console.warn("Cleanup already in progress, skipping");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log("Starting multipart upload cleanup...");

      // Get stats first
      const stats = await r2MultipartCleanup.getUploadStats();
      console.log("Upload statistics:", {
        total: stats.total,
        byAge: stats.byAge,
        oldestUpload: stats.oldestUpload,
      });

      if (stats.total === 0) {
        console.log("No incomplete uploads found");
        return;
      }

      // Filter uploads to clean
      const uploads = await r2MultipartCleanup.listIncompleteUploads();
      const cutoffDate = new Date();
      cutoffDate.setHours(
        cutoffDate.getHours() - this.config.abortOlderThanHours
      );

      const uploadsToClean = uploads.filter(
        (upload) => upload.initiated < cutoffDate
      );

      console.log(
        `Found ${uploadsToClean.length} uploads older than ${this.config.abortOlderThanHours} hours`
      );

      if (uploadsToClean.length === 0) {
        console.log("No old uploads to clean");
        return;
      }

      if (this.config.dryRun) {
        console.log("[DRY RUN] Would abort the following uploads:");
        uploadsToClean.forEach((upload) => {
          console.log(
            `  - ${upload.key} (${upload.uploadId}) initiated ${upload.initiated}`
          );
        });
        return;
      }

      // Perform cleanup
      const result = await r2MultipartCleanup.abortAllUploads(
        undefined,
        this.config.abortOlderThanHours
      );

      const duration = (Date.now() - startTime) / 1000;
      console.log("Cleanup completed", {
        duration: `${duration}s`,
        total: result.total,
        aborted: result.aborted,
        failed: result.failed,
      });

      if (result.errors.length > 0) {
        console.error("Cleanup errors:", result.errors);
      }

      // Optional: Send notification/alert if there were failures
      if (result.failed > 0) {
        this.handleCleanupFailures(result);
      }
    } catch (error) {
      console.error("Cleanup failed:", error);
      // Optional: Send alert about cleanup failure
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Handle cleanup failures (override this to add custom alerts)
   */
  protected handleCleanupFailures(result: any): void {
    // Implement your notification logic here
    // Examples:
    // - Send email alert
    // - Post to Slack
    // - Log to monitoring service
    console.error(`Cleanup had ${result.failed} failures`);
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    config: CleanupSchedulerConfig;
  } {
    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      config: this.config,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CleanupSchedulerConfig>): void {
    const wasRunning = !!this.intervalId;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };

    if (wasRunning && this.config.enabled) {
      this.start();
    }
  }
}

// Create and export singleton
export const cleanupScheduler = new CleanupScheduler({
  enabled: process.env.CLEANUP_ENABLED === "true",
  intervalHours: parseInt(process.env.CLEANUP_INTERVAL_HOURS || "24", 10),
  abortOlderThanHours: parseInt(
    process.env.CLEANUP_OLDER_THAN_HOURS || "24",
    10
  ),
  runOnStartup: process.env.CLEANUP_RUN_ON_STARTUP === "true",
  dryRun: process.env.CLEANUP_DRY_RUN === "true",
});

/**
 * ENVIRONMENT VARIABLES:
 *
 * CLEANUP_ENABLED=true                # Enable automatic cleanup
 * CLEANUP_INTERVAL_HOURS=24           # Run every 24 hours
 * CLEANUP_OLDER_THAN_HOURS=24         # Abort uploads older than 24 hours
 * CLEANUP_RUN_ON_STARTUP=false        # Don't run on server start
 * CLEANUP_DRY_RUN=false               # Actually perform cleanup
 */
