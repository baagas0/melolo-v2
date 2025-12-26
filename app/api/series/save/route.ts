import { type NextRequest, NextResponse } from "next/server"
import { getSeriesDetail } from "@/lib/melolo-api"
import { saveSeries, saveEpisode } from "@/lib/db"
import { paraphraseSeriesInfo } from "@/lib/ai-text"

export async function POST(request: NextRequest) {
  try {
    const { seriesId } = await request.json()

    if (!seriesId) {
      return NextResponse.json({ error: "Series ID required" }, { status: 400 })
    }

    // Fetch series detail from API
    const detailResponse = await getSeriesDetail(seriesId)
    const videoData = detailResponse?.data?.video_data

    if (!videoData) {
      return NextResponse.json({ error: "Failed to fetch series data" }, { status: 500 })
    }

    const originalTitle = videoData.series_title || ""
    const originalIntro = videoData.series_intro || ""

    // Paraphrase title and intro using AI
    console.log('[Series Save] Starting AI paraphrasing for series:', originalTitle)
    const { title: paraphrasedTitle, intro: paraphrasedIntro } = await paraphraseSeriesInfo(
      originalTitle,
      originalIntro
    )
    console.log('[Series Save] AI paraphrasing completed')

    // Save series to database with paraphrased content
    const dbSeriesId = await saveSeries({
      melolo_series_id: seriesId,
      cover_url: videoData.series_cover || "",
      intro: paraphrasedIntro,
      title: paraphrasedTitle,
      episode_count: videoData.episode_cnt || 0,
    })

    // Save episodes
    const episodes = videoData.video_list || []
    for (const episode of episodes) {
      await saveEpisode(dbSeriesId, {
        melolo_vid_id: episode.vid,
        cover: episode.episode_cover || "",
        title: paraphrasedIntro || episode.title || "",
        index_sequence: episode.vid_index || 0,
        duration: episode.duration || 0,
        video_height: episode.video_height || 1080,
        video_weight: episode.video_width || 720,
      })
    }

    return NextResponse.json({
      success: true,
      seriesId: dbSeriesId,
      episodeCount: episodes.length,
      original: {
        title: originalTitle,
        intro: originalIntro,
      },
      paraphrased: {
        title: paraphrasedTitle,
        intro: paraphrasedIntro,
      },
    })
  } catch (error) {
    console.error("Error saving series:", error)
    return NextResponse.json({ error: "Failed to save series" }, { status: 500 })
  }
}
