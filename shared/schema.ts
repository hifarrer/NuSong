import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Music generation records
export const musicGenerations = pgTable("music_generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull().default("text-to-music"), // text-to-music, audio-to-music
  tags: text("tags").notNull(),
  lyrics: text("lyrics"),
  duration: integer("duration"), // Only for text-to-music
  inputAudioUrl: varchar("input_audio_url"), // Only for audio-to-music
  audioUrl: varchar("audio_url"),
  seed: integer("seed"),
  status: varchar("status").notNull().default("pending"), // pending, generating, completed, failed
  falRequestId: varchar("fal_request_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertTextToMusicSchema = createInsertSchema(musicGenerations).pick({
  tags: true,
  lyrics: true,
  duration: true,
}).extend({
  type: z.literal("text-to-music").default("text-to-music"),
});

export const insertAudioToMusicSchema = createInsertSchema(musicGenerations).pick({
  tags: true,
  lyrics: true,
  inputAudioUrl: true,
}).extend({
  type: z.literal("audio-to-music").default("audio-to-music"),
  inputAudioUrl: z.string().min(1, "Audio file URL is required"),
});

export type InsertTextToMusic = z.infer<typeof insertTextToMusicSchema>;
export type InsertAudioToMusic = z.infer<typeof insertAudioToMusicSchema>;
export type MusicGeneration = typeof musicGenerations.$inferSelect;
