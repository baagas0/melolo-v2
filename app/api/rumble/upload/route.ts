import { type NextRequest, NextResponse } from "next/server";
import {
    createRumbleUpload,
    updateRumbleUploadStatus,
    getRumbleUploadByEpisodeId,
} from "@/lib/db";
import { db } from "@/lib/db";
import { episodes } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { uploadToRumble } from "@/lib/rumble-api";
import path from "path";

export async function POST(request: NextRequest) {
    try {
        const { episodeId, title, description } = await request.json();

        if (!episodeId || !title) {
            return NextResponse.json(
                { error: "episodeId and title are required" },
                { status: 400 }
            );
        }

        // Check if already uploaded
        const existingUpload = await getRumbleUploadByEpisodeId(Number(episodeId));
        console.log('existingUpload', existingUpload)
        if (existingUpload && existingUpload.status === "published") {
            return NextResponse.json({
                success: true,
                message: "Video already uploaded to Rumble",
                rumbleUrl: existingUpload.rumble_url,
                videoId: existingUpload.video_id,
            });
        }

        // Get episode details
        const episode = await db.query.episodes.findFirst({
            where: eq(episodes.id, Number(episodeId)),
        });

        if (!episode) {
            return NextResponse.json(
                { error: "Episode not found" },
                { status: 404 }
            );
        }

        if (!episode.local_video_path) {
            return NextResponse.json(
                { error: "Video not downloaded yet" },
                { status: 400 }
            );
        }

        // Create or get upload record
        const uploadId = await createRumbleUpload(Number(episodeId));

        // Update status to uploading
        await updateRumbleUploadStatus(uploadId, "uploading");

        try {
            // Get the full local file path
            const localFilePath = path.join(process.cwd(), "public", episode.local_video_path);
            console.log('localFilePath', localFilePath)
            const filename = path.basename(episode.local_video_path);
            console.log('filename', filename)

            // Perform the upload
            const result = await uploadToRumble(localFilePath, filename, {
                title,
                description: description || "",
            });

            // Update status to published
            await updateRumbleUploadStatus(uploadId, "published", {
                video_id: result.videoId,
                rumble_url: result.rumbleUrl || `https://rumble.com/v${result.videoId}`,
            });

            return NextResponse.json({
                success: true,
                message: "Video uploaded to Rumble successfully",
                rumbleUrl: result.rumbleUrl || `https://rumble.com/v${result.videoId}`,
                videoId: result.videoId,
            });
        } catch (uploadError) {
            // Update status to failed
            const errorMessage =
                uploadError instanceof Error
                    ? uploadError.message
                    : "Unknown upload error";

            await updateRumbleUploadStatus(uploadId, "failed", {
                error_message: errorMessage,
            });

            throw uploadError;
        }
    } catch (error) {
        console.error("Rumble upload error:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to upload video to Rumble",
            },
            { status: 500 }
        );
    }
}
