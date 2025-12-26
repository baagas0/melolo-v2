import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { updateSeriesLocalCover, updateEpisodeLocalPaths } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { url, filename, type, seriesId, episodeId } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 })
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch file: ${response.statusText}` }, { status: 500 })
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    // Define storage path
    const storageDir = path.join(process.cwd(), "public", "downloads", String(seriesId || "misc"))
    await fs.mkdir(storageDir, { recursive: true })

    const filePath = path.join(storageDir, filename)
    await fs.writeFile(filePath, buffer)

    // Relative path for web access
    const relativePath = `/downloads/${seriesId || "misc"}/${filename}`

    // Update Database if IDs are provided
    if (seriesId && !episodeId && type === "image") {
      await updateSeriesLocalCover(Number(seriesId), relativePath)
    } else if (episodeId && type === "image") {
      await updateEpisodeLocalPaths(Number(episodeId), { local_cover_path: relativePath })
    } else if (episodeId && type === "video") {
      await updateEpisodeLocalPaths(Number(episodeId), { local_video_path: relativePath })
    }

    return NextResponse.json({
      success: true,
      path: relativePath,
      message: `Saved to ${relativePath}`
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Failed to download and save file" }, { status: 500 })
  }
}
