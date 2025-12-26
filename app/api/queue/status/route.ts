import { type NextRequest, NextResponse } from "next/server";
import { getQueueStatus } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const seriesId = searchParams.get("seriesId");

        if (!seriesId) {
            return NextResponse.json(
                { error: "seriesId parameter required" },
                { status: 400 }
            );
        }

        const result = await getQueueStatus(Number(seriesId));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Queue status error:", error);
        return NextResponse.json(
            { error: "Failed to get queue status" },
            { status: 500 }
        );
    }
}
