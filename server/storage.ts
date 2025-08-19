import {
  users,
  musicGenerations,
  type User,
  type UpsertUser,
  type MusicGeneration,
  type InsertTextToMusic,
  type InsertAudioToMusic,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Music generation operations
  createTextToMusicGeneration(userId: string, data: InsertTextToMusic): Promise<MusicGeneration>;
  createAudioToMusicGeneration(userId: string, data: InsertAudioToMusic): Promise<MusicGeneration>;
  updateMusicGeneration(id: string, updates: Partial<MusicGeneration>): Promise<MusicGeneration>;
  getMusicGeneration(id: string): Promise<MusicGeneration | undefined>;
  getUserMusicGenerations(userId: string): Promise<MusicGeneration[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Music generation operations
  async createTextToMusicGeneration(userId: string, data: InsertTextToMusic): Promise<MusicGeneration> {
    const [generation] = await db
      .insert(musicGenerations)
      .values({
        ...data,
        userId,
        type: "text-to-music",
      })
      .returning();
    return generation;
  }

  async createAudioToMusicGeneration(userId: string, data: InsertAudioToMusic): Promise<MusicGeneration> {
    const [generation] = await db
      .insert(musicGenerations)
      .values({
        ...data,
        userId,
        type: "audio-to-music",
      })
      .returning();
    return generation;
  }

  async updateMusicGeneration(id: string, updates: Partial<MusicGeneration>): Promise<MusicGeneration> {
    const [generation] = await db
      .update(musicGenerations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(musicGenerations.id, id))
      .returning();
    return generation;
  }

  async getMusicGeneration(id: string): Promise<MusicGeneration | undefined> {
    const [generation] = await db
      .select()
      .from(musicGenerations)
      .where(eq(musicGenerations.id, id));
    return generation;
  }

  async getUserMusicGenerations(userId: string): Promise<MusicGeneration[]> {
    return await db
      .select()
      .from(musicGenerations)
      .where(eq(musicGenerations.userId, userId))
      .orderBy(desc(musicGenerations.createdAt))
      .limit(50);
  }
}

export const storage = new DatabaseStorage();
