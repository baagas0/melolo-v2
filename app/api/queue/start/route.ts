import { type NextRequest, NextResponse } from "next/server";
import { createDownloadTask } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const { seriesId, tasks } = await request.json();

        if (!seriesId || !tasks || !Array.isArray(tasks)) {
            return NextResponse.json(
                { error: "seriesId and tasks array required" },
                { status: 400 }
            );
        }

        // Create all tasks in the database
        const taskIds = [];
        for (const task of tasks) {
            const taskId = await createDownloadTask({
                series_id: Number(seriesId),
                episode_id: task.episodeId ? Number(task.episodeId) : null,
                task_type: task.type,
                url: task.url || null,
                filename: task.filename || null,
            });
            taskIds.push(taskId);
        }

        return NextResponse.json({
            success: true,
            queueId: `queue_${seriesId}`,
            totalTasks: taskIds.length,
        });
    } catch (error) {
        console.error("Queue start error:", error);
        return NextResponse.json(
            { error: "Failed to start download queue" },
            { status: 500 }
        );
    }
}
