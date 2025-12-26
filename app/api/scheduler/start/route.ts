import { type NextRequest, NextResponse } from "next/server";
import scheduler from "@/lib/scheduler";

/**
 * POST /api/scheduler/start
 * Start the cron scheduler
 */
export async function POST(request: NextRequest) {
    try {
        console.log('[API] Starting scheduler requested');

        scheduler.start();

        return NextResponse.json({
            success: true,
            message: "Scheduler started successfully",
        });
    } catch (error) {
        console.error('[API] Start scheduler error:', error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to start scheduler",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
