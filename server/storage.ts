import {
  users,
  musicGenerations,
  adminUsers,
  subscriptionPlans,
  siteSettings,
  usageAnalytics,
  type User,
  type UpsertUser,
  type MusicGeneration,
  type InsertTextToMusic,
  type InsertAudioToMusic,
  type AdminUser,
  type InsertAdminUser,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type SiteSetting,
  type InsertSiteSetting,
  type UsageAnalytic,
  albums,
  type Album,
  type InsertAlbum,
  shareableLinks,
  type ShareableLink,
  type InsertShareableLink,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, asc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserPublicProfile(username: string): Promise<{ user: User; albums: Album[]; tracks: MusicGeneration[] } | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserEmail(userId: string, newEmail: string): Promise<User | undefined>;
  updateUserPassword(userId: string, newPasswordHash: string): Promise<User | undefined>;
  setEmailVerificationToken(userId: string, token: string, expiry: Date): Promise<void>;
  verifyUserEmail(token: string): Promise<User | null>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  resetUserPassword(token: string, newPasswordHash: string): Promise<User | null>;
  
  // Admin user management operations
  getAllUsers(): Promise<User[]>;
  getAllUsersWithGenerationCount(): Promise<Array<User & { generationCount: number, subscriptionPlan?: SubscriptionPlan }>>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  getUserWithGenerationCount(userId: string): Promise<User & { generationCount: number } | undefined>;
  
  // Music generation operations
  createTextToMusicGeneration(userId: string, data: InsertTextToMusic): Promise<MusicGeneration>;
  createAudioToMusicGeneration(userId: string, data: InsertAudioToMusic): Promise<MusicGeneration>;
  updateMusicGeneration(id: string, updates: Partial<MusicGeneration>): Promise<MusicGeneration>;
  getMusicGeneration(id: string): Promise<MusicGeneration | undefined>;
  getGenerationById(id: string): Promise<MusicGeneration | undefined>;
  findGenerationByKieTaskId(kieTaskId: string): Promise<MusicGeneration | undefined>;
  getUserMusicGenerations(userId: string): Promise<MusicGeneration[]>;
  getMusicGenerationsByAlbumId(albumId: string): Promise<MusicGeneration[]>;
  getPublicMusicGenerations(): Promise<MusicGeneration[]>;
  getAllMusicGenerationsWithUsers(): Promise<Array<MusicGeneration & { user: Pick<User, "id" | "firstName" | "lastName" | "email" | "profileImageUrl"> }>>;
  deleteMusicGeneration(id: string): Promise<void>;
  canUserGenerateMusic(userId: string): Promise<{ canGenerate: boolean; reason?: string; currentUsage: number; maxGenerations: number }>;
  incrementUserGenerationCount(userId: string): Promise<void>;
  resetMonthlyGenerationCounts(): Promise<void>;
  // Album operations
  getUserAlbums(userId: string): Promise<Album[]>;
  getOrCreateDefaultAlbum(userId: string): Promise<Album>;
  createAlbum(userId: string, album: Omit<InsertAlbum, 'id'> & { name: string }): Promise<Album>;
  updateAlbum(id: string, updates: Partial<Album>): Promise<Album>;
  getAlbumById(id: string): Promise<Album | undefined>;
  backfillAlbums(): Promise<void>;
  
  // Shareable links operations
  createShareableLink(albumId: string, userId: string): Promise<ShareableLink>;
  getShareableLinkByToken(token: string): Promise<ShareableLink | undefined>;
  getShareableLinkByAlbumId(albumId: string): Promise<ShareableLink | undefined>;
  deactivateShareableLink(token: string): Promise<void>;
  createShareableLinksTable(): Promise<void>;
  
  // Admin operations
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser>;
  getAllAdminUsers(): Promise<AdminUser[]>;
  updateAdminLastLogin(id: string): Promise<void>;
  
  // Analytics operations
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalGenerations: number;
    publicTracks: number;
    privateTracks: number;
    newUsersToday: number;
    generationsToday: number;
  }>;
  getUsageAnalytics(days: number): Promise<UsageAnalytic[]>;
  
  // Subscription plans operations
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
  deleteSubscriptionPlan(id: string): Promise<void>;
  
  // Site settings operations
  getAllSiteSettings(): Promise<SiteSetting[]>;
  getSiteSetting(key: string): Promise<SiteSetting | undefined>;
  upsertSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting>;
  deleteSiteSetting(key: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserPublicProfile(username: string): Promise<{ user: User; albums: Album[]; tracks: MusicGeneration[] } | undefined> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return undefined;
    }

    // Get all albums for the user
    const userAlbums = await this.getUserAlbums(user.id);

    // Get all public tracks for the user
    const userTracks = await db
      .select()
      .from(musicGenerations)
      .where(and(
        eq(musicGenerations.userId, user.id),
        eq(musicGenerations.visibility, "public"),
        eq(musicGenerations.status, "completed")
      ))
      .orderBy(desc(musicGenerations.createdAt));

    return {
      user,
      albums: userAlbums,
      tracks: userTracks
    };
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
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

  async updateUserEmail(userId: string, newEmail: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        email: newEmail,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, newPasswordHash: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async setEmailVerificationToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({
        emailVerificationToken: token,
        emailVerificationExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async verifyUserEmail(token: string): Promise<User | null> {
    // Find user with valid token
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.emailVerificationToken, token),
          sql`${users.emailVerificationExpiry} > NOW()`
        )
      );

    if (!user) {
      return null;
    }

    // Update user to verified and clear token
    const [verifiedUser] = await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return verifiedUser;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.emailVerificationToken, token),
          sql`${users.emailVerificationExpiry} > NOW()`
        )
      );
    return user;
  }

  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          sql`${users.passwordResetExpiry} > NOW()`
        )
      );
    return user;
  }

  async resetUserPassword(token: string, newPasswordHash: string): Promise<User | null> {
    const user = await this.getUserByPasswordResetToken(token);
    if (!user) {
      return null;
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return updatedUser;
  }

  // Admin user management operations
  async getAllUsers(): Promise<User[]> {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
    return allUsers;
  }

  async getAllUsersWithGenerationCount(): Promise<Array<User & { generationCount: number, subscriptionPlan?: SubscriptionPlan }>> {
    const results = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        passwordHash: users.passwordHash,
        profileImageUrl: users.profileImageUrl,
        emailVerified: users.emailVerified,
        emailVerificationToken: users.emailVerificationToken,
        emailVerificationExpiry: users.emailVerificationExpiry,
        subscriptionPlanId: users.subscriptionPlanId,
        planStatus: users.planStatus,
        generationsUsedThisMonth: users.generationsUsedThisMonth,
        planStartDate: users.planStartDate,
        planEndDate: users.planEndDate,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        generationCount: count(musicGenerations.id).as("generationCount"),
        planName: subscriptionPlans.name,
        planDescription: subscriptionPlans.description,
        maxGenerations: subscriptionPlans.maxGenerations,
      })
      .from(users)
      .leftJoin(musicGenerations, eq(users.id, musicGenerations.userId))
      .leftJoin(subscriptionPlans, eq(users.subscriptionPlanId, subscriptionPlans.id))
      .groupBy(
        users.id,
        users.email,
        users.firstName,
        users.lastName,
        users.passwordHash,
        users.profileImageUrl,
        users.emailVerified,
        users.emailVerificationToken,
        users.emailVerificationExpiry,
        users.subscriptionPlanId,
        users.planStatus,
        users.generationsUsedThisMonth,
        users.planStartDate,
        users.planEndDate,
        users.stripeCustomerId,
        users.stripeSubscriptionId,
        users.createdAt,
        users.updatedAt,
        subscriptionPlans.name,
        subscriptionPlans.description,
        subscriptionPlans.maxGenerations
      )
      .orderBy(desc(users.createdAt));

    return results.map((u) => ({
      ...u,
      generationCount: Number(u.generationCount),
      subscriptionPlan: u.planName
        ? ({ id: u.subscriptionPlanId!, name: u.planName, description: u.planDescription, maxGenerations: u.maxGenerations } as any)
        : undefined,
    }));
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    // First delete all user's music generations
    await db.delete(musicGenerations).where(eq(musicGenerations.userId, userId));
    
    // Then delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  async getUserWithGenerationCount(userId: string): Promise<User & { generationCount: number, subscriptionPlan?: SubscriptionPlan } | undefined> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        passwordHash: users.passwordHash,
        profileImageUrl: users.profileImageUrl,
        emailVerified: users.emailVerified,
        emailVerificationToken: users.emailVerificationToken,
        emailVerificationExpiry: users.emailVerificationExpiry,
        subscriptionPlanId: users.subscriptionPlanId,
        planStatus: users.planStatus,
        generationsUsedThisMonth: users.generationsUsedThisMonth,
        planStartDate: users.planStartDate,
        planEndDate: users.planEndDate,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        generationCount: count(musicGenerations.id).as("generationCount"),
        planName: subscriptionPlans.name,
        planDescription: subscriptionPlans.description,
        maxGenerations: subscriptionPlans.maxGenerations,
      })
      .from(users)
      .leftJoin(musicGenerations, eq(users.id, musicGenerations.userId))
      .leftJoin(subscriptionPlans, eq(users.subscriptionPlanId, subscriptionPlans.id))
      .where(eq(users.id, userId))
      .groupBy(
        users.id,
        users.email,
        users.firstName,
        users.lastName,
        users.passwordHash,
        users.profileImageUrl,
        users.emailVerified,
        users.emailVerificationToken,
        users.emailVerificationExpiry,
        users.subscriptionPlanId,
        users.planStatus,
        users.generationsUsedThisMonth,
        users.planStartDate,
        users.planEndDate,
        users.stripeCustomerId,
        users.stripeSubscriptionId,
        users.createdAt,
        users.updatedAt,
        subscriptionPlans.name,
        subscriptionPlans.description,
        subscriptionPlans.maxGenerations
      );

    const [user] = result;
    if (!user) return undefined;

    return {
      ...user,
      generationCount: Number(user.generationCount),
      subscriptionPlan: user.planName ? {
        id: user.subscriptionPlanId!,
        name: user.planName,
        description: user.planDescription,
        maxGenerations: user.maxGenerations,
      } as any : undefined
    };
  }

  // Music generation operations
  async createTextToMusicGeneration(userId: string, data: InsertTextToMusic): Promise<MusicGeneration> {
    // Ensure albumId exists (fallback to default album)
    let albumId = (data as any).albumId as string | undefined;
    if (!albumId) {
      const album = await this.getOrCreateDefaultAlbum(userId);
      albumId = album.id;
    }

    const [generation] = await db
      .insert(musicGenerations)
      .values({
        ...data,
        userId,
        type: "text-to-music",
        albumId,
      })
      .returning();
    return generation;
  }

  async createAudioToMusicGeneration(userId: string, data: InsertAudioToMusic): Promise<MusicGeneration> {
    // Ensure albumId exists (fallback to default album)
    let albumId = (data as any).albumId as string | undefined;
    if (!albumId) {
      const album = await this.getOrCreateDefaultAlbum(userId);
      albumId = album.id;
    }

    const [generation] = await db
      .insert(musicGenerations)
      .values({
        ...data,
        userId,
        type: "audio-to-music",
        albumId,
        lyrics: (data as any).prompt, // Store prompt in lyrics field for backward compatibility
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

  async canUserGenerateMusic(userId: string): Promise<{ canGenerate: boolean; reason?: string; currentUsage: number; maxGenerations: number }> {
    const userWithPlan = await this.getUserWithGenerationCount(userId);
    
    if (!userWithPlan) {
      return { canGenerate: false, reason: "User not found", currentUsage: 0, maxGenerations: 0 };
    }

    // Get the user's current plan
    const user = await this.getUser(userId);
    if (!user) {
      return { canGenerate: false, reason: "User not found", currentUsage: 0, maxGenerations: 0 };
    }

    // Require an active paid plan
    if (!user.subscriptionPlanId || user.planStatus !== 'active') {
      return {
        canGenerate: false,
        reason: "Please upgrade",
        currentUsage: user.generationsUsedThisMonth || 0,
        maxGenerations: 0,
      };
    }

    // Load plan to determine maxGenerations
    const plan = await this.getSubscriptionPlan(user.subscriptionPlanId);
    if (!plan) {
      return {
        canGenerate: false,
        reason: "Please upgrade",
        currentUsage: user.generationsUsedThisMonth || 0,
        maxGenerations: 0,
      };
    }

    const maxGenerations = plan.maxGenerations;

    const currentUsage = user.generationsUsedThisMonth || 0;
    
    if (currentUsage >= maxGenerations) {
      return { 
        canGenerate: false,
        reason: "Please upgrade",
        currentUsage, 
        maxGenerations 
      };
    }

    return { canGenerate: true, currentUsage, maxGenerations };
  }

  async incrementUserGenerationCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        generationsUsedThisMonth: sql`${users.generationsUsedThisMonth} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async resetMonthlyGenerationCounts(): Promise<void> {
    // Reset all users' generation counts to 0
    await db
      .update(users)
      .set({
        generationsUsedThisMonth: 0,
        updatedAt: new Date(),
      });
  }

  // Album operations
  async getUserAlbums(userId: string): Promise<Album[]> {
    return await db
      .select()
      .from(albums)
      .where(eq(albums.userId, userId))
      .orderBy(albums.createdAt);
  }

  async getOrCreateDefaultAlbum(userId: string): Promise<Album> {
    const rows = await db
      .select()
      .from(albums)
      .where(and(eq(albums.userId, userId), eq(albums.isDefault, true)))
      .limit(1);
    const [existing] = rows;
    if (existing) return existing;

    const [created] = await db
      .insert(albums)
      .values({ userId, name: "My Music", isDefault: true })
      .returning();
    return created;
  }

  async createAlbum(userId: string, albumData: Omit<InsertAlbum, 'id'> & { name: string }): Promise<Album> {
    const [album] = await db
      .insert(albums)
      .values({
        userId,
        name: albumData.name,
        coverUrl: (albumData as any).coverUrl ?? null,
        isDefault: false,
      })
      .returning();
    return album;
  }

  async updateAlbum(id: string, updates: Partial<Album>): Promise<Album> {
    const [album] = await db
      .update(albums)
      .set({
        ...updates,
      })
      .where(eq(albums.id, id))
      .returning();
    return album;
  }

  async getAlbumById(id: string): Promise<Album | undefined> {
    const [album] = await db.select().from(albums).where(eq(albums.id, id));
    return album;
  }

  async backfillAlbums(): Promise<void> {
    // Ensure each user has a default album and assign any songs without albumId
    const allUsers = await this.getAllUsers();
    for (const u of allUsers) {
      const def = await this.getOrCreateDefaultAlbum(u.id);
      // Update generations missing albumId
      await db
        .update(musicGenerations)
        .set({ albumId: def.id, updatedAt: new Date() })
        .where(and(eq(musicGenerations.userId, u.id), sql`${musicGenerations.albumId} IS NULL`));
    }
  }

  // Shareable links implementation
  async createShareableLink(albumId: string, userId: string): Promise<ShareableLink> {
    // Generate a unique token
    const token = crypto.randomUUID().replace(/-/g, '');
    
    // Check if album exists and belongs to user
    const album = await this.getAlbumById(albumId);
    if (!album || album.userId !== userId) {
      throw new Error('Album not found or access denied');
    }
    
    // Deactivate any existing shareable link for this album
    const existingLink = await this.getShareableLinkByAlbumId(albumId);
    if (existingLink) {
      await this.deactivateShareableLink(existingLink.token);
    }
    
    const [link] = await db
      .insert(shareableLinks)
      .values({
        token,
        albumId,
        userId,
        isActive: true,
      })
      .returning();
    
    return link;
  }

  async getShareableLinkByToken(token: string): Promise<ShareableLink | undefined> {
    const [link] = await db
      .select()
      .from(shareableLinks)
      .where(and(eq(shareableLinks.token, token), eq(shareableLinks.isActive, true)));
    return link;
  }

  async getShareableLinkByAlbumId(albumId: string): Promise<ShareableLink | undefined> {
    const [link] = await db
      .select()
      .from(shareableLinks)
      .where(and(eq(shareableLinks.albumId, albumId), eq(shareableLinks.isActive, true)));
    return link;
  }

  async deactivateShareableLink(token: string): Promise<void> {
    await db
      .update(shareableLinks)
      .set({ isActive: false })
      .where(eq(shareableLinks.token, token));
  }

  async createShareableLinksTable(): Promise<void> {
    try {
      // Check if table exists by trying to query it
      await db.execute(sql`SELECT 1 FROM "shareable_links" LIMIT 1`);
      console.log('Shareable links table already exists');
    } catch (error) {
      // Table doesn't exist, create it
      console.log('Creating shareable_links table...');
      await db.execute(sql`
        CREATE TABLE "shareable_links" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          "token" varchar UNIQUE NOT NULL,
          "album_id" varchar NOT NULL REFERENCES "albums"("id"),
          "user_id" varchar NOT NULL REFERENCES "users"("id"),
          "is_active" boolean NOT NULL DEFAULT true,
          "expires_at" timestamp,
          "created_at" timestamp DEFAULT now()
        )
      `);
      console.log('Shareable links table created successfully');
    }
  }

  async getMusicGeneration(id: string): Promise<MusicGeneration | undefined> {
    const [generation] = await db
      .select()
      .from(musicGenerations)
      .where(eq(musicGenerations.id, id));
    return generation;
  }

  async getGenerationById(id: string): Promise<MusicGeneration | undefined> {
    const [generation] = await db
      .select()
      .from(musicGenerations)
      .where(eq(musicGenerations.id, id));
    return generation;
  }

  async findGenerationByKieTaskId(kieTaskId: string): Promise<MusicGeneration | undefined> {
    const [generation] = await db
      .select()
      .from(musicGenerations)
      .where(eq(musicGenerations.kieTaskId, kieTaskId));
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

  async getMusicGenerationsByAlbumId(albumId: string): Promise<MusicGeneration[]> {
    return await db
      .select()
      .from(musicGenerations)
      .where(eq(musicGenerations.albumId, albumId))
      .orderBy(desc(musicGenerations.createdAt));
  }

  async getPublicMusicGenerations(): Promise<MusicGeneration[]> {
    return await db
      .select()
      .from(musicGenerations)
      .where(and(
        eq(musicGenerations.visibility, "public"),
        eq(musicGenerations.status, "completed"),
        eq(musicGenerations.showInGallery, true)
      ))
      .orderBy(desc(musicGenerations.createdAt))
      .limit(20);
  }

  async deleteMusicGeneration(id: string): Promise<void> {
    await db.delete(musicGenerations).where(eq(musicGenerations.id, id));
  }

  // Admin operations
  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return adminUser;
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return adminUser;
  }

  async createAdminUser(adminUserData: InsertAdminUser): Promise<AdminUser> {
    const [adminUser] = await db.insert(adminUsers).values(adminUserData).returning();
    return adminUser;
  }

  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser> {
    const [adminUser] = await db
      .update(adminUsers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
      .returning();
    return adminUser;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers).orderBy(adminUsers.createdAt);
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, id));
  }

  // Admin music tracks operations
  async getAllMusicGenerations(): Promise<MusicGeneration[]> {
    return await db
      .select()
      .from(musicGenerations)
      .orderBy(desc(musicGenerations.createdAt));
  }

  async getAllMusicGenerationsWithUsers(): Promise<Array<MusicGeneration & { user: Pick<User, "id" | "firstName" | "lastName" | "email" | "profileImageUrl"> }>> {
    const rows = await db
      .select({
        id: musicGenerations.id,
        userId: musicGenerations.userId,
        type: musicGenerations.type,
        tags: musicGenerations.tags,
        lyrics: musicGenerations.lyrics,
        duration: musicGenerations.duration,
        audioUrl: musicGenerations.audioUrl,
        seed: musicGenerations.seed,
        status: musicGenerations.status,
        visibility: musicGenerations.visibility,
        showInGallery: musicGenerations.showInGallery,
        title: musicGenerations.title,
        falRequestId: musicGenerations.falRequestId,
        createdAt: musicGenerations.createdAt,
        updatedAt: musicGenerations.updatedAt,
        user_id: users.id,
        user_firstName: users.firstName,
        user_lastName: users.lastName,
        user_email: users.email,
        user_profileImageUrl: users.profileImageUrl,
      })
      .from(musicGenerations)
      .leftJoin(users, eq(musicGenerations.userId, users.id))
      .orderBy(desc(musicGenerations.createdAt));

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      type: r.type as any,
      tags: r.tags,
      lyrics: r.lyrics ?? undefined,
      duration: r.duration ?? undefined,
      audioUrl: r.audioUrl ?? undefined,
      seed: r.seed ?? undefined,
      status: r.status as any,
      visibility: r.visibility as any,
      showInGallery: r.showInGallery,
      title: r.title ?? undefined,
      falRequestId: r.falRequestId ?? undefined,
      createdAt: r.createdAt as any,
      updatedAt: r.updatedAt as any,
      user: {
        id: r.user_id!,
        firstName: r.user_firstName!,
        lastName: r.user_lastName!,
        email: r.user_email!,
        profileImageUrl: r.user_profileImageUrl ?? null,
      },
    }));
  }

  async updateMusicGenerationGalleryVisibility(id: string, showInGallery: boolean): Promise<MusicGeneration> {
    const [generation] = await db
      .update(musicGenerations)
      .set({ showInGallery, updatedAt: new Date() })
      .where(eq(musicGenerations.id, id))
      .returning();
    return generation;
  }

  async updateMusicGenerationTitle(id: string, title: string): Promise<MusicGeneration> {
    const [generation] = await db
      .update(musicGenerations)
      .set({ title, updatedAt: new Date() })
      .where(eq(musicGenerations.id, id))
      .returning();
    return generation;
  }



  // Analytics operations
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalGenerations: number;
    publicTracks: number;
    privateTracks: number;
    newUsersToday: number;
    generationsToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const [totalGenerationsResult] = await db.select({ count: count() }).from(musicGenerations);
    const [publicTracksResult] = await db
      .select({ count: count() })
      .from(musicGenerations)
      .where(eq(musicGenerations.visibility, "public"));
    const [privateTracksResult] = await db
      .select({ count: count() })
      .from(musicGenerations)
      .where(eq(musicGenerations.visibility, "private"));
    const [newUsersTodayResult] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} >= ${today}`);
    const [generationsTodayResult] = await db
      .select({ count: count() })
      .from(musicGenerations)
      .where(sql`${musicGenerations.createdAt} >= ${today}`);

    return {
      totalUsers: totalUsersResult?.count || 0,
      totalGenerations: totalGenerationsResult?.count || 0,
      publicTracks: publicTracksResult?.count || 0,
      privateTracks: privateTracksResult?.count || 0,
      newUsersToday: newUsersTodayResult?.count || 0,
      generationsToday: generationsTodayResult?.count || 0,
    };
  }

  async getUsageAnalytics(days: number): Promise<UsageAnalytic[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select()
      .from(usageAnalytics)
      .where(sql`${usageAnalytics.date} >= ${startDate}`)
      .orderBy(usageAnalytics.date);
  }

  // Subscription plans operations
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.sortOrder);
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async createSubscriptionPlan(planData: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [plan] = await db.insert(subscriptionPlans).values(planData).returning();
    return plan;
  }

  async updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const [plan] = await db
      .update(subscriptionPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return plan;
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  }

  // Site settings operations
  async getAllSiteSettings(): Promise<SiteSetting[]> {
    return await db.select().from(siteSettings).orderBy(siteSettings.category, siteSettings.key);
  }

  async getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return setting;
  }

  async upsertSiteSetting(settingData: InsertSiteSetting): Promise<SiteSetting> {
    const [setting] = await db
      .insert(siteSettings)
      .values(settingData)
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          ...settingData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }

  async deleteSiteSetting(key: string): Promise<void> {
    await db.delete(siteSettings).where(eq(siteSettings.key, key));
  }

  // Admin password operations
  async updateAdminPassword(adminId: string, hashedPassword: string): Promise<void> {
    await db
      .update(adminUsers)
      .set({ 
        passwordHash: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, adminId));
  }
}

export const storage = new DatabaseStorage();
