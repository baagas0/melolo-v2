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
      path: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning({ id: schema.episodes.id });

  return newEpisode.id;
}

export async function deleteSeries(id: number): Promise<void> {
  await db.delete(schema.series).where(eq(schema.series.id, id));
}
