import { type NextRequest, NextResponse } from "next/server";
import scheduler from "@/lib/scheduler";

/**
 * POST /api/scheduler/upload
 * Manually trigger the scheduled upload
 */
export async function POST(request: NextRequest) {
    try {
        console.log('[API] Manual upload trigger requested');

        const result = await scheduler.manualTrigger();

        return NextResponse.json(result);
    } catch (error) {
        console.error('[API] Manual upload trigger error:', error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to trigger upload",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/scheduler/upload
 * Get the status of the scheduler
 */
export async function GET(request: NextRequest) {
    try {
        const status = scheduler.getStatus();

        return NextResponse.json({
            schedulerRunning: status.running,
            isUploading: status.isUploading,
        });
    } catch (error) {
        console.error('[API] Get scheduler status error:', error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to get scheduler status",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
