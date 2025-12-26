"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Download, ImageIcon, Video, Loader2, Play, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useSearchParams } from "next/navigation";

interface Episode {
  id?: number;
  vid: string;
  title: string;
  episode_cover: string;
  vid_index: number;
  duration: number;
  local_cover_path?: string | null;
  local_video_path?: string | null;
}

interface SeriesDetail {
  id?: number;
  series_id: string;
  series_title: string;
  series_cover: string;
  series_intro: string;
  episode_cnt: number;
  local_cover_path?: string | null;
  video_list: Episode[];
}

type TaskStatus = "pending" | "processing" | "completed" | "failed";

interface DownloadTask {
  id: string;
  label: string;
  type: "image" | "video";
  episode?: Episode;
  status: TaskStatus;
  error?: string;
}

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "api";
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingCover, setDownloadingCover] = useState(false);
  const [downloadingEpisode, setDownloadingEpisode] = useState<string | null>(null);
  const [downloadingVideo, setDownloadingVideo] = useState<string | null>(null);

  // Server-side queue state
  const [activeQueueSeriesId, setActiveQueueSeriesId] = useState<number | null>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [uploadingEpisode, setUploadingEpisode] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSeriesDetail();
  }, [id, source]);

  const fetchSeriesDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/series/${id}/detail?source=${source}`);
      const data = await response.json();
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        setActiveQueueSeriesId(id as any);
        setSeries(data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch series detail", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCover = async () => {
    if (!series?.series_cover || !series.id) return;
    setDownloadingCover(true);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: series.series_cover,
          filename: `${series.series_title || "series"}_cover.jpg`,
          type: "image",
          seriesId: series.id,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Saved", description: "Series cover saved to server" });
      fetchSeriesDetail();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to download cover", variant: "destructive" });
      throw error;
    } finally {
      setDownloadingCover(false);
    }
  };

  const handleDownloadEpisodeCover = async (episode: Episode) => {
    if (!episode.episode_cover || !series?.id) return;
    setDownloadingEpisode(episode.vid);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: episode.episode_cover,
          filename: `${series?.series_title || "series"}_ep${episode.vid_index}_cover.jpg`,
          type: "image",
          seriesId: series.id,
          episodeId: episode.id,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Saved", description: `Episode ${episode.vid_index} cover saved to server` });
      fetchSeriesDetail();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to download episode cover", variant: "destructive" });
      throw error;
    } finally {
      setDownloadingEpisode(null);
    }
  };

  const handleDownloadVideo = async (episode: Episode) => {
    if (!series?.id) return;
    setDownloadingVideo(episode.vid);
    try {
      const response = await fetch(`/api/video/${episode.vid}`);
      const data = await response.json();

      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      if (data.play_url) {
        const videoResponse = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: data.play_url,
            filename: `${series?.series_title || "series"}_ep${episode.vid_index}.mp4`,
            type: "video",
            seriesId: series.id,
            episodeId: episode.id,
          }),
        });
        const downloadData = await videoResponse.json();
        if (downloadData.error) throw new Error(downloadData.error);
        toast({ title: "Saved", description: `Episode ${episode.vid_index} video saved to server` });
        fetchSeriesDetail();
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to download video", variant: "destructive" });
      throw error;
    } finally {
      setDownloadingVideo(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleUploadToRumble = async (episode: Episode) => {
    if (!series?.id || !episode.id) return;

    setUploadingEpisode(episode.vid);
    try {
      const response = await fetch("/api/rumble/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeId: episode.id,
          title: `${series.series_title} - Episode ${episode.vid_index}`,
          description: series.series_intro || "",
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: `Episode ${episode.vid_index} uploaded to Rumble!`,
        duration: 5000,
      });

      // Refresh to show upload status
      fetchSeriesDetail();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload to Rumble",
        variant: "destructive",
      });
    } finally {
      setUploadingEpisode(null);
    }
  };

  // Server-side Queue Logic
  const startServerQueue = async (tasks: { type: string; url?: string; filename?: string; episodeId?: number }[]) => {
    if (!series?.id) return;

    try {
      const response = await fetch("/api/queue/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesId: series.id,
          tasks,
        }),
      });

      const data = await response.json();
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      setActiveQueueSeriesId(series.id);
      toast({
        title: "Queue Started",
        description: `Added ${data.totalTasks} items to the download queue. Downloads will continue even if you close this tab.`,
        duration: 5000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start download queue",
        variant: "destructive",
      });
    }
  };

  const clearServerQueue = async () => {
    if (!series?.id) return;

    try {
      await fetch("/api/queue/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId: series.id }),
      });

      setActiveQueueSeriesId(null);
      setQueueStatus(null);
      toast({ title: "Queue Cleared" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear queue", variant: "destructive" });
    }
  };

  // Poll queue status
  useEffect(() => {
    if (!activeQueueSeriesId) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/queue/status?seriesId=${activeQueueSeriesId}`);
        const data = await response.json();
        setQueueStatus(data);

        // Stop polling when all tasks are done
        if (data.summary.pending === 0 && data.summary.processing === 0) {
          if (data.summary.completed > 0) {
            // fetchSeriesDetail(); // Refresh to show updated paths
          }
        }
      } catch (error) {
        console.error("Failed to fetch queue status:", error);
      }
    };

    fetchStatus(); // Initial fetch
    const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [activeQueueSeriesId]);

  // Trigger background worker
  useEffect(() => {
    if (!activeQueueSeriesId || !queueStatus) return;
    if (queueStatus.summary.pending === 0 && queueStatus.summary.processing === 0) return;

    const processQueue = async () => {
      try {
        await fetch("/api/queue/process", { method: "POST" });
      } catch (error) {
        console.error("Failed to process queue:", error);
      }
    };

    const interval = setInterval(processQueue, 2000); // Process every 2 seconds

    return () => clearInterval(interval);
  }, [activeQueueSeriesId, queueStatus]);

  const bulkDownloadCovers = async () => {
    if (!series) return;
    const tasks = [];

    // Series cover
    tasks.push({
      type: "series_cover",
      url: series.series_cover,
      filename: `${series.series_title || "series"}_cover.jpg`,
    });

    // Episode covers
    for (const ep of series.video_list) {
      tasks.push({
        type: "episode_cover",
        url: ep.episode_cover,
        filename: `${series.series_title || "series"}_ep${ep.vid_index}_cover.jpg`,
        episodeId: ep.id,
      });
    }

    await startServerQueue(tasks);
  };

  const bulkDownloadVideos = async () => {
    if (!series) return;

    // First, fetch video URLs for all episodes
    const tasks = [];
    for (const ep of series.video_list) {
      try {
        const response = await fetch(`/api/video/${ep.vid}`);
        const data = await response.json();

        if (data.play_url) {
          tasks.push({
            type: "episode_video",
            url: data.play_url,
            filename: `${series.series_title || "series"}_ep${ep.vid_index}.mp4`,
            episodeId: ep.id,
          });
        }
      } catch (error) {
        console.error(`Failed to get video URL for episode ${ep.vid_index}:`, error);
      }
    }

    await startServerQueue(tasks);
  };

  const bulkDownloadAll = async () => {
    if (!series) return;
    const tasks = [];

    // Series Cover
    tasks.push({
      type: "series_cover",
      url: series.series_cover,
      filename: `${series.series_title || "series"}_cover.jpg`,
    });

    // Episodes (Cover and Video for each)
    for (const ep of series.video_list) {
      // Add episode cover
      tasks.push({
        type: "episode_cover",
        url: ep.episode_cover,
        filename: `${series.series_title || "series"}_ep${ep.vid_index}_cover.jpg`,
        episodeId: ep.id,
      });

      // Fetch and add episode video
      try {
        const response = await fetch(`/api/video/${ep.vid}`);
        const data = await response.json();

        if (data.play_url) {
          tasks.push({
            type: "episode_video",
            url: data.play_url,
            filename: `${series.series_title || "series"}_ep${ep.vid_index}.mp4`,
            episodeId: ep.id,
          });
        }
      } catch (error) {
        console.error(`Failed to get video URL for episode ${ep.vid_index}:`, error);
      }
    }

    await startServerQueue(tasks);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
    );
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={bulkDownloadCovers} disabled={!!activeQueueSeriesId}>
                Covers
              </Button>
              <Button variant="outline" size="sm" onClick={bulkDownloadVideos} disabled={!!activeQueueSeriesId}>
                Videos
              </Button>
              <Button size="sm" onClick={bulkDownloadAll} disabled={!!activeQueueSeriesId}>
                Download All
              </Button>
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
                  <img src={series.series_cover || "/placeholder.svg?height=300&width=200&query=video cover"} alt={series.series_title} className="object-cover w-full h-full" />
                </div>
                <Button className="w-full mt-3" onClick={handleDownloadCover} variant={series.local_cover_path ? "secondary" : "default"} disabled={downloadingCover || !series.series_cover}>
                  {downloadingCover ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : series.local_cover_path ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 mr-2">
                      Saved
                    </Badge>
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {series.local_cover_path ? "Cover Saved" : "Download Cover"}
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
                  <div className="w-full sm:w-32 shrink-0">
                    <div className="aspect-video relative rounded overflow-hidden bg-muted">
                      <img src={episode.episode_cover || "/placeholder.svg?height=90&width=160&query=episode thumbnail"} alt={episode.title} className="object-cover w-full h-full" />
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
                      <Button size="sm" variant={episode.local_cover_path ? "secondary" : "outline"} onClick={() => handleDownloadEpisodeCover(episode)} disabled={downloadingEpisode === episode.vid || !episode.episode_cover}>
                        {downloadingEpisode === episode.vid ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : episode.local_cover_path ? <div className="w-2 h-2 rounded-full bg-green-500 mr-1" /> : <ImageIcon className="h-4 w-4 mr-1" />}
                        {episode.local_cover_path ? "Cover Saved" : "Cover"}
                      </Button>
                      <Button size="sm" variant={episode.local_video_path ? "secondary" : "default"} onClick={() => handleDownloadVideo(episode)} disabled={downloadingVideo === episode.vid}>
                        {downloadingVideo === episode.vid ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : episode.local_video_path ? <div className="w-2 h-2 rounded-full bg-green-500 mr-1" /> : <Video className="h-4 w-4 mr-1" />}
                        {episode.local_video_path ? "Video Saved" : "Video"}
                      </Button>
                      {episode.local_video_path && (
                        <Button size="sm" variant="outline" onClick={() => handleUploadToRumble(episode)} disabled={uploadingEpisode === episode.vid}>
                          {uploadingEpisode === episode.vid ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                          Rumble
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Server Queue Progress Overlay */}
      {queueStatus && queueStatus.summary.total > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg p-4 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="container mx-auto">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Server Download Queue</h3>
                  <p className="text-xs text-muted-foreground">
                    {queueStatus.summary.completed} of {queueStatus.summary.total} completed
                    {queueStatus.summary.failed > 0 && ` • ${queueStatus.summary.failed} failed`}
                  </p>
                  <p className="text-xs text-green-600 mt-1">✓ Downloads continue even if you close this tab</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={clearServerQueue}>
                    Close
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(queueStatus.summary.completed / queueStatus.summary.total) * 100}%`,
                  }}
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {queueStatus.tasks.slice(0, 20).map((task: any) => (
                  <div key={task.id} className={`flex-shrink-0 flex items-center gap-2 px-3 py-1 rounded-full border text-xs ${task.status === "processing" ? "bg-primary/10 border-primary text-primary" : task.status === "completed" ? "bg-green-100 border-green-200 text-green-700" : task.status === "failed" ? "bg-red-100 border-red-200 text-red-700" : "bg-muted border-border text-muted-foreground"}`}>
                    {task.status === "processing" && <Loader2 className="h-3 w-3 animate-spin" />}
                    {task.task_type}
                  </div>
                ))}
                {queueStatus.tasks.length > 20 && <div className="text-xs text-muted-foreground px-2">+{queueStatus.tasks.length - 20} more</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
