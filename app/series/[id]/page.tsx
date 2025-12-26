"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Download, ImageIcon, Video, Loader2, Play } from "lucide-react";
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

  // Queue state
  const [queue, setQueue] = useState<DownloadTask[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
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

  // Bulk Download Logic
  const startQueue = (tasks: DownloadTask[]) => {
    setQueue(tasks);
    setIsProcessingQueue(true);
    toast({ title: "Queue Started", description: `Added ${tasks.length} items to the download queue.` });
  };

  const stopQueue = () => {
    setIsProcessingQueue(false);
    toast({ title: "Queue Stopped" });
  };

  const clearQueue = () => {
    setQueue([]);
    setIsProcessingQueue(false);
  };

  // Use a ref to track if we're currently processing to avoid concurrent processing
  const processingRef = React.useRef(false);

  useEffect(() => {
    if (!isProcessingQueue || queue.length === 0 || processingRef.current) return;

    const pendingTask = queue.find((t) => t.status === "pending");
    if (!pendingTask) {
      setIsProcessingQueue(false);
      toast({ title: "Completed", description: "All tasks in the queue have been completed." });
      fetchSeriesDetail();
      return;
    }

    processingRef.current = true;
    processTask(pendingTask).finally(() => {
      processingRef.current = false;
    });
  }, [isProcessingQueue, queue]);

  const processTask = async (task: DownloadTask) => {
    // Update status to processing
    setQueue((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "processing" } : t)));

    try {
      if (task.type === "image" && task.episode) {
        await handleDownloadEpisodeCover(task.episode);
      } else if (task.type === "video" && task.episode) {
        await handleDownloadVideo(task.episode);
      } else if (task.id === "series-cover") {
        await handleDownloadCover();
      }

      setQueue((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "completed" } : t)));
    } catch (error) {
      setQueue((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "failed", error: String(error) } : t)));
    }
  };

  const bulkDownloadCovers = () => {
    if (!series) return;
    const tasks: DownloadTask[] = [];

    tasks.push({
      id: "series-cover",
      label: "Series Cover",
      type: "image",
      status: "pending",
    });

    series.video_list.forEach((ep) => {
      tasks.push({
        id: `ep-${ep.vid}-cover`,
        label: `Episode ${ep.vid_index} Cover`,
        type: "image",
        episode: ep,
        status: "pending",
      });
    });

    startQueue(tasks);
  };

  const bulkDownloadVideos = () => {
    if (!series) return;
    const tasks: DownloadTask[] = series.video_list.map((ep) => ({
      id: `ep-${ep.vid}-video`,
      label: `Episode ${ep.vid_index} Video`,
      type: "video",
      episode: ep,
      status: "pending",
    }));

    startQueue(tasks);
  };

  const bulkDownloadAll = () => {
    if (!series) return;
    const tasks: DownloadTask[] = [];

    console.log("series.video_list", series.video_list);
    // return;

    // Series Cover
    tasks.push({
      id: "series-cover",
      label: "Series Cover",
      type: "image",
      status: "pending",
    });

    // Episodes (Cover then Video for each)
    series.video_list
      .filter(async (item) => {
        // CHECK ON /public/downloads/{:id_series}/filename
        const coverPath = `/downloads/${series.id}/${series.series_title}_ep${item.vid_index}_cover.jpg`;
        const videoPath = `/downloads/${series.id}/${series.series_title}_ep${item.vid_index}.mp4`;
        // return !fs.existsSync(coverPath) || !fs.existsSync(videoPath);

        const coverExists = await fetch(coverPath, { method: "HEAD" }).then((res) => res.ok);
        const videoExists = await fetch(videoPath, { method: "HEAD" }).then((res) => res.ok);
        return !coverExists || !videoExists;
      })
      .forEach((ep) => {
        tasks.push({
          id: `ep-${ep.vid}-cover`,
          label: `Episode ${ep.vid_index} Cover`,
          type: "image",
          episode: ep,
          status: "pending",
        });
        tasks.push({
          id: `ep-${ep.vid}-video`,
          label: `Episode ${ep.vid_index} Video`,
          type: "video",
          episode: ep,
          status: "pending",
        });
      });

    startQueue(tasks);
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
              <Button variant="outline" size="sm" onClick={bulkDownloadCovers} disabled={isProcessingQueue}>
                Covers
              </Button>
              <Button variant="outline" size="sm" onClick={bulkDownloadVideos} disabled={isProcessingQueue}>
                Videos
              </Button>
              <Button size="sm" onClick={bulkDownloadAll} disabled={isProcessingQueue}>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Queue Progress Overlay */}
      {queue.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg p-4 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="container mx-auto">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Download Queue</h3>
                  <p className="text-xs text-muted-foreground">
                    {queue.filter((t) => t.status === "completed").length} of {queue.length} completed
                  </p>
                </div>
                <div className="flex gap-2">
                  {isProcessingQueue ? (
                    <Button variant="ghost" size="sm" onClick={stopQueue}>
                      Pause
                    </Button>
                  ) : (
                    queue.some((t) => t.status === "pending") && (
                      <Button variant="ghost" size="sm" onClick={() => setIsProcessingQueue(true)}>
                        Resume
                      </Button>
                    )
                  )}
                  <Button variant="ghost" size="sm" onClick={clearQueue}>
                    Close
                  </Button>
                </div>
              </div>

              {/* Progress Bar Container - using a simple div for progress if Progress component is not directly imported as expected */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(queue.filter((t) => t.status === "completed").length / queue.length) * 100}%` }} />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {queue.map((task) => (
                  <div key={task.id} className={`flex-shrink-0 flex items-center gap-2 px-3 py-1 rounded-full border text-xs ${task.status === "processing" ? "bg-primary/10 border-primary text-primary" : task.status === "completed" ? "bg-green-100 border-green-200 text-green-700" : task.status === "failed" ? "bg-red-100 border-red-200 text-red-700" : "bg-muted border-border text-muted-foreground"}`}>
                    {task.status === "processing" && <Loader2 className="h-3 w-3 animate-spin" />}
                    {task.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
