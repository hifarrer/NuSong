import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupCustomAuth, requireAuth } from "./customAuth";
import { 
  insertTextToMusicSchema, 
  insertAudioToMusicSchema, 
  updateMusicGenerationVisibilitySchema,
  adminLoginSchema,
  insertAdminUserSchema,
  updateAdminUserSchema,
  insertSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
  insertSiteSettingSchema,
  updateSiteSettingSchema,
  updateUserSchema,
} from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { z } from "zod";
import { 
  isAdminAuthenticated, 
  hashPassword, 
  verifyPassword, 
  initializeDefaultAdmin 
} from "./adminAuth";
import { generateLyrics } from "./openaiService";
import { generateMusic } from "./elevenLabsService";
import { ObjectNotFoundError } from "./objectStorage";

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || "36d002d2-c5db-49fe-b02c-5552be87e29e:cb8148d966acf4a68d72e1cb719d6079";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize default admin user
  await initializeDefaultAdmin();
  
  // Custom auth setup
  setupCustomAuth(app);

  // Object storage routes
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.post("/api/objects/normalize-path", requireAuth, async (req, res) => {
    try {
      const { uploadURL } = req.body;
      if (!uploadURL) {
        return res.status(400).json({ message: "Upload URL is required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      res.json({ objectPath });
    } catch (error) {
      console.error("Error normalizing object path:", error);
      res.status(500).json({ message: "Failed to normalize object path" });
    }
  });

  // Text-to-music generation using ElevenLabs
  app.post("/api/generate-text-to-music", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validation = insertTextToMusicSchema.parse(req.body);
      
      // Create generation record
      const generation = await storage.createTextToMusicGeneration(userId, validation);
      
      // Convert duration from seconds to milliseconds
      const durationMs = (validation.duration || 30) * 1000;
      
      // Log the input parameters
      console.log(`\n=== TEXT-TO-MUSIC ELEVENLABS REQUEST ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Generation ID: ${generation.id}`);
      console.log(`Tags: ${validation.tags}`);
      console.log(`Lyrics: ${validation.lyrics || 'N/A'}`);
      console.log(`Duration: ${durationMs}ms`);
      console.log(`=========================================\n`);

      // Generate music using ElevenLabs
      const audioStream = await generateMusic({
        tags: validation.tags,
        lyrics: validation.lyrics || undefined,
        durationMs: durationMs
      });

      // Convert stream to buffer for storage
      const chunks: Uint8Array[] = [];
      const reader = audioStream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      
      const audioBuffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        audioBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Upload to object storage
      const objectStorageService = new ObjectStorageService();
      const filename = `generated-music-${generation.id}.mp3`;
      const uploadUrl = await objectStorageService.uploadAudioBuffer(audioBuffer, filename);
      
      // Update generation with success
      await storage.updateMusicGeneration(generation.id, {
        status: "completed",
        audioUrl: uploadUrl,
      });

      res.json({ 
        generationId: generation.id, 
        status: "completed",
        audioUrl: uploadUrl 
      });
    } catch (error) {
      console.error("Error generating music with ElevenLabs:", error);
      
      // Update generation with failure
      try {
        await storage.updateMusicGeneration(req.body.generationId || '', { status: "failed" });
      } catch (updateError) {
        console.error("Error updating generation status:", updateError);
      }
      
      res.status(500).json({ message: "Failed to generate music" });
    }
  });

  // Audio-to-music generation
  app.post("/api/generate-audio-to-music", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validation = insertAudioToMusicSchema.parse(req.body);
      
      // Create generation record
      const generation = await storage.createAudioToMusicGeneration(userId, validation);
      
      // Validate audio URL is provided
      if (!validation.inputAudioUrl) {
        return res.status(400).json({ message: "Audio file URL is required" });
      }

      // Get publicly accessible URL for the audio file
      const objectStorageService = new ObjectStorageService();
      const publicAudioUrl = await objectStorageService.getObjectEntityPublicUrl(validation.inputAudioUrl, 7200); // 2 hours
      
      // Prepare API request payload
      const apiPayload = {
        audio_url: publicAudioUrl,
        tags: validation.tags,
        original_tags: validation.tags, // Copy tags to original_tags as required by FAL.ai
        lyrics: validation.lyrics || "",
      };

      // Log the input parameters being sent to FAL.ai
      console.log(`\n=== AUDIO-TO-MUSIC API REQUEST ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Generation ID: ${generation.id}`);
      console.log(`API Payload being sent to FAL.ai:`);
      console.log(JSON.stringify(apiPayload, null, 2));
      console.log(`==================================\n`);

      // Submit request to FAL.ai
      const falResponse = await fetch("https://queue.fal.run/fal-ai/ace-step/audio-to-audio", {
        method: "POST",
        headers: {
          "Authorization": `Key ${FAL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiPayload)
      });

      if (!falResponse.ok) {
        const errorText = await falResponse.text();
        console.error("FAL.ai API error:", errorText);
        await storage.updateMusicGeneration(generation.id, { status: "failed" });
        return res.status(500).json({ message: "Failed to submit audio generation request" });
      }

      const falResult = await falResponse.json();
      const requestId = falResult.request_id;

      // Update generation with FAL request ID
      await storage.updateMusicGeneration(generation.id, {
        status: "generating",
        falRequestId: requestId,
      });

      res.json({ generationId: generation.id, requestId });
    } catch (error) {
      console.error("Error generating audio-to-music:", error);
      res.status(500).json({ message: "Failed to generate audio-to-music" });
    }
  });

  app.get("/api/generation/:id/status", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const generation = await storage.getMusicGeneration(id);
      if (!generation || generation.userId !== userId) {
        return res.status(404).json({ message: "Generation not found" });
      }

      // If already completed, return the result
      if (generation.status === "completed" || generation.status === "failed") {
        return res.json(generation);
      }

      // Check FAL.ai status
      if (generation.falRequestId) {
        const falResponse = await fetch(
          `https://queue.fal.run/fal-ai/ace-step/requests/${generation.falRequestId}/status`,
          {
            headers: {
              "Authorization": `Key ${FAL_KEY}`,
            },
          }
        );

        if (falResponse.ok) {
          const falStatus = await falResponse.json();
          
          if (falStatus.status === "COMPLETED") {
            // Get the result
            const resultResponse = await fetch(
              `https://queue.fal.run/fal-ai/ace-step/requests/${generation.falRequestId}`,
              {
                headers: {
                  "Authorization": `Key ${FAL_KEY}`,
                },
              }
            );

            if (resultResponse.ok) {
              const result = await resultResponse.json();
              const updatedGeneration = await storage.updateMusicGeneration(id, {
                status: "completed",
                audioUrl: result.audio?.url,
                seed: result.seed,
              });
              return res.json(updatedGeneration);
            }
          } else if (falStatus.status === "FAILED") {
            const updatedGeneration = await storage.updateMusicGeneration(id, {
              status: "failed",
            });
            return res.json(updatedGeneration);
          }
        }
      }

      res.json(generation);
    } catch (error) {
      console.error("Error checking generation status:", error);
      res.status(500).json({ message: "Failed to check generation status" });
    }
  });

  app.get("/api/my-generations", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const generations = await storage.getUserMusicGenerations(userId);
      res.json(generations);
    } catch (error) {
      console.error("Error fetching user generations:", error);
      res.status(500).json({ message: "Failed to fetch generations" });
    }
  });

  // Get public music tracks for gallery
  // Public plans endpoint
  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans.filter(plan => plan.isActive));
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.get("/api/public-tracks", async (req, res) => {
    try {
      const tracks = await storage.getPublicMusicGenerations();
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching public tracks:", error);
      res.status(500).json({ message: "Failed to fetch public tracks" });
    }
  });

  // Get individual track (public access)
  app.get("/api/track/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const track = await storage.getMusicGeneration(id);
      
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      
      // Only allow access to public tracks or if user owns the track
      if (track.visibility === "private") {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Authentication required" });
        }
        
        const user = req.user as any;
        if (track.userId !== user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      res.json(track);
    } catch (error) {
      console.error("Error fetching track:", error);
      res.status(500).json({ message: "Failed to fetch track" });
    }
  });

  // Update track visibility and title
  app.patch("/api/generation/:id/visibility", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const validation = updateMusicGenerationVisibilitySchema.parse(req.body);

      const generation = await storage.getMusicGeneration(id);
      if (!generation || generation.userId !== userId) {
        return res.status(404).json({ message: "Generation not found" });
      }

      const updatedGeneration = await storage.updateMusicGeneration(id, {
        visibility: validation.visibility,
        title: validation.title,
      });

      res.json(updatedGeneration);
    } catch (error) {
      console.error("Error updating generation visibility:", error);
      res.status(500).json({ message: "Failed to update generation visibility" });
    }
  });

  // Delete music generation
  app.delete("/api/generation/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const generation = await storage.getMusicGeneration(id);
      if (!generation || generation.userId !== userId) {
        return res.status(404).json({ message: "Generation not found" });
      }

      await storage.deleteMusicGeneration(id);
      res.status(200).json({ message: "Track deleted successfully" });
    } catch (error) {
      console.error("Error deleting generation:", error);
      res.status(500).json({ message: "Failed to delete track" });
    }
  });

  // ===== ADMIN ROUTES =====
  
  // Admin login
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = adminLoginSchema.parse(req.body);
      
      const adminUser = await storage.getAdminUserByUsername(username);
      if (!adminUser || !adminUser.isActive) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const isValidPassword = await verifyPassword(password, adminUser.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Update last login
      await storage.updateAdminLastLogin(adminUser.id);
      
      // Set admin session
      req.session.adminUserId = adminUser.id;
      
      // Return admin user (without password hash)
      const { passwordHash, ...adminUserResponse } = adminUser;
      res.json(adminUserResponse);
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });
  
  // Admin logout
  app.post('/api/admin/logout', (req, res) => {
    req.session.adminUserId = undefined;
    res.json({ message: 'Logged out' });
  });
  
  // Get current admin user
  app.get('/api/admin/user', isAdminAuthenticated, async (req, res) => {
    const { passwordHash, ...adminUserResponse } = req.adminUser!;
    res.json(adminUserResponse);
  });
  
  // Dashboard stats
  app.get('/api/admin/dashboard/stats', isAdminAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });
  
  // User management
  app.get('/api/admin/users', isAdminAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllAdminUsers();
      const userList = users.map(({ passwordHash, ...user }) => user);
      res.json(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });
  
  app.post('/api/admin/users', isAdminAuthenticated, async (req, res) => {
    try {
      const userData = insertAdminUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(userData.password);
      
      const newUser = await storage.createAdminUser({
        ...userData,
        passwordHash: hashedPassword,
      });
      
      const { passwordHash, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error('Error creating admin user:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });
  
  app.put('/api/admin/users/:id', isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = updateAdminUserSchema.parse(req.body);
      
      const updates: any = { ...updateData };
      if (updateData.newPassword) {
        updates.passwordHash = await hashPassword(updateData.newPassword);
        delete updates.newPassword;
      }
      
      const updatedUser = await storage.updateAdminUser(id, updates);
      const { passwordHash, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error('Error updating admin user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });
  
  // Subscription plans management
  app.get('/api/admin/plans', isAdminAuthenticated, async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      res.status(500).json({ message: 'Failed to fetch subscription plans' });
    }
  });
  
  app.post('/api/admin/plans', isAdminAuthenticated, async (req, res) => {
    try {
      const planData = insertSubscriptionPlanSchema.parse(req.body);
      const newPlan = await storage.createSubscriptionPlan(planData);
      res.status(201).json(newPlan);
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      res.status(500).json({ message: 'Failed to create subscription plan' });
    }
  });
  
  app.put('/api/admin/plans/:id', isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = updateSubscriptionPlanSchema.parse(req.body);
      const updatedPlan = await storage.updateSubscriptionPlan(id, updateData);
      res.json(updatedPlan);
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      res.status(500).json({ message: 'Failed to update subscription plan' });
    }
  });
  
  app.delete('/api/admin/plans/:id', isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubscriptionPlan(id);
      res.json({ message: 'Subscription plan deleted' });
    } catch (error) {
      console.error('Error deleting subscription plan:', error);
      res.status(500).json({ message: 'Failed to delete subscription plan' });
    }
  });
  
  // Admin music tracks management
  app.get('/api/admin/tracks', isAdminAuthenticated, async (req, res) => {
    try {
      const tracks = await storage.getAllMusicGenerations();
      res.json(tracks);
    } catch (error) {
      console.error('Error fetching admin tracks:', error);
      res.status(500).json({ message: 'Failed to fetch tracks' });
    }
  });

  app.patch('/api/admin/tracks/:id/gallery-visibility', isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { showInGallery } = req.body;
      
      if (typeof showInGallery !== 'boolean') {
        return res.status(400).json({ message: 'showInGallery must be a boolean' });
      }
      
      const updatedTrack = await storage.updateMusicGenerationGalleryVisibility(id, showInGallery);
      res.json(updatedTrack);
    } catch (error) {
      console.error('Error updating track gallery visibility:', error);
      res.status(500).json({ message: 'Failed to update track gallery visibility' });
    }
  });

  app.patch('/api/admin/tracks/:id/title', isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      
      if (typeof title !== 'string') {
        return res.status(400).json({ message: 'title must be a string' });
      }
      
      if (title.trim().length === 0) {
        return res.status(400).json({ message: 'title cannot be empty' });
      }
      
      if (title.length > 100) {
        return res.status(400).json({ message: 'title must be 100 characters or less' });
      }
      
      const updatedTrack = await storage.updateMusicGenerationTitle(id, title.trim());
      res.json(updatedTrack);
    } catch (error) {
      console.error('Error updating track title:', error);
      res.status(500).json({ message: 'Failed to update track title' });
    }
  });

  // Delete track endpoint
  app.delete('/api/admin/tracks/:id', isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if track exists
      const existingTrack = await storage.getMusicGeneration(id);
      if (!existingTrack) {
        return res.status(404).json({ message: 'Track not found' });
      }
      
      await storage.deleteMusicGeneration(id);
      res.json({ message: 'Track deleted successfully' });
    } catch (error) {
      console.error('Error deleting track:', error);
      res.status(500).json({ message: 'Failed to delete track' });
    }
  });
  
  // Site settings management
  app.get('/api/admin/settings', isAdminAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getAllSiteSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching site settings:', error);
      res.status(500).json({ message: 'Failed to fetch site settings' });
    }
  });
  
  app.post('/api/admin/settings', isAdminAuthenticated, async (req, res) => {
    try {
      const settingData = insertSiteSettingSchema.parse(req.body);
      const newSetting = await storage.upsertSiteSetting(settingData);
      res.status(201).json(newSetting);
    } catch (error) {
      console.error('Error creating site setting:', error);
      res.status(500).json({ message: 'Failed to create site setting' });
    }
  });
  
  app.put('/api/admin/settings', isAdminAuthenticated, async (req, res) => {
    try {
      const { key, value } = req.body;
      
      // Determine category based on key prefix
      let category = 'general';
      if (key.startsWith('stripe_')) {
        category = 'stripe';
      } else if (key.startsWith('webhook_')) {
        category = 'webhook';
      }
      
      const updatedSetting = await storage.upsertSiteSetting({ 
        key, 
        value: value || '',
        category,
        description: `Setting for ${key.replace(/_/g, ' ')}`
      });
      res.json(updatedSetting);
    } catch (error) {
      console.error('Error updating site setting:', error);
      res.status(500).json({ message: 'Failed to update site setting' });
    }
  });
  
  app.delete('/api/admin/settings/:key', isAdminAuthenticated, async (req, res) => {
    try {
      const { key } = req.params;
      await storage.deleteSiteSetting(key);
      res.json({ message: 'Site setting deleted' });
    } catch (error) {
      console.error('Error deleting site setting:', error);
      res.status(500).json({ message: 'Failed to delete site setting' });
    }
  });

  // Admin password change
  app.put('/api/admin/change-password', isAdminAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const adminId = (req as any).adminUser?.id;
      
      if (!adminId) {
        return res.status(401).json({ message: 'Admin not found' });
      }

      // Verify current password
      const admin = await storage.getAdminUser(adminId);
      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateAdminPassword(adminId, hashedPassword);
      
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error changing admin password:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  // Update user subscription plan
  app.put('/api/admin/regular-users/:id/plan', isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { planId, status } = req.body;

      // Check if user exists
      const existingUser = await storage.getUserById(id);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Validate plan if provided
      if (planId) {
        const plan = await storage.getSubscriptionPlan(planId);
        if (!plan) {
          return res.status(400).json({ message: 'Invalid subscription plan' });
        }
      }

      // Prepare update data
      const updates: any = {
        subscriptionPlanId: planId || null,
        planStatus: status || (planId ? 'active' : 'free'),
        generationsUsedThisMonth: 0, // Reset usage when changing plans
      };

      // Set plan dates if activating a plan
      if (planId && status === 'active') {
        updates.planStartDate = new Date();
        // Set end date 30 days from now
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        updates.planEndDate = endDate;
      } else if (!planId || status === 'free') {
        updates.planStartDate = null;
        updates.planEndDate = null;
      }

      const updatedUser = await storage.updateUser(id, updates);
      
      // Remove password hash from response
      const { passwordHash, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error('Error updating user plan:', error);
      res.status(500).json({ message: 'Failed to update user plan' });
    }
  });

  // ===== REGULAR USER MANAGEMENT ROUTES (Admin Only) =====
  
  // Get all regular users
  app.get('/api/admin/regular-users', isAdminAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove password hash from response for security
      const userList = users.map(({ passwordHash, ...user }) => user);
      res.json(userList);
    } catch (error) {
      console.error('Error fetching regular users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Get single regular user with generation count
  app.get('/api/admin/regular-users/:id', isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUserWithGenerationCount(id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Remove password hash from response
      const { passwordHash, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Update regular user
  app.put('/api/admin/regular-users/:id', isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateUserSchema.parse(req.body);

      // Check if user exists
      const existingUser = await storage.getUserById(id);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // If email is being updated, check for conflicts
      if (updates.email && updates.email !== existingUser.email) {
        const emailConflict = await storage.getUserByEmail(updates.email);
        if (emailConflict && emailConflict.id !== id) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      const updatedUser = await storage.updateUser(id, updates);
      
      // Remove password hash from response
      const { passwordHash, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error('Error updating user:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data' });
      }
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Delete regular user
  app.delete('/api/admin/regular-users/:id', isAdminAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const existingUser = await storage.getUserById(id);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.deleteUser(id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Generate lyrics endpoint
  app.post('/api/generate-lyrics', requireAuth, async (req, res) => {
    try {
      const { prompt, duration = 60 } = req.body;
      
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ message: 'Prompt is required' });
      }

      const lyrics = await generateLyrics(prompt.trim(), duration);
      res.json({ lyrics });
    } catch (error) {
      console.error('Error generating lyrics:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to generate lyrics' 
      });
    }
  });

  // Serve generated audio files from object storage
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Stream the file with proper content type
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
