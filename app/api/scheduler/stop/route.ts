import { type NextRequest, NextResponse } from "next/server";
import scheduler from "@/lib/scheduler";

/**
 * POST /api/scheduler/stop
 * Stop the cron scheduler
 */
export async function POST(request: NextRequest) {
    try {
        console.log('[API] Stopping scheduler requested');

        scheduler.stop();

        return NextResponse.json({
            success: true,
            message: "Scheduler stopped successfully",
        });
    } catch (error) {
        console.error('[API] Stop scheduler error:', error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to stop scheduler",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
