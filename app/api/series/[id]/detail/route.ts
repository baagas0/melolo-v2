import { type NextRequest, NextResponse } from "next/server"
import { getSeriesDetail } from "@/lib/melolo-api"
import { getSeriesById, getEpisodesBySeriesId } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const searchParams = request.nextUrl.searchParams
  const source = searchParams.get("source") || "api"

  try {
    if (source === "db") {
      // Fetch from database
      const series = await getSeriesById(Number.parseInt(id))
      if (!series) {
        return NextResponse.json({ error: "Series not found" }, { status: 404 })
      }

      const episodes = await getEpisodesBySeriesId(series.id)

      return NextResponse.json({
        id: series.id,
        series_id: series.melolo_series_id,
        series_title: series.title,
        series_cover: series.cover_url,
        local_cover_path: series.local_cover_path,
        series_intro: series.intro,
        episode_cnt: series.episode_count,
        video_list: episodes.map((ep) => ({
          id: ep.id,
          vid: ep.melolo_vid_id,
          title: ep.title,
          episode_cover: ep.cover,
          local_cover_path: ep.local_cover_path,
          local_video_path: ep.local_video_path,
          vid_index: ep.index_sequence,
          duration: ep.duration,
        })),
      })
    } else {
      // Fetch from API
      const detailResponse = await getSeriesDetail(id)
      const videoData = detailResponse?.data?.video_data

      if (!videoData) {
        return NextResponse.json({ error: "Failed to fetch series data" }, { status: 500 })
      }

      return NextResponse.json({
        series_id: id,
        series_title: videoData.series_title,
        series_cover: videoData.series_cover,
        series_intro: videoData.series_intro,
        episode_cnt: videoData.episode_cnt,
        video_list: videoData.video_list || [],
      })
    }
  } catch (error) {
    console.error("Error fetching series detail:", error)
    return NextResponse.json({ error: "Failed to fetch series detail" }, { status: 500 })
  }
}
