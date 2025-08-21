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
  decimal,
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
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  passwordHash: varchar("password_hash").notNull(),
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
  visibility: varchar("visibility").notNull().default("public"), // public, private
  showInGallery: boolean("show_in_gallery").notNull().default(true), // Admin can hide from gallery
  title: varchar("title"), // Optional custom title for the track
  falRequestId: varchar("fal_request_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UpsertUser = typeof users.$inferInsert;

export const insertTextToMusicSchema = createInsertSchema(musicGenerations).pick({
  tags: true,
  lyrics: true,
  duration: true,
  visibility: true,
  title: true,
}).extend({
  type: z.literal("text-to-music").default("text-to-music"),
  visibility: z.enum(["public", "private"]).default("public"),
});

export const insertAudioToMusicSchema = createInsertSchema(musicGenerations).pick({
  tags: true,
  lyrics: true,
  inputAudioUrl: true,
  visibility: true,
  title: true,
}).extend({
  type: z.literal("audio-to-music").default("audio-to-music"),
  inputAudioUrl: z.string().min(1, "Audio file URL is required"),
  visibility: z.enum(["public", "private"]).default("public"),
});

export const updateMusicGenerationVisibilitySchema = z.object({
  visibility: z.enum(["public", "private"]),
  title: z.string().optional(),
});

export type InsertTextToMusic = z.infer<typeof insertTextToMusicSchema>;
export type InsertAudioToMusic = z.infer<typeof insertAudioToMusicSchema>;
export type MusicGeneration = typeof musicGenerations.$inferSelect;

// Admin users table
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  email: varchar("email").unique(),
  role: varchar("role").notNull().default("admin"), // admin, super_admin
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }),
  monthlyPriceId: varchar("monthly_price_id"), // Stripe price ID for monthly billing
  yearlyPriceId: varchar("yearly_price_id"), // Stripe price ID for yearly billing
  features: text("features").array().default(sql`'{}'::text[]`), // array of feature strings
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Site settings table
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").unique().notNull(),
  value: text("value"),
  description: text("description"),
  type: varchar("type").notNull().default("text"), // text, number, boolean, json
  category: varchar("category").notNull().default("general"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Usage analytics table
export const usageAnalytics = pgTable("usage_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  totalUsers: integer("total_users").default(0),
  newUsers: integer("new_users").default(0),
  totalGenerations: integer("total_generations").default(0),
  textToMusicGenerations: integer("text_to_music_generations").default(0),
  audioToMusicGenerations: integer("audio_to_music_generations").default(0),
  publicTracks: integer("public_tracks").default(0),
  privateTracks: integer("private_tracks").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;
export type UsageAnalytic = typeof usageAnalytics.$inferSelect;

// Admin login schema
export const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Admin user schemas
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateAdminUserSchema = insertAdminUserSchema.partial().omit({
  username: true,
  password: true,
}).extend({
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
});

// Subscription plan schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  features: z.array(z.string()).default([]),
  monthlyPrice: z.string().optional(),
  yearlyPrice: z.string().optional(),
});

export const updateSubscriptionPlanSchema = insertSubscriptionPlanSchema.partial();

// Site settings schema
export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});

export const updateSiteSettingSchema = insertSiteSettingSchema.partial().omit({
  key: true,
});

export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type InsertAdminUserForm = z.infer<typeof insertAdminUserSchema>;
export type UpdateAdminUserForm = z.infer<typeof updateAdminUserSchema>;
export type InsertSubscriptionPlanForm = z.infer<typeof insertSubscriptionPlanSchema>;
export type UpdateSubscriptionPlanForm = z.infer<typeof updateSubscriptionPlanSchema>;
export type InsertSiteSettingForm = z.infer<typeof insertSiteSettingSchema>;
export type UpdateSiteSettingForm = z.infer<typeof updateSiteSettingSchema>;
