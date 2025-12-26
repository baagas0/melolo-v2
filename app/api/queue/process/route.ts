import { type NextRequest, NextResponse } from "next/server";
import {
    getNextPendingTask,
    updateTaskStatus,
    updateSeriesLocalCover,
    updateEpisodeLocalPaths,
    getSeriesById,
} from "@/lib/db";
import fs from "fs/promises";
import path from "path";

async function downloadFile(
    url: string,
    seriesId: number,
    filename: string
): Promise<string> {
    const response = await fetch(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Define storage path
    const storageDir = path.join(
        process.cwd(),
        "public",
        "downloads",
        String(seriesId)
    );
    await fs.mkdir(storageDir, { recursive: true });

    const filePath = path.join(storageDir, filename);
    await fs.writeFile(filePath, buffer);

    // Return relative path for web access
    return `/downloads/${seriesId}/${filename}`;
}

export async function POST(request: NextRequest) {
    try {
        // Get the next pending task
        const task = await getNextPendingTask();

        if (!task) {
            return NextResponse.json({
                success: true,
                message: "No pending tasks",
                hasMore: false,
            });
        }

        // Mark as processing
        await updateTaskStatus(task.id, "processing");

        try {
            let relativePath: string | null = null;

            // Process based on task type
            if (task.task_type === "series_cover") {
                if (!task.url || !task.filename) {
                    throw new Error("Missing URL or filename for series cover");
                }

                relativePath = await downloadFile(
                    task.url,
                    task.series_id,
                    task.filename
                );
                await updateSeriesLocalCover(task.series_id, relativePath);
            } else if (task.task_type === "episode_cover") {
                if (!task.url || !task.filename || !task.episode_id) {
                    throw new Error("Missing URL, filename, or episode ID");
                }

                relativePath = await downloadFile(
                    task.url,
                    task.series_id,
                    task.filename
                );
                await updateEpisodeLocalPaths(task.episode_id, {
                    local_cover_path: relativePath,
                });
            } else if (task.task_type === "episode_video") {
                if (!task.url || !task.filename || !task.episode_id) {
                    throw new Error("Missing URL, filename, or episode ID");
                }

                relativePath = await downloadFile(
                    task.url,
                    task.series_id,
                    task.filename
                );
                await updateEpisodeLocalPaths(task.episode_id, {
                    local_video_path: relativePath,
                });
            }

            // Mark as completed
            await updateTaskStatus(task.id, "completed");

            return NextResponse.json({
                success: true,
                message: `Task ${task.id} completed`,
                taskId: task.id,
                taskType: task.task_type,
                path: relativePath,
                hasMore: true,
            });
        } catch (error) {
            // Mark as failed
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            await updateTaskStatus(task.id, "failed", errorMessage);

            return NextResponse.json({
                success: false,
                message: `Task ${task.id} failed: ${errorMessage}`,
                taskId: task.id,
                error: errorMessage,
                hasMore: true,
            });
        }
    } catch (error) {
        console.error("Queue process error:", error);
        return NextResponse.json(
            { error: "Failed to process queue" },
            { status: 500 }
        );
    }
}
