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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, asc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  getUserWithGenerationCount(userId: string): Promise<User & { generationCount: number } | undefined>;
  
  // Music generation operations
  createTextToMusicGeneration(userId: string, data: InsertTextToMusic): Promise<MusicGeneration>;
  createAudioToMusicGeneration(userId: string, data: InsertAudioToMusic): Promise<MusicGeneration>;
  updateMusicGeneration(id: string, updates: Partial<MusicGeneration>): Promise<MusicGeneration>;
  getMusicGeneration(id: string): Promise<MusicGeneration | undefined>;
  getUserMusicGenerations(userId: string): Promise<MusicGeneration[]>;
  getPublicMusicGenerations(): Promise<MusicGeneration[]>;
  deleteMusicGeneration(id: string): Promise<void>;
  
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
