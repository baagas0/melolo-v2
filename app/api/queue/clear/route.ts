import { type NextRequest, NextResponse } from "next/server";
import { clearCompletedTasks } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const { seriesId } = await request.json();

        if (!seriesId) {
            return NextResponse.json(
                { error: "seriesId required" },
                { status: 400 }
            );
        }

        await clearCompletedTasks(Number(seriesId));

        return NextResponse.json({
            success: true,
            message: "Queue cleared",
        });
    } catch (error) {
        console.error("Queue clear error:", error);
        return NextResponse.json(
            { error: "Failed to clear queue" },
            { status: 500 }
        );
    }
}
