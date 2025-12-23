import { type NextRequest, NextResponse } from "next/server"
import { getVideoStream } from "@/lib/melolo-api"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await getVideoStream(id)

    // Extract video URL from response
    const playInfo = data.data

    if (playInfo?.main_url) {
      return NextResponse.json({
        play_url: playInfo.main_url,
        definition: playInfo.definition || "720p",
        width: playInfo.video_width || 720,
        height: playInfo.video_height || 1280,
      })
    }

    return NextResponse.json({ error: "No video URL found", id }, { status: 404 })
  } catch (error) {
    console.error("Error fetching video stream:", error)
    return NextResponse.json({ error: "Failed to fetch video stream" }, { status: 500 })
  }
}
