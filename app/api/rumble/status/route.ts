import { type NextRequest, NextResponse } from "next/server";
import { getRumbleUploadByEpisodeId } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const episodeId = searchParams.get("episodeId");

        if (!episodeId) {
            return NextResponse.json(
                { error: "episodeId parameter required" },
                { status: 400 }
            );
        }

        const upload = await getRumbleUploadByEpisodeId(Number(episodeId));

        if (!upload) {
            return NextResponse.json({
                uploaded: false,
                status: null,
                rumbleUrl: null,
            });
        }

        return NextResponse.json({
            uploaded: true,
            status: upload.status,
            rumbleUrl: upload.rumble_url,
            videoId: upload.video_id,
            errorMessage: upload.error_message,
        });
    } catch (error) {
        console.error("Rumble status check error:", error);
        return NextResponse.json(
            { error: "Failed to check upload status" },
            { status: 500 }
        );
    }
}
