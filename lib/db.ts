import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { eq, asc } from 'drizzle-orm';
import type { Series, Episode } from "./types";

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/melolo';
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export async function getAllSeries(): Promise<Series[]> {
  const result = await db.query.series.findMany({
    orderBy: [asc(schema.series.title)],
  });
  return result.map(s => ({
    ...s,
    created_at: s.created_at.toISOString(),
    updated_at: s.updated_at.toISOString(),
  }));
}

export async function getSeriesById(id: number): Promise<Series | null> {
  const result = await db.query.series.findFirst({
    where: eq(schema.series.id, id),
  });
  if (!result) return null;
  return {
    ...result,
    created_at: result.created_at.toISOString(),
    updated_at: result.updated_at.toISOString(),
  };
}

export async function getSeriesByMeloloId(meloloSeriesId: string): Promise<Series | null> {
  const result = await db.query.series.findFirst({
    where: eq(schema.series.melolo_series_id, meloloSeriesId),
  });
  if (!result) return null;
  return {
    ...result,
    created_at: result.created_at.toISOString(),
    updated_at: result.updated_at.toISOString(),
  };
}

export async function saveSeries(data: {
  melolo_series_id: string
  cover_url: string
  intro: string
  title: string
  episode_count: number
}): Promise<number> {
  const existing = await getSeriesByMeloloId(data.melolo_series_id);

  if (existing) {
    await db.update(schema.series)
      .set({
        cover_url: data.cover_url,
        intro: data.intro,
        title: data.title,
        episode_count: data.episode_count,
        updated_at: new Date(),
      })
      .where(eq(schema.series.id, existing.id));
    return existing.id;
  }

  const [newSeries] = await db.insert(schema.series)
    .values({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning({ id: schema.series.id });

  return newSeries.id;
}

export async function updateSeriesLocalCover(id: number, path: string): Promise<void> {
  await db.update(schema.series)
    .set({ local_cover_path: path, updated_at: new Date() })
    .where(eq(schema.series.id, id));
}

export async function getEpisodesBySeriesId(seriesId: number): Promise<Episode[]> {
  const result = await db.query.episodes.findMany({
    where: eq(schema.episodes.series_id, seriesId),
    orderBy: [asc(schema.episodes.index_sequence)],
  });
  return result.map(e => ({
    ...e,
    created_at: e.created_at.toISOString(),
    updated_at: e.updated_at.toISOString(),
  }));
}

export async function saveEpisode(
  seriesId: number,
  data: {
    melolo_vid_id: string
    cover: string
    title: string
    index_sequence: number
    duration: number
    video_height: number
    video_weight: number
  },
): Promise<number> {
  const existing = await db.query.episodes.findFirst({
    where: eq(schema.episodes.melolo_vid_id, data.melolo_vid_id),
  });

  if (existing) {
    await db.update(schema.episodes)
      .set({
        cover: data.cover,
        title: data.title,
        index_sequence: data.index_sequence,
        duration: data.duration,
        video_height: data.video_height,
        video_weight: data.video_weight,
        updated_at: new Date(),
      })
      .where(eq(schema.episodes.id, existing.id));
    return existing.id;
  }

  const [newEpisode] = await db.insert(schema.episodes)
    .values({
      series_id: seriesId,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning({ id: schema.episodes.id });

  return newEpisode.id;
}

export async function updateEpisodeLocalPaths(
  id: number,
  data: { local_cover_path?: string; local_video_path?: string }
): Promise<void> {
  await db.update(schema.episodes)
    .set({ ...data, updated_at: new Date() })
    .where(eq(schema.episodes.id, id));
}

export async function deleteSeries(id: number): Promise<void> {
  await db.delete(schema.series).where(eq(schema.series.id, id));
}

// Download Queue Functions
export async function createDownloadTask(data: {
  series_id: number;
  episode_id?: number | null;
  task_type: string;
  url?: string | null;
  filename?: string | null;
}): Promise<number> {
  const [task] = await db.insert(schema.downloadQueue)
    .values({
      ...data,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning({ id: schema.downloadQueue.id });
  return task.id;
}

export async function getQueueStatus(seriesId: number) {
  const tasks = await db.query.downloadQueue.findMany({
    where: eq(schema.downloadQueue.series_id, seriesId),
    orderBy: [asc(schema.downloadQueue.created_at)],
  });

  const summary = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    processing: tasks.filter(t => t.status === "processing").length,
    completed: tasks.filter(t => t.status === "completed").length,
    failed: tasks.filter(t => t.status === "failed").length,
  };

  return { tasks, summary };
}

export async function getNextPendingTask() {
  const task = await db.query.downloadQueue.findFirst({
    where: eq(schema.downloadQueue.status, "pending"),
    orderBy: [asc(schema.downloadQueue.created_at)],
  });
  return task;
}

export async function updateTaskStatus(
  id: number,
  status: string,
  errorMessage?: string | null
): Promise<void> {
  await db.update(schema.downloadQueue)
    .set({
      status,
      error_message: errorMessage,
      updated_at: new Date(),
    })
    .where(eq(schema.downloadQueue.id, id));
}

export async function clearCompletedTasks(seriesId: number): Promise<void> {
  await db.delete(schema.downloadQueue)
    .where(eq(schema.downloadQueue.series_id, seriesId));
}

// Rumble Upload Functions
export async function createRumbleUpload(episodeId: number): Promise<number> {
  const existing = await db.query.rumbleUploads.findFirst({
    where: eq(schema.rumbleUploads.episode_id, episodeId),
  });

  if (existing) {
    return existing.id;
  }

  const [upload] = await db.insert(schema.rumbleUploads)
    .values({
      episode_id: episodeId,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning({ id: schema.rumbleUploads.id });

  return upload.id;
}

export async function updateRumbleUploadStatus(
  id: number,
  status: string,
  data?: {
    video_id?: string | null;
    rumble_url?: string | null;
    error_message?: string | null;
  }
): Promise<void> {
  await db.update(schema.rumbleUploads)
    .set({
      status,
      ...(data?.video_id !== undefined && { video_id: data.video_id }),
      ...(data?.rumble_url !== undefined && { rumble_url: data.rumble_url }),
      ...(data?.error_message !== undefined && { error_message: data.error_message }),
      updated_at: new Date(),
    })
    .where(eq(schema.rumbleUploads.id, id));
}

export async function getRumbleUploadByEpisodeId(episodeId: number) {
  const upload = await db.query.rumbleUploads.findFirst({
    where: eq(schema.rumbleUploads.episode_id, episodeId),
  });
  return upload;
}

export async function getRumbleUploadById(id: number) {
  const upload = await db.query.rumbleUploads.findFirst({
    where: eq(schema.rumbleUploads.id, id),
  });
  return upload;
}
