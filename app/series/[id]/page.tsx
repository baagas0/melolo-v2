"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { ArrowLeft, Download, ImageIcon, Video, Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useSearchParams } from "next/navigation"

interface Episode {
  id?: number
  vid: string
  title: string
  episode_cover: string
  vid_index: number
  duration: number
}

interface SeriesDetail {
  id?: number
  series_id: string
  series_title: string
  series_cover: string
  series_intro: string
  episode_cnt: number
  video_list: Episode[]
}

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const source = searchParams.get("source") || "api"
  const [series, setSeries] = useState<SeriesDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingCover, setDownloadingCover] = useState(false)
  const [downloadingEpisode, setDownloadingEpisode] = useState<string | null>(null)
  const [downloadingVideo, setDownloadingVideo] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchSeriesDetail()
  }, [id, source])

  const fetchSeriesDetail = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/series/${id}/detail?source=${source}`)
      const data = await response.json()
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      } else {
        setSeries(data)
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch series detail", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCover = async () => {
    if (!series?.series_cover) return
    setDownloadingCover(true)
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: series.series_cover,
          filename: `${series.series_title || "series"}_cover.jpg`,
          type: "image",
        }),
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${series.series_title || "series"}_cover.jpg`
      a.click()
      window.URL.revokeObjectURL(url)
      toast({ title: "Downloaded", description: "Series cover downloaded" })
    } catch {
      toast({ title: "Error", description: "Failed to download cover", variant: "destructive" })
    } finally {
      setDownloadingCover(false)
    }
  }

  const handleDownloadEpisodeCover = async (episode: Episode) => {
    if (!episode.episode_cover) return
    setDownloadingEpisode(episode.vid)
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: episode.episode_cover,
          filename: `${series?.series_title || "series"}_ep${episode.vid_index}_cover.jpg`,
          type: "image",
        }),
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${series?.series_title || "series"}_ep${episode.vid_index}_cover.jpg`
      a.click()
      window.URL.revokeObjectURL(url)
      toast({ title: "Downloaded", description: `Episode ${episode.vid_index} cover downloaded` })
    } catch {
      toast({ title: "Error", description: "Failed to download episode cover", variant: "destructive" })
    } finally {
      setDownloadingEpisode(null)
    }
  }

  const handleDownloadVideo = async (episode: Episode) => {
    setDownloadingVideo(episode.vid)
    try {
      const response = await fetch(`/api/video/${episode.vid}`)
      const data = await response.json()

      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }

      if (data.play_url) {
        const videoResponse = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: data.play_url,
            filename: `${series?.series_title || "series"}_ep${episode.vid_index}.mp4`,
            type: "video",
          }),
        })
        const blob = await videoResponse.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${series?.series_title || "series"}_ep${episode.vid_index}.mp4`
        a.click()
        window.URL.revokeObjectURL(url)
        toast({ title: "Downloaded", description: `Episode ${episode.vid_index} video downloaded` })
      }
    } catch {
      toast({ title: "Error", description: "Failed to download video", variant: "destructive" })
    } finally {
      setDownloadingVideo(null)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Series not found</p>
          <Link href="/search">
            <Button>Go to Search</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={source === "db" ? "/series" : "/search"}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{series.series_title}</h1>
              <p className="text-sm text-muted-foreground">{series.episode_cnt} episodes</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Series Info Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-full sm:w-48 flex-shrink-0">
                <div className="aspect-[2/3] relative rounded-lg overflow-hidden">
                  <img
                    src={series.series_cover || "/placeholder.svg?height=300&width=200&query=video cover"}
                    alt={series.series_title}
                    className="object-cover w-full h-full"
                  />
                </div>
                <Button
                  className="w-full mt-3"
                  onClick={handleDownloadCover}
                  disabled={downloadingCover || !series.series_cover}
                >
                  {downloadingCover ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download Cover
                </Button>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">{series.series_title}</h2>
                <Badge className="mb-3">{series.episode_cnt} Episodes</Badge>
                <p className="text-muted-foreground">{series.series_intro || "No description available"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Episodes List */}
        <Card>
          <CardHeader>
            <CardTitle>Episodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {series.video_list?.map((episode) => (
                <div key={episode.vid} className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border border-border">
                  <div className="w-full sm:w-32 flex-shrink-0">
                    <div className="aspect-video relative rounded overflow-hidden bg-muted">
                      <img
                        src={episode.episode_cover || "/placeholder.svg?height=90&width=160&query=episode thumbnail"}
                        alt={episode.title}
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium">Episode {episode.vid_index}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">{episode.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDuration(episode.duration || 0)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadEpisodeCover(episode)}
                        disabled={downloadingEpisode === episode.vid || !episode.episode_cover}
                      >
                        {downloadingEpisode === episode.vid ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <ImageIcon className="h-4 w-4 mr-1" />
                        )}
                        Cover
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownloadVideo(episode)}
                        disabled={downloadingVideo === episode.vid}
                      >
                        {downloadingVideo === episode.vid ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Video className="h-4 w-4 mr-1" />
                        )}
                        Video
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
      <Toaster />
    </div>
  )
}
