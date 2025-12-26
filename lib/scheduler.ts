import cron from 'node-cron';
import { db } from './db';
import { rumbleUploads, episodes, series } from './schema';
import { eq, desc, asc, and } from 'drizzle-orm';
import { uploadToRumble } from './rumble-api';
import { updateRumbleUploadStatus, createRumbleUpload, getRumbleUploadByEpisodeId } from './db';
import path from 'path';

interface SchedulerConfig {
    cronExpression: string;
    timezone?: string;
}

interface UploadResult {
    success: boolean;
    message: string;
    episodeId?: number;
    seriesTitle?: string;
    episodeNumber?: number;
    error?: string;
}

class RumbleUploadScheduler {
    private task: import('node-cron').ScheduledTask | null = null;
    private isRunning: boolean = false;

    constructor(private config: SchedulerConfig) {
        this.config = {
            cronExpression: config.cronExpression,
            timezone: config.timezone || 'UTC',
        };
    }

    /**
     * Start the cron scheduler
     */
    start() {
        if (this.task) {
            console.log('[Scheduler] Scheduler is already running');
            return;
        }

        console.log('[Scheduler] Starting Rumble upload scheduler');
        console.log(`[Scheduler] Cron expression: ${this.config.cronExpression}`);
        console.log(`[Scheduler] Timezone: ${this.config.timezone}`);

        this.task = cron.schedule(
            this.config.cronExpression,
            async () => {
                if (this.isRunning) {
                    console.log('[Scheduler] Previous upload still in progress, skipping this run');
                    return;
                }

                await this.runScheduledUpload();
            },
            {
                timezone: this.config.timezone,
            }
        );

        console.log('[Scheduler] Scheduler started successfully');
    }

    /**
     * Stop the cron scheduler
     */
    stop() {
        if (this.task) {
            console.log('[Scheduler] Stopping scheduler');
            this.task.stop();
            this.task = null;
            console.log('[Scheduler] Scheduler stopped');
        } else {
            console.log('[Scheduler] No scheduler running');
        }
    }

    /**
     * Manually trigger an upload
     */
    async manualTrigger(): Promise<UploadResult> {
        console.log('[Scheduler] Manual upload triggered');
        return await this.runScheduledUpload();
    }

    /**
     * Get the status of the scheduler
     */
    getStatus(): { running: boolean; isUploading: boolean } {
        return {
            running: this.task !== null,
            isUploading: this.isRunning,
        };
    }

    /**
     * Main upload logic that runs on schedule or manual trigger
     */
    private async runScheduledUpload(): Promise<UploadResult> {
        if (this.isRunning) {
            return {
                success: false,
                message: 'Upload already in progress',
            };
        }

        this.isRunning = true;

        try {
            console.log('[Scheduler] ========================================');
            console.log('[Scheduler] Starting scheduled upload process');
            console.log('[Scheduler] ========================================');

            // Step 1: Find the latest uploaded episode
            const latestUpload = await this.findLatestUploadedEpisode();

            if (!latestUpload) {
                return {
                    success: false,
                    message: 'No uploads found. Please manually upload the first episode to start the series.',
                };
            }

            console.log(`[Scheduler] Latest upload: Series "${latestUpload.seriesTitle}", Episode ${latestUpload.episodeNumber}`);

            // Step 2: Find the next episode to upload
            const nextEpisode = await this.findNextEpisode(
                latestUpload.seriesId,
                latestUpload.episodeNumber
            );

            if (!nextEpisode) {
                console.log(`[Scheduler] No more episodes available for series "${latestUpload.seriesTitle}"`);
                console.log('[Scheduler] Waiting for new series to be uploaded...');

                return {
                    success: false,
                    message: `No more episodes available for series "${latestUpload.seriesTitle}". Waiting for new series.`,
                    episodeId: latestUpload.episodeId,
                    seriesTitle: latestUpload.seriesTitle,
                    episodeNumber: latestUpload.episodeNumber,
                };
            }

            console.log(`[Scheduler] Next episode found: ${nextEpisode.episode.title} (Episode ${nextEpisode.episode.index_sequence})`);

            // Step 3: Check if episode is already uploaded
            const existingUpload = await getRumbleUploadByEpisodeId(nextEpisode.episode.id);

            if (existingUpload && existingUpload.status === 'published') {
                console.log(`[Scheduler] Episode ${nextEpisode.episode.index_sequence} already published`);

                // Try to find the next episode after this one
                const nextEpisode2 = await this.findNextEpisode(
                    nextEpisode.series.id,
                    nextEpisode.episode.index_sequence
                );

                if (!nextEpisode2) {
                    return {
                        success: false,
                        message: `No more episodes available for series "${nextEpisode.series.title}"`,
                    };
                }

                console.log(`[Scheduler] Skipping to next episode: ${nextEpisode2.episode.title} (Episode ${nextEpisode2.episode.index_sequence})`);
                return await this.uploadEpisode(nextEpisode2.episode, nextEpisode2.series);
            }

            // Step 4: Upload the episode
            return await this.uploadEpisode(nextEpisode.episode, nextEpisode.series);
        } catch (error) {
            console.error('[Scheduler] Error during scheduled upload:', error);
            return {
                success: false,
                message: 'Upload failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        } finally {
            this.isRunning = false;
            console.log('[Scheduler] ========================================');
            console.log('[Scheduler] Scheduled upload process completed');
            console.log('[Scheduler] ========================================');
        }
    }

    /**
     * Find the latest uploaded episode from rumble_uploads table
     */
    private async findLatestUploadedEpisode(): Promise<{
        seriesId: number;
        seriesTitle: string;
        episodeId: number;
        episodeNumber: number;
    } | null> {
        const result = await db
            .select({
                upload: rumbleUploads,
                episode: episodes,
                series: series,
            })
            .from(rumbleUploads)
            .innerJoin(episodes, eq(rumbleUploads.episode_id, episodes.id))
            .innerJoin(series, eq(episodes.series_id, series.id))
            .where(eq(rumbleUploads.status, 'published'))
            .orderBy(desc(rumbleUploads.created_at))
            .limit(1);

        if (result.length === 0) {
            return null;
        }

        const { upload, episode, series: seriesData } = result[0];

        return {
            seriesId: seriesData.id,
            seriesTitle: seriesData.title,
            episodeId: episode.id,
            episodeNumber: episode.index_sequence,
        };
    }

    /**
     * Find the next episode in the series
     */
    private async findNextEpisode(
        seriesId: number,
        currentEpisodeNumber: number
    ): Promise<{ episode: typeof episodes.$inferSelect; series: typeof series.$inferSelect } | null> {
        const seriesData = await db.query.series.findFirst({
            where: eq(series.id, seriesId),
        });

        if (!seriesData) {
            return null;
        }

        // Find the next episode by index_sequence
        const nextEpisode = await db.query.episodes.findFirst({
            where: and(
                eq(episodes.series_id, seriesId),
                eq(episodes.index_sequence, currentEpisodeNumber + 1)
            ),
        });

        if (nextEpisode) {
            return {
                episode: nextEpisode,
                series: seriesData,
            };
        }

        // No more episodes in this series
        return null;
    }

    /**
     * Upload an episode to Rumble
     */
    private async uploadEpisode(
        episode: typeof episodes.$inferSelect,
        seriesData: typeof series.$inferSelect
    ): Promise<UploadResult> {
        try {
            console.log(`[Scheduler] Starting upload for: ${seriesData.title} - Episode ${episode.index_sequence}`);

            // Check if video file exists
            if (!episode.local_video_path) {
                return {
                    success: false,
                    message: 'Episode video not downloaded yet',
                    episodeId: episode.id,
                    seriesTitle: seriesData.title,
                    episodeNumber: episode.index_sequence,
                };
            }

            // Create or get upload record
            const uploadId = await createRumbleUpload(episode.id);

            // Update status to uploading
            await updateRumbleUploadStatus(uploadId, 'uploading');

            // Get the full local file path
            const localFilePath = path.join(process.cwd(), 'public', episode.local_video_path);
            const filename = path.basename(episode.local_video_path);

            // Generate title and description
            // const title = `${seriesData.title} - Episode ${episode.index_sequence}`;
            const title = `EPS ${episode.index_sequence} - ${seriesData.title}`;
            const description = `${seriesData.title} Episode ${episode.index_sequence}: ${episode.title}`;

            // Perform the upload
            const result = await uploadToRumble(localFilePath, filename, {
                title,
                description,
            });

            // Update status to published
            await updateRumbleUploadStatus(uploadId, 'published', {
                video_id: result.videoId,
                rumble_url: result.rumbleUrl || `https://rumble.com/v${result.videoId}`,
            });

            console.log(`[Scheduler] Upload successful: ${title}`);
            console.log(`[Scheduler] Video ID: ${result.videoId}`);
            console.log(`[Scheduler] Rumble URL: ${result.rumbleUrl || `https://rumble.com/v${result.videoId}`}`);

            return {
                success: true,
                message: 'Episode uploaded successfully',
                episodeId: episode.id,
                seriesTitle: seriesData.title,
                episodeNumber: episode.index_sequence,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';

            // Update upload status to failed
            try {
                const uploadRecord = await getRumbleUploadByEpisodeId(episode.id);
                if (uploadRecord) {
                    await updateRumbleUploadStatus(uploadRecord.id, 'failed', {
                        error_message: errorMessage,
                    });
                }
            } catch (dbError) {
                console.error('[Scheduler] Error updating upload status:', dbError);
            }

            console.error(`[Scheduler] Upload failed for episode ${episode.index_sequence}:`, error);

            return {
                success: false,
                message: 'Upload failed',
                episodeId: episode.id,
                seriesTitle: seriesData.title,
                episodeNumber: episode.index_sequence,
                error: errorMessage,
            };
        }
    }
}

// Create a singleton instance
// Run every 6 hours: '0 */6 * * *'
const scheduler = new RumbleUploadScheduler({
    // cronExpression: '0 */6 * * *',
    cronExpression: '* * * * *',
    timezone: 'UTC',
});

export default scheduler;
