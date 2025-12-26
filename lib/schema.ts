import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const series = pgTable("series", {
    id: serial("id").primaryKey(),
    melolo_series_id: varchar("melolo_series_id", { length: 255 }).unique().notNull(),
    cover_url: text("cover_url").notNull(),
    local_cover_path: text("local_cover_path"),
    intro: text("intro").notNull(),
    title: text("title").notNull(),
    episode_count: integer("episode_count").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const episodes = pgTable("episodes", {
    id: serial("id").primaryKey(),
    series_id: integer("series_id").references(() => series.id, { onDelete: "cascade" }).notNull(),
    melolo_vid_id: varchar("melolo_vid_id", { length: 255 }).unique().notNull(),
    cover: text("cover").notNull(),
    local_cover_path: text("local_cover_path"),
    title: text("title").notNull(),
    index_sequence: integer("index_sequence").notNull(),
    duration: integer("duration").notNull(),
    video_height: integer("video_height").notNull(),
    video_weight: integer("video_weight").notNull(),
    local_video_path: text("local_video_path"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
});
