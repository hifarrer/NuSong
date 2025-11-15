import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { pool } from "./db";
import { setupCustomAuth, requireAuth } from "./customAuth";
import * as elevenLabsService from "./elevenLabsService";
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
  insertPlaylistSchema,
  updatePlaylistSchema,
  insertBandSchema,
  updateBandSchema,
  insertBandMemberSchema,
  updateBandMemberSchema,
  insertTrackCommentSchema,
} from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { LocalStorageService } from "./localStorage";
import { RenderStorageService } from "./renderStorage";
import { GCSStorageService } from "./gcsStorage";
import fetch from 'node-fetch';
import { z } from "zod";
import { 
  isAdminAuthenticated, 
  hashPassword, 
  verifyPassword, 
  initializeDefaultAdmin 
} from "./adminAuth";
import { generateLyrics, generateVideoScenes } from "./openaiService";
import { generateMusic, buildPromptFromTags, checkTaskStatus, generateSceneImage, checkSceneTaskStatus } from "./kieService";
import { trimAudio, splitAudio, downloadAndSaveAudioParts, mergeVideos, downloadAndSaveFinalVideo } from "./ffmpegService";
import { wavespeedService } from "./wavespeedService";
import { ObjectNotFoundError } from "./objectStorage";
import { createSlug } from "./urlUtils";
import { createMuxAssetForVideo } from "./services/muxJobs.js";
import { 
  createCheckoutSession, 
  createCustomerPortalSession, 
  handleWebhookEvent, 
  verifyWebhookSignature,
  cancelSubscription,
  reactivateSubscription
} from "./stripeService";
import { EmailService } from "./emailService";
import Stripe from 'stripe';
import { spawn } from 'child_process';
import type { Request } from 'express';

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || "36d002d2-c5db-49fe-b02c-5552be87e29e:cb8148d966acf4a68d72e1cb719d6079";

// In-memory cache for 30s trimmed audio URLs by trackId
const trimmedAudioCache = new Map<string, string>();

// Helper function to get the appropriate storage service
export function getStorageService() {
  console.log('🔍 Storage Service Selection:');
  console.log(`  - STORAGE_PROVIDER: ${process.env.STORAGE_PROVIDER}`);
  console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  - GOOGLE_APPLICATION_CREDENTIALS_JSON: ${process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'SET' : 'NOT SET'}`);
  console.log(`  - GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME || 'NOT SET'}`);
  
  if (process.env.STORAGE_PROVIDER === 'gcs' && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    console.log('  ✅ Using GCS Storage Service');
    return new GCSStorageService();
  }
  
  if (process.env.NODE_ENV === "development") {
    console.log('  ✅ Using Local Storage Service (development)');
    return new LocalStorageService();
  } else {
    console.log('  ✅ Using Render Storage Service (production)');
    return new RenderStorageService();
  }
}

// Check if running locally (development)
const isLocal = process.env.NODE_ENV === 'development' || 
               process.env.NODE_ENV !== 'production' ||
               !process.env.DATABASE_URL?.includes('render.com');

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize default admin user
  if (isLocal) {
    console.log("🏠 Running locally - skipping admin initialization (database not accessible)");
  } else {
    try {
      await initializeDefaultAdmin();
    } catch (e) {
      console.error("Admin initialization failed:", e);
      // Don't exit - continue with server startup
    }
  }
  
  // Custom auth setup
  setupCustomAuth(app);

  // Object storage routes
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      const storageService = getStorageService();
      
      const uploadURL = await storageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Album routes
  app.get("/api/albums", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // Ensure default album exists
      await storage.getOrCreateDefaultAlbum(userId);
      const albums = await storage.getUserAlbums(userId);
      
      // Convert object paths to direct public URLs
      const storageService = getStorageService();
      const updatedAlbums = await Promise.all(albums.map(async (album) => {
        if (album.coverUrl && album.coverUrl.startsWith('/objects/')) {
          try {
            // Convert to direct public URL
            const directUrl = storageService.getObjectEntityDirectPublicUrl(album.coverUrl);
            if (directUrl !== album.coverUrl) {
              // Update the album with the direct URL
              await storage.updateAlbum(album.id, { coverUrl: directUrl } as any);
              return { ...album, coverUrl: directUrl };
            }
          } catch (e) {
            console.error('Failed to convert cover URL for album:', album.id, e);
            // Keep the original URL if conversion fails
          }
        }
        return album;
      }));
      
      res.json(updatedAlbums);
    } catch (error) {
      console.error("Error fetching albums:", error);
      res.status(500).json({ message: "Failed to fetch albums" });
    }
  });

  app.post("/api/albums", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, coverUrl } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ message: "Album name is required" });
      }
      const album = await storage.createAlbum(userId, { name: String(name).trim(), coverUrl: coverUrl || undefined } as any);
      res.json(album);
    } catch (error) {
      console.error("Error creating album:", error);
      res.status(500).json({ message: "Failed to create album" });
    }
  });

  // Refresh album cover URL (for expired URLs)
  app.post("/api/albums/:id/refresh-cover", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const album = await storage.getAlbumById(id);
      if (!album || album.userId !== userId) {
        return res.status(404).json({ message: "Album not found" });
      }
      
      if (!album.coverUrl || !album.coverUrl.startsWith('/objects/')) {
        return res.status(400).json({ message: "Album does not have a cover image to refresh" });
      }
      
      try {
        const storageService = getStorageService();
        const refreshedUrl = storageService.getObjectEntityDirectPublicUrl(album.coverUrl);
        const updated = await storage.updateAlbum(id, { coverUrl: refreshedUrl } as any);
        res.json({ album: updated, coverUrl: refreshedUrl });
      } catch (e) {
        console.error('Failed to get direct public url:', e);
        res.status(500).json({ message: "Failed to get direct public URL" });
      }
    } catch (error) {
      console.error("Error refreshing album cover:", error);
      res.status(500).json({ message: "Failed to refresh album cover" });
    }
  });

  // Update album (name or coverUrl)
  app.patch("/api/albums/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { name, coverUrl } = req.body || {};
      const album = await storage.getAlbumById(id);
      if (!album || album.userId !== userId) {
        return res.status(404).json({ message: "Album not found" });
      }
      let finalCoverUrl = coverUrl;
      if (typeof coverUrl === 'string' && coverUrl.startsWith('/objects/')) {
        try {
          const storageService = getStorageService();
          finalCoverUrl = storageService.getObjectEntityDirectPublicUrl(coverUrl);
        } catch (e) {
          console.error('Failed to get direct public url:', e);
        }
      }
      const updated = await storage.updateAlbum(id, {
        name: typeof name === 'string' && name.trim() ? String(name).trim() : album.name,
        coverUrl: typeof finalCoverUrl === 'string' ? finalCoverUrl : album.coverUrl,
      } as any);
      res.json(updated);
    } catch (error) {
      console.error("Error updating album:", error);
      res.status(500).json({ message: "Failed to update album" });
    }
  });

  // Public contact form endpoint
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, subject, message } = req.body || {};
      if (!name || !email || !message) {
        return res.status(400).json({ message: 'Name, email, and message are required' });
      }
      await EmailService.sendContactEmail(String(name), String(email), String(subject || ''), String(message));
      res.json({ message: 'Message sent' });
    } catch (error) {
      console.error('Error sending contact email:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  app.post("/api/objects/normalize-path", requireAuth, async (req, res) => {
    try {
      const { uploadURL } = req.body;
      if (!uploadURL) {
        return res.status(400).json({ message: "Upload URL is required" });
      }
      
      const storageService = getStorageService();
      
      const normalizedUrlOrPath = storageService.normalizeObjectEntityPath(uploadURL);
      res.json({ objectPath: normalizedUrlOrPath });
    } catch (error) {
      console.error("Error normalizing object path:", error);
      res.status(500).json({ message: "Failed to normalize object path" });
    }
  });

  // Generate album cover via Wavespeed.ai and store to GCS
  app.post('/api/albums/:id/generate-cover', requireAuth, async (req: any, res) => {
    console.log('Generate cover endpoint hit:', { userId: req.user?.id, albumId: req.params.id, prompt: req.body?.prompt });
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { prompt } = req.body || {};
      if (!prompt || !String(prompt).trim()) {
        return res.status(400).json({ message: 'Prompt is required' });
      }

      const album = await storage.getAlbumById(id);
      if (!album || album.userId !== userId) {
        return res.status(404).json({ message: 'Album not found' });
      }

      const apiKey = process.env.WAVESPEED_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: 'Wavespeed API key not configured' });
      }

      // Kick off generation
      const requestBody = {
        enable_base64_output: false,
        enable_prompt_expansion: true,
        enable_sync_mode: false,
        prompt: `create an album cover for ${String(prompt)}`,
        seed: -1,
        size: '822*822',
      };
      
      console.log('Wavespeed request:', {
        url: 'https://api.wavespeed.ai/api/v3/bytedance/dreamina-v3.1/text-to-image',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
        },
        body: requestBody,
      });
      
      const createResp = await fetch('https://api.wavespeed.ai/api/v3/bytedance/dreamina-v3.1/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Wavespeed response status:', createResp.status, createResp.statusText);
      
      if (!createResp.ok) {
        const txt = await createResp.text();
        console.error('Wavespeed API error:', { status: createResp.status, statusText: createResp.statusText, body: txt });
        return res.status(500).json({ message: 'Failed to start cover generation', detail: txt });
      }
      const createData = await createResp.json();
      console.log('Wavespeed create response:', createData);
      
      const requestId = createData?.data?.id || createData?.id || createData?.requestId;
      if (!requestId) {
        console.error('No requestId found in Wavespeed response:', createData);
        return res.status(500).json({ message: 'Invalid Wavespeed response' });
      }
      
      console.log('Wavespeed requestId:', requestId);

      // Poll for result (simple short-poll loop up to ~30s)
      let imageUrl: string | undefined;
      const maxAttempts = 15;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusResp = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!statusResp.ok) continue;
        const statusJson = await statusResp.json();
        if (statusJson?.code === 200 && statusJson?.data?.status === 'completed' && Array.isArray(statusJson?.data?.outputs) && statusJson.data.outputs.length > 0) {
          imageUrl = statusJson.data.outputs[0];
          break;
        }
      }

      if (!imageUrl) {
        return res.status(202).json({ message: 'Generation in progress', requestId });
      }

      // Download the image and upload using the same flow as audio uploader (signed PUT → normalize → sign public)
      const imgResp = await fetch(imageUrl);
      if (!imgResp.ok) {
        return res.status(500).json({ message: 'Failed to download generated image' });
      }
      const arrayBuf = await imgResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      const storageService = getStorageService();
      // 1) Get a signed upload URL
      const uploadURL = await storageService.getObjectEntityUploadURL();
      // 2) Upload the image bytes
      const putResp = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer,
      });
      if (!putResp.ok) {
        const t = await putResp.text().catch(() => '');
        console.error('Cover upload failed:', putResp.status, t);
        return res.status(500).json({ message: 'Failed to upload generated image' });
      }
      // 3) Normalize path
      const objectPath = storageService.normalizeObjectEntityPath(uploadURL);
      // 4) Get a direct public URL (no expiration)
      const publicUrl = storageService.getObjectEntityDirectPublicUrl(objectPath);
      const updated = await storage.updateAlbum(id, { coverUrl: publicUrl } as any);
      res.json({ album: updated, coverUrl: publicUrl });
    } catch (error) {
      console.error('Error generating album cover:', error);
      console.error('Error details:', { 
        message: error instanceof Error ? error.message : String(error), 
        stack: error instanceof Error ? error.stack : undefined,
        userId: req.user?.id,
        albumId: req.params.id,
        prompt: req.body?.prompt 
      });
      res.status(500).json({ message: 'Failed to generate album cover' });
    }
  });

  // Create shareable link for album
  app.post('/api/albums/:id/share', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Get user and album details for new hierarchical URL
      const user = await storage.getUser(userId);
      const album = await storage.getAlbumById(id);
      
      if (!user || !album || album.userId !== userId) {
        return res.status(404).json({ message: 'Album not found' });
      }
      
      // Generate new hierarchical share URL as primary using album name slug
      const albumSlug = createSlug(album.name || 'untitled');
      const newShareUrl = `${req.protocol}://${req.get('host')}/u/${user.username}/${albumSlug}`;
      
      // Still create token-based link for backwards compatibility
      const shareableLink = await storage.createShareableLink(id, userId);
      const tokenShareUrl = `${req.protocol}://${req.get('host')}/share/${shareableLink.token}`;
      
      res.json({ 
        shareUrl: newShareUrl,
        tokenShareUrl: tokenShareUrl,
        token: shareableLink.token,
        expiresAt: shareableLink.expiresAt 
      });
    } catch (error) {
      console.error('Error creating shareable link:', error);
      res.status(500).json({ message: 'Failed to create shareable link' });
    }
  });

  // Get existing shareable link for album
  app.get('/api/albums/:id/share', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Get user and album details for new hierarchical URL
      const user = await storage.getUser(userId);
      const album = await storage.getAlbumById(id);
      
      if (!user || !album || album.userId !== userId) {
        return res.status(404).json({ message: 'Album not found' });
      }
      
      // Generate new hierarchical share URL as primary using album name slug
      const albumSlug = createSlug(album.name || 'untitled');
      const newShareUrl = `${req.protocol}://${req.get('host')}/u/${user.username}/${albumSlug}`;
      
      const shareableLink = await storage.getShareableLinkByAlbumId(id);
      if (!shareableLink) {
        return res.status(404).json({ message: 'No shareable link found' });
      }
      
      const tokenShareUrl = `${req.protocol}://${req.get('host')}/share/${shareableLink.token}`;
      
      res.json({ 
        shareUrl: newShareUrl,
        tokenShareUrl: tokenShareUrl,
        token: shareableLink.token,
        expiresAt: shareableLink.expiresAt 
      });
    } catch (error) {
      console.error('Error getting shareable link:', error);
      res.status(500).json({ message: 'Failed to get shareable link' });
    }
  });

  // Generate profile share URL
  app.get('/api/profile/share', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const shareUrl = `${req.protocol}://${req.get('host')}/u/${user.username}`;
      
      res.json({ shareUrl });
    } catch (error) {
      console.error('Error getting profile share URL:', error);
      res.status(500).json({ message: 'Failed to get profile share URL' });
    }
  });

  // Generate track share URL
  app.get('/api/tracks/:id/share', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const user = await storage.getUser(userId);
      const track = await storage.getMusicGeneration(id);
      
      if (!user || !track || track.userId !== userId) {
        return res.status(404).json({ message: 'Track not found' });
      }
      
      if (!track.albumId) {
        return res.status(400).json({ message: 'Track is not associated with an album' });
      }
      
      // Get album to create slug
      const album = await storage.getAlbumById(track.albumId);
      if (!album || !album.name) {
        return res.status(404).json({ message: 'Album not found' });
      }
      const albumSlug = createSlug(album.name);
      const shareUrl = `${req.protocol}://${req.get('host')}/u/${user.username}/${albumSlug}/${id}`;
      
      res.json({ shareUrl });
    } catch (error) {
      console.error('Error getting track share URL:', error);
      res.status(500).json({ message: 'Failed to get track share URL' });
    }
  });

  // Public user profile (no auth required)
  app.get('/api/profile/:username', async (req: any, res) => {
    try {
      const { username } = req.params;
      
      const profileData = await storage.getUserPublicProfile(username);
      if (!profileData) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        user: {
          id: profileData.user.id,
          username: profileData.user.username,
          firstName: profileData.user.firstName,
          lastName: profileData.user.lastName,
          profileImageUrl: profileData.user.profileImageUrl,
          createdAt: profileData.user.createdAt
        },
        albums: profileData.albums.map(album => ({
          id: album.id,
          name: album.name,
          coverUrl: album.coverUrl,
          createdAt: album.createdAt
        })),
        tracks: profileData.tracks.map(track => ({
          id: track.id,
          title: track.title,
          tags: track.tags,
          lyrics: track.lyrics,
          audioUrl: track.audioUrl,
          imageUrl: track.imageUrl,
          duration: track.duration,
          type: track.type,
          createdAt: track.createdAt
        }))
      });
    } catch (error) {
      console.error('Error getting public profile:', error);
      res.status(500).json({ message: 'Failed to get public profile' });
    }
  });

  // New hierarchical URL structure - Public user profile (no auth required)
  app.get('/api/u/:username', async (req: any, res) => {
    try {
      const { username } = req.params;
      
      const profileData = await storage.getUserPublicProfile(username);
      if (!profileData) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Convert object paths to direct public URLs for albums
      const storageService = getStorageService();
      const updatedAlbums = await Promise.all(profileData.albums.map(async (album) => {
        if (album.coverUrl && album.coverUrl.startsWith('/objects/')) {
          try {
            const directUrl = storageService.getObjectEntityDirectPublicUrl(album.coverUrl);
            if (directUrl !== album.coverUrl) {
              // Update the album with the direct URL
              await storage.updateAlbum(album.id, { coverUrl: directUrl } as any);
              return { ...album, coverUrl: directUrl };
            }
          } catch (e) {
            console.error('Failed to convert cover URL for album:', album.id, e);
            // Keep the original URL if conversion fails
          }
        }
        return album;
      }));
      
      res.json({
        user: {
          id: profileData.user.id,
          username: profileData.user.username,
          firstName: profileData.user.firstName,
          lastName: profileData.user.lastName,
          profileImageUrl: profileData.user.profileImageUrl,
          createdAt: profileData.user.createdAt
        },
        albums: updatedAlbums.map(album => ({
          id: album.id,
          name: album.name,
          coverUrl: album.coverUrl,
          createdAt: album.createdAt
        })),
        tracks: profileData.tracks.map(track => ({
          id: track.id,
          title: track.title,
          tags: track.tags,
          lyrics: track.lyrics,
          audioUrl: track.audioUrl,
          imageUrl: track.imageUrl,
          duration: track.duration,
          type: track.type,
          createdAt: track.createdAt
        }))
      });
    } catch (error) {
      console.error('Error getting public profile:', error);
      res.status(500).json({ message: 'Failed to get public profile' });
    }
  });

  // Public album view (no auth required)
  app.get('/api/u/:username/:albumSlug', async (req: any, res) => {
    try {
      const { username, albumSlug } = req.params;
      
      // Get user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get all albums for the user and find the one with matching slug
      const userAlbums = await storage.getUserAlbums(user.id);
      const album = userAlbums.find(album => createSlug(album.name) === albumSlug);
      
      if (!album) {
        return res.status(404).json({ message: 'Album not found' });
      }
      
      // Get public tracks in the album
      const tracks = await storage.getMusicGenerationsByAlbumId(album.id);
      const publicTracks = tracks.filter(track => 
        track.visibility === 'public' && track.status === 'completed'
      );
      
      // Increment album view count
      await storage.incrementAlbumViewCount(album.id);
      
      // Convert object path to direct public URL if needed
      let finalCoverUrl = album.coverUrl;
      if (album.coverUrl && album.coverUrl.startsWith('/objects/')) {
        try {
          const storageService = getStorageService();
          const directUrl = storageService.getObjectEntityDirectPublicUrl(album.coverUrl);
          if (directUrl !== album.coverUrl) {
            // Update the album with the direct URL
            await storage.updateAlbum(album.id, { coverUrl: directUrl } as any);
            finalCoverUrl = directUrl;
          }
        } catch (e) {
          console.error('Failed to convert cover URL for album:', album.id, e);
          // Keep the original URL if conversion fails
        }
      }
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          createdAt: user.createdAt
        },
        album: {
          id: album.id,
          name: album.name,
          coverUrl: finalCoverUrl,
          viewCount: album.viewCount + 1, // Show incremented count
          createdAt: album.createdAt
        },
        tracks: publicTracks.map(track => ({
          id: track.id,
          title: track.title,
          tags: track.tags,
          lyrics: track.lyrics,
          audioUrl: track.audioUrl,
          imageUrl: track.imageUrl,
          duration: track.duration,
          type: track.type,
          viewCount: track.viewCount,
          createdAt: track.createdAt
        }))
      });
    } catch (error) {
      console.error('Error getting public album:', error);
      res.status(500).json({ message: 'Failed to get public album' });
    }
  });

  // Public track view (no auth required)
  app.get('/api/u/:username/:albumSlug/:trackId', async (req: any, res) => {
    try {
      const { username, albumSlug, trackId } = req.params;
      
      // Get user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get all albums for the user and find the one with matching slug
      const userAlbums = await storage.getUserAlbums(user.id);
      const album = userAlbums.find(album => createSlug(album.name) === albumSlug);
      
      if (!album) {
        return res.status(404).json({ message: 'Album not found' });
      }
      
      // Get track and verify it belongs to the album and user
      const track = await storage.getMusicGeneration(trackId);
      if (!track || track.userId !== user.id || track.albumId !== album.id) {
        return res.status(404).json({ message: 'Track not found' });
      }
      
      // Verify track is public
      if (track.visibility !== 'public' || track.status !== 'completed') {
        return res.status(404).json({ message: 'Track not found' });
      }
      
      // Increment track view count
      await storage.incrementTrackViewCount(track.id);
      
      // Convert object path to direct public URL if needed
      let finalCoverUrl = album.coverUrl;
      if (album.coverUrl && album.coverUrl.startsWith('/objects/')) {
        try {
          const storageService = getStorageService();
          const directUrl = storageService.getObjectEntityDirectPublicUrl(album.coverUrl);
          if (directUrl !== album.coverUrl) {
            // Update the album with the direct URL
            await storage.updateAlbum(album.id, { coverUrl: directUrl } as any);
            finalCoverUrl = directUrl;
          }
        } catch (e) {
          console.error('Failed to convert cover URL for album:', album.id, e);
          // Keep the original URL if conversion fails
        }
      }
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          createdAt: user.createdAt
        },
        album: {
          id: album.id,
          name: album.name,
          coverUrl: finalCoverUrl,
          viewCount: album.viewCount,
          createdAt: album.createdAt
        },
        track: {
          id: track.id,
          title: track.title,
          tags: track.tags,
          lyrics: track.lyrics,
          audioUrl: track.audioUrl,
          imageUrl: track.imageUrl,
          videoUrl: track.videoUrl,
          muxPlaybackId: track.muxPlaybackId,
          muxAssetStatus: track.muxAssetStatus,
          duration: track.duration,
          type: track.type,
          viewCount: track.viewCount + 1, // Show incremented count
          createdAt: track.createdAt
        }
      });
    } catch (error) {
      console.error('Error getting public track:', error);
      res.status(500).json({ message: 'Failed to get public track' });
    }
  });

  // Public album view (no auth required)
  app.get('/api/share/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      const shareableLink = await storage.getShareableLinkByToken(token);
      if (!shareableLink) {
        return res.status(404).json({ message: 'Shareable link not found or expired' });
      }
      
      // Get album details
      const album = await storage.getAlbumById(shareableLink.albumId);
      if (!album) {
        return res.status(404).json({ message: 'Album not found' });
      }
      
      // Get user details
      const user = await storage.getUserById(album.userId);
      if (!user) {
        return res.status(404).json({ message: 'Album owner not found' });
      }
      
      // Get all public tracks in this album
      const tracks = await storage.getMusicGenerationsByAlbumId(shareableLink.albumId);
      const publicTracks = tracks.filter(track => track.visibility === 'public');
      
      res.json({
        album: {
          id: album.id,
          name: album.name,
          coverUrl: album.coverUrl,
          createdAt: album.createdAt
        },
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl
        },
        tracks: publicTracks.map(track => ({
          id: track.id,
          title: track.title,
          tags: track.tags,
          lyrics: track.lyrics,
          audioUrl: track.audioUrl,
          imageUrl: track.imageUrl,
          duration: track.duration,
          type: track.type,
          createdAt: track.createdAt
        }))
      });
    } catch (error) {
      console.error('Error getting shared album:', error);
      res.status(500).json({ message: 'Failed to get shared album' });
    }
  });

  // KIE API Callback endpoint (temporary)
  app.post('/api/kie/callback', async (req: any, res) => {
    try {
      console.log('KIE Callback received:', JSON.stringify(req.body, null, 2));
      
      const { code, msg, data } = req.body;
      
      if (code !== 200) {
        console.error('KIE callback error:', msg);
        return res.status(400).json({ message: 'KIE callback error', error: msg });
      }
      
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.error('Invalid KIE callback data structure');
        return res.status(400).json({ message: 'Invalid callback data structure' });
      }
      
      // Format the data for email
      const emailData = {
        callbackType: data.callbackType,
        taskId: data.task_id,
        tracks: data.data.map((track: any) => ({
          id: track.id,
          audioUrl: track.audio_url,
          sourceAudioUrl: track.source_audio_url,
          streamAudioUrl: track.stream_audio_url,
          sourceStreamAudioUrl: track.source_stream_audio_url,
          imageUrl: track.image_url,
          sourceImageUrl: track.source_image_url,
          prompt: track.prompt,
          modelName: track.model_name,
          title: track.title,
          tags: track.tags,
          createTime: track.createTime,
          duration: track.duration
        }))
      };
      
      // Send email with the data
      await EmailService.sendKieCallbackEmail(emailData);
      
      console.log('KIE callback processed successfully');
      res.json({ message: 'Callback processed successfully' });
      
    } catch (error) {
      console.error('Error processing KIE callback:', error);
      res.status(500).json({ message: 'Failed to process callback' });
    }
  });

  // Local development upload endpoint
  app.put("/api/objects/local-upload/:objectId", requireAuth, async (req, res) => {
    try {
      if (process.env.NODE_ENV !== "development") {
        return res.status(403).json({ message: "Local upload only available in development" });
      }

      const { objectId } = req.params;
      const storageService = getStorageService();
      
      if (!(storageService instanceof LocalStorageService)) {
        return res.status(400).json({ message: "Local upload only available with LocalStorageService" });
      }

      // Handle the file upload
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const uploadsDir = path.join(process.cwd(), 'local-storage', 'uploads');
          
          // Ensure uploads directory exists
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          const filePath = path.join(uploadsDir, objectId);
          fs.writeFileSync(filePath, buffer);
          
          console.log(`✅ File uploaded to: ${filePath}`);
          res.status(200).json({ message: "Upload successful" });
        } catch (error) {
          console.error("Error saving file:", error);
          res.status(500).json({ message: "Failed to save file" });
        }
      });

      req.on('error', (error) => {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Upload failed" });
      });

    } catch (error) {
      console.error("Error handling local upload:", error);
      res.status(500).json({ message: "Failed to handle upload" });
    }
  });

  // Text-to-music generation using ElevenLabs
  app.post("/api/generate-text-to-music", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validation = insertTextToMusicSchema.parse(req.body);
      
      // Check if user can generate more audio
      const generationCheck = await storage.canUserGenerateAudio(userId);
      if (!generationCheck.canGenerate) {
        return res.status(403).json({ 
          message: generationCheck.reason,
          currentUsage: generationCheck.currentUsage,
          maxGenerations: generationCheck.maxGenerations
        });
      }
      
      // Check if user already has a recent generation with same content to prevent duplicates
      const recentGenerations = await storage.getUserMusicGenerations(userId);
      const hasRecentDuplicate = recentGenerations.some(gen => 
        gen.tags === validation.tags && 
        gen.lyrics === validation.lyrics &&
        gen.createdAt && 
        (new Date().getTime() - new Date(gen.createdAt).getTime()) < 30000 // Within 30 seconds
      );
      
      if (hasRecentDuplicate) {
        console.log(`⚠️  Duplicate generation request detected for user ${userId}`);
        return res.status(400).json({ 
          message: "Duplicate generation request. Please wait a moment before trying again." 
        });
      }
      
      // Create generation record
      const generation = await storage.createTextToMusicGeneration(userId, validation);
      
      // Increment user's audio generation count
      await storage.incrementAudioGenerationCount(userId);
      
      // Build prompt for ElevenLabs
      const { prompt, style, title } = elevenLabsService.buildPromptFromTags(validation.tags, validation.lyrics || undefined);
      
      // Log the input parameters
      console.log(`\n=== TEXT-TO-MUSIC ELEVENLABS REQUEST ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Generation ID: ${generation.id}`);
      console.log(`Tags: ${validation.tags}`);
      console.log(`Lyrics: ${validation.lyrics || 'N/A'}`);
      console.log(`Prompt: ${prompt}`);
      console.log(`Style: ${style}`);
      console.log(`Title: ${title}`);
      console.log(`========================================\n`);

      // Generate music using ElevenLabs
      console.log(`🚀 Calling ElevenLabs generateMusic with:`, {
        prompt: prompt.substring(0, 100) + '...',
        style,
        title,
        duration: 60 // Default 60 seconds
      });
      
      const elevenLabsResponse = await elevenLabsService.generateMusic({
        prompt: prompt,
        style: style,
        title: title,
        duration: 60
      });

      if (!elevenLabsResponse.id) {
        throw new Error(`ElevenLabs API error: No composition ID returned`);
      }

      // Update generation with ElevenLabs composition ID and set status to generating
      await storage.updateMusicGeneration(generation.id, {
        status: "generating",
        kieTaskId: elevenLabsResponse.id, // Reusing kieTaskId field for ElevenLabs composition ID
      });

      // Process the audio URL the same way as KIE.ai
      let audioUrlToSave = elevenLabsResponse.audio_url;
      try {
        if (process.env.STORAGE_PROVIDER === 'gcs') {
          console.log('☁️ GCS upload attempt (ElevenLabs):', {
            provider: process.env.STORAGE_PROVIDER,
            bucket: process.env.GCS_BUCKET_NAME || 'NOT SET',
            sourceUrl: elevenLabsResponse.audio_url,
            generationId: generation.id,
          });
          const storageService = getStorageService();
          const resp = await fetch(elevenLabsResponse.audio_url);
          console.log(`☁️ GCS fetch (ElevenLabs) status: ${resp.status}`);
          const arrBuf = await resp.arrayBuffer();
          console.log(`☁️ GCS fetch (ElevenLabs) bytes: ${arrBuf.byteLength}`);
          const buf = new Uint8Array(arrBuf);
          const filename = `${generation.id}.mp3`;
          audioUrlToSave = await storageService.uploadAudioBuffer(buf, filename);
          console.log(`☁️ Uploaded ElevenLabs track to GCS path: ${audioUrlToSave}`);
        } else {
          console.log('☁️ Skipping GCS upload (ElevenLabs): STORAGE_PROVIDER is not gcs');
        }
      } catch (e) {
        console.error('GCS upload error (ElevenLabs track), falling back to base64 URL:', e);
      }

      await storage.updateMusicGeneration(generation.id, {
        status: "completed",
        audioUrl: audioUrlToSave,
        title: title || generation.title,
      });
      
      console.log(`🎵 Generation ${generation.id} completed successfully`);
      console.log(`🎵 Audio URL: ${audioUrlToSave}`);

      res.json({ 
        generationId: generation.id, 
        status: "completed",
        taskId: elevenLabsResponse.id,
        message: "Music generation completed successfully."
      });
    } catch (error) {
      console.error("Error generating music with ElevenLabs:", error);
      
      // Update generation with failure
      try {
        const generationId = req.body.generationId || (await storage.createTextToMusicGeneration(req.user.id, req.body)).id;
        await storage.updateMusicGeneration(generationId, { status: "failed" });
      } catch (updateError) {
        console.error("Error updating generation status:", updateError);
      }
      
      res.status(500).json({ message: "Failed to generate music" });
    }
  });

  // Audio-to-music generation using ElevenLabs
  app.post("/api/generate-audio-to-music", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validation = insertAudioToMusicSchema.parse(req.body) as any;
      
      // Check if user can generate more audio
      const generationCheck = await storage.canUserGenerateAudio(userId);
      if (!generationCheck.canGenerate) {
        return res.status(403).json({ 
          message: generationCheck.reason,
          currentUsage: generationCheck.currentUsage,
          maxGenerations: generationCheck.maxGenerations
        });
      }
      
      // Create generation record
      const generation = await storage.createAudioToMusicGeneration(userId, validation);
      
      // Increment user's audio generation count
      await storage.incrementAudioGenerationCount(userId);
      
      // Validate audio URL is provided
      if (!validation.inputAudioUrl) {
        return res.status(400).json({ message: "Audio file URL is required" });
      }

      const storageService = getStorageService();
      
      const publicAudioUrl = await storageService.getObjectEntityPublicUrl(validation.inputAudioUrl, 7200); // 2 hours
      
      // Use ElevenLabs for audio-to-music generation
      const prompt = validation.prompt || `A ${validation.tags} style track based on the provided audio`;
      const style = validation.tags;
      const title = validation.title || "Audio Transformation";

      console.log(`\n=== AUDIO-TO-MUSIC ELEVENLABS REQUEST ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Generation ID: ${generation.id}`);
      console.log(`Prompt: ${prompt}`);
      console.log(`Style: ${style}`);
      console.log(`Title: ${title}`);
      console.log(`Audio URL: ${publicAudioUrl}`);
      console.log(`==========================================\n`);

      try {
        const elevenLabsResult = await elevenLabsService.generateMusic({
          prompt: prompt,
          style: style,
          title: title,
          duration: 60
        });

        // Update generation with ElevenLabs composition ID
        await storage.updateMusicGeneration(generation.id, {
          status: "generating",
          kieTaskId: elevenLabsResult.id, // Reusing kieTaskId field for ElevenLabs composition ID
        });

        res.json({ generationId: generation.id, taskId: elevenLabsResult.id });
      } catch (apiError) {
        console.error("ElevenLabs request failed:", apiError);
        // Mark generation as failed so client polling stops
        await storage.updateMusicGeneration(generation.id, { status: "failed" });
        return res.status(500).json({ message: "ElevenLabs generation failed" });
      }
    } catch (error) {
      console.error("Error generating audio-to-music with ElevenLabs:", error);
      res.status(500).json({ message: "Failed to generate audio-to-music" });
    }
  });

  app.get("/api/generation/:id/status", requireAuth, async (req: any, res) => {
    try {
      // Always send no-cache headers so the client does not cache
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

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

      // Prefer ElevenLabs status if we have a composition id
      if (generation.kieTaskId) {
        console.log(`\n=== API STATUS CHECK: ElevenLabs ===`);
        console.log(`Generation ID: ${id}`);
        console.log(`ElevenLabs Composition ID: ${generation.kieTaskId}`);
        try {
          const statusResponse = await elevenLabsService.checkCompositionStatus(generation.kieTaskId);
          console.log(`ElevenLabs status response received.`);
          console.log(JSON.stringify(statusResponse, null, 2));

          if (statusResponse.status === 'completed' && statusResponse.audio_url) {
            // Try to upload to GCS from status path as well
            let statusAudioUrlToSave = statusResponse.audio_url;
            try {
              if (process.env.STORAGE_PROVIDER === 'gcs') {
                console.log('☁️ GCS upload attempt (status primary):', {
                  provider: process.env.STORAGE_PROVIDER,
                  bucket: process.env.GCS_BUCKET_NAME || 'NOT SET',
                  sourceUrl: statusResponse.audio_url,
                  generationId: id,
                });
                const storageService = getStorageService();
                const resp = await fetch(statusResponse.audio_url);
                console.log(`☁️ GCS fetch (status primary) status: ${resp.status}`);
                const arrBuf = await resp.arrayBuffer();
                console.log(`☁️ GCS fetch (status primary) bytes: ${arrBuf.byteLength}`);
                const buf = new Uint8Array(arrBuf);
                const filename = `${id}.mp3`;
                statusAudioUrlToSave = await storageService.uploadAudioBuffer(buf, filename);
                console.log(`☁️ Uploaded primary track (status) to GCS path: ${statusAudioUrlToSave}`);
              } else {
                console.log('☁️ Skipping GCS upload (status primary): STORAGE_PROVIDER is not gcs');
              }
            } catch (e) {
              console.error('GCS upload error (status primary), falling back to remote URL:', e);
            }

            const updated = await storage.updateMusicGeneration(id, {
              status: 'completed',
              audioUrl: statusAudioUrlToSave,
              title: generation.title,
            });
            console.log(`Updated generation ${id} with audioUrl`);
            return res.json(updated);
          } else if (statusResponse.status === 'failed') {
            const updated = await storage.updateMusicGeneration(id, { status: 'failed' });
            return res.json(updated);
          }
        } catch (e) {
          console.error(`ElevenLabs status check error for generation ${id}:`, e);
        }
      }

      // Check FAL.ai status (legacy)
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

  // Get user's generation status (current usage vs limit for both audio and video)
  app.get("/api/user/generation-status", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const audioStatus = await storage.canUserGenerateAudio(userId);
      const videoStatus = await storage.canUserGenerateVideo(userId);
      res.json({
        // For backwards compatibility
        canGenerate: audioStatus.canGenerate,
        reason: audioStatus.reason,
        currentUsage: audioStatus.currentUsage,
        maxGenerations: audioStatus.maxGenerations,
        // Separate audio and video status
        audio: audioStatus,
        video: videoStatus,
      });
    } catch (error) {
      console.error("Error fetching generation status:", error);
      res.status(500).json({ message: "Failed to fetch generation status" });
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
        const userId = req.session?.userId || req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Authentication required" });
        }
        
        const user = req.user as any;
        if (track.userId !== user?.id) {
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
        albumId: validation.albumId,
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
      console.log('[GET /api/admin/tracks] Starting fetch...');
      const tracks = await storage.getAllMusicGenerationsWithUsers();
      console.log(`[GET /api/admin/tracks] Successfully fetched ${tracks.length} tracks`);
      
      // Calculate approximate response size (sample first track to avoid full serialization)
      const sampleSize = tracks.length > 0 ? JSON.stringify(tracks[0]).length : 0;
      const estimatedSize = sampleSize * tracks.length;
      console.log(`[GET /api/admin/tracks] Estimated response size: ~${estimatedSize} bytes (${(estimatedSize / 1024).toFixed(2)} KB) for ${tracks.length} tracks`);
      
      // Set response headers before sending
      res.setHeader('Content-Type', 'application/json');
      
      // Use res.send with JSON.stringify for better error handling
      try {
        const jsonString = JSON.stringify(tracks);
        console.log(`[GET /api/admin/tracks] JSON serialized successfully: ${jsonString.length} bytes`);
        res.send(jsonString);
        console.log('[GET /api/admin/tracks] Response sent successfully');
      } catch (sendError) {
        console.error('[GET /api/admin/tracks] Error sending response:', sendError);
        throw sendError;
      }
    } catch (error) {
      console.error('[GET /api/admin/tracks] Error fetching admin tracks:', error);
      if (error instanceof Error) {
        console.error('[GET /api/admin/tracks] Error stack:', error.stack);
      }
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to fetch tracks', error: error instanceof Error ? error.message : String(error) });
      }
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

  // Admin bands management
  app.get('/api/admin/bands', isAdminAuthenticated, async (req, res) => {
    try {
      console.log('[GET /api/admin/bands] Starting fetch...');
      
      // Fetch all bands with user info
      const bandsResult = await pool.query(
        `SELECT 
           b.id,
           b.user_id AS "userId",
           b.name,
           b.description,
           b.band_image_url AS "bandImageUrl",
           b.created_at AS "createdAt",
           b.updated_at AS "updatedAt",
           u.id AS "user_id",
           u.first_name AS "user_firstName",
           u.last_name AS "user_lastName",
           u.email AS "user_email",
           u.profile_image_url AS "user_profileImageUrl"
         FROM bands b
         LEFT JOIN users u ON b.user_id = u.id
         ORDER BY b.created_at DESC`
      );

      // Fetch members for each band
      const bandsWithMembers = await Promise.all(
        bandsResult.rows.map(async (band) => {
          const membersResult = await pool.query(
            `SELECT 
               id,
               band_id AS "bandId",
               name,
               role,
               image_url AS "imageUrl",
               description,
               position,
               created_at AS "createdAt",
               updated_at AS "updatedAt"
             FROM band_members 
             WHERE band_id = $1 
             ORDER BY position ASC`,
            [band.id]
          );

          return {
            ...band,
            user: band.user_id ? {
              id: band.user_id,
              firstName: band.user_firstName,
              lastName: band.user_lastName,
              email: band.user_email,
              profileImageUrl: band.user_profileImageUrl,
            } : undefined,
            members: membersResult.rows,
          };
        })
      );

      // Remove the individual user fields from the response
      const cleanedBands = bandsWithMembers.map(({ user_id, user_firstName, user_lastName, user_email, user_profileImageUrl, ...band }) => band);

      console.log(`[GET /api/admin/bands] Successfully fetched ${cleanedBands.length} bands`);
      res.json(cleanedBands);
    } catch (error) {
      console.error('[GET /api/admin/bands] Error fetching bands:', error);
      res.status(500).json({ message: 'Failed to fetch bands', error: error instanceof Error ? error.message : String(error) });
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

  // Admin Maintenance - Reset Generation Counts
  app.post('/api/admin/reset-generation-counts', isAdminAuthenticated, async (req, res) => {
    try {
      await storage.resetMonthlyGenerationCounts();
      res.json({ message: 'Generation counts reset successfully' });
    } catch (error) {
      console.error('Error resetting generation counts:', error);
      res.status(500).json({ message: 'Failed to reset generation counts' });
    }
  });

  // Admin maintenance: download SQL backup (schema + data)
  app.get('/api/admin/backup/sql', isAdminAuthenticated, async (req, res) => {
    try {
      const host = process.env.PGHOST || 'localhost';
      const port = process.env.PGPORT || '5432';
      const database = process.env.PGDATABASE;
      const user = process.env.PGUSER || 'postgres';
      const password = process.env.PGPASSWORD;

      if (!database || !password) {
        return res.status(500).json({ message: 'Database env vars missing (PGDATABASE/PGPASSWORD)' });
      }

      const fileName = `nusong_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      const args = [
        '-h', host,
        '-p', port,
        '-U', user,
        '-d', database,
        '--no-owner',
        '--no-privileges'
      ];

      const child = spawn('pg_dump', args, {
        env: { ...process.env, PGPASSWORD: password },
      });

      let stderrData = '';
      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('error', (err) => {
        console.error('pg_dump spawn error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'pg_dump failed to start', error: String(err) });
        }
      });

      child.on('close', (code) => {
        if (code !== 0) {
          console.error('pg_dump exited with code', code, stderrData);
          if (!res.headersSent) {
            res.status(500).json({ message: 'pg_dump failed', code, error: stderrData });
          }
        } else {
          // stream ended successfully
        }
      });

      child.stdout.pipe(res);
    } catch (error) {
      console.error('Error generating SQL backup:', error);
      res.status(500).json({ message: 'Failed to generate SQL backup' });
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
        generationsUsedThisMonth: 0, // Reset usage when changing plans (deprecated)
        audioGenerationsUsedThisMonth: 0, // Reset audio usage when changing plans
        videoGenerationsUsedThisMonth: 0, // Reset video usage when changing plans
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

      // Convert string dates to Date objects if present
      const processedUpdates: any = { ...updates };
      if (processedUpdates.planStartDate && typeof processedUpdates.planStartDate === 'string') {
        processedUpdates.planStartDate = new Date(processedUpdates.planStartDate);
      }
      if (processedUpdates.planEndDate && typeof processedUpdates.planEndDate === 'string') {
        processedUpdates.planEndDate = new Date(processedUpdates.planEndDate);
      }

      const updatedUser = await storage.updateUser(id, processedUpdates);
      
      // Remove password hash from response
      const { passwordHash, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error('Error updating user plan:', error);
      res.status(500).json({ message: 'Failed to update user plan' });
    }
  });

  // ===== REGULAR USER MANAGEMENT ROUTES (Admin Only) =====
  
  // Get all regular users with filtering and pagination
  app.get('/api/admin/regular-users', isAdminAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const emailFilter = req.query.email as string | undefined;
      const subscriptionPlanId = req.query.subscriptionPlanId as string | undefined;
      
      // Convert subscriptionPlanId: "null" string means free plan, undefined means all
      let subscriptionFilter: string | null | undefined = undefined;
      if (subscriptionPlanId === "null" || subscriptionPlanId === "") {
        subscriptionFilter = null; // Free plan users
      } else if (subscriptionPlanId) {
        subscriptionFilter = subscriptionPlanId; // Specific plan
      }
      
      const result = await storage.getAllUsersWithGenerationCountPaginated({
        page,
        limit,
        emailFilter,
        subscriptionPlanId: subscriptionFilter,
      });
      
      // Remove password hash from response for security
      const userList = result.users.map(({ passwordHash, ...user }) => user);
      
      res.json({
        users: userList,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
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

      // Convert string dates to Date objects if present
      const processedUpdates: any = { ...updates };
      if (processedUpdates.planStartDate && typeof processedUpdates.planStartDate === 'string') {
        processedUpdates.planStartDate = new Date(processedUpdates.planStartDate);
      }
      if (processedUpdates.planEndDate && typeof processedUpdates.planEndDate === 'string') {
        processedUpdates.planEndDate = new Date(processedUpdates.planEndDate);
      }

      const updatedUser = await storage.updateUser(id, processedUpdates);
      
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

      const result = await generateLyrics(prompt.trim(), duration);
      res.json({ 
        lyrics: result.lyrics,
        title: result.title 
      });
    } catch (error) {
      console.error('Error generating lyrics:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to generate lyrics' 
      });
    }
  });

  // Generate video scenes endpoint
  app.post('/api/generate-video-scenes', requireAuth, async (req, res) => {
    try {
      const { trackId, videoPrompt, videoDurationSec } = req.body as { trackId: string; videoPrompt: string; videoDurationSec?: number };
      
      if (!trackId || !videoPrompt || typeof videoPrompt !== 'string' || !videoPrompt.trim()) {
        return res.status(400).json({ message: 'Track ID and video prompt are required' });
      }

      // Get the track information
      const userId = (req as any).user.id;
      const track = await storage.getMusicGeneration(trackId);
      
      if (!track) {
        return res.status(404).json({ message: 'Track not found' });
      }

      if (track.status !== 'completed' || !track.audioUrl) {
        return res.status(400).json({ message: 'Track must be completed to create video scenes' });
      }

      // Get user's band and band member images
      const bandResult = await pool.query('SELECT id FROM bands WHERE user_id = $1', [userId]);
      if (bandResult.rows.length === 0) {
        return res.status(400).json({ message: 'User must have a band to create video scenes' });
      }
      
      const bandId = bandResult.rows[0].id;
      const membersResult = await pool.query(
        'SELECT image_url FROM band_members WHERE band_id = $1 AND image_url IS NOT NULL ORDER BY position LIMIT 3',
        [bandId]
      );
      
      if (membersResult.rows.length === 0) {
        return res.status(400).json({ message: 'Band must have at least one member with an image to create video scenes' });
      }
      
      const bandCharacterImages = membersResult.rows.map(row => row.image_url).filter(Boolean);

      // Generate the video scene prompts with OpenAI
      const scenes = await generateVideoScenes(videoPrompt.trim(), {
        title: track.title || undefined,
        tags: track.tags || undefined,
        lyrics: track.lyrics || undefined
      });

      // Determine total video duration and per-scene duration
      const totalDurationSec = videoDurationSec === 60 ? 60 : 30;
      const perSceneDurationSec = totalDurationSec / 6; // 5s for 30s total, 10s for 60s total

      // First trim audio to selected duration, then split into 6 parts using FFMPEG
      console.log(`🎵 Starting audio trimming to ${totalDurationSec} seconds for track: ${trackId}`);
      const audioTrimResult = await trimAudio({
        audio_url: track.audioUrl || "",
        desired_length: totalDurationSec,
        fade_duration: 5
      });

      // Store the trimmed audio URL for later use (cache + DB column if present)
      const trimmedAudioUrl = audioTrimResult.download_url;
      try {
        trimmedAudioCache.set(trackId, trimmedAudioUrl);
        console.log(`💾 Cached trimmedAudioUrl for track ${trackId}`);
        // Optional DB persistence if column exists
        try {
          await pool.query(
            'UPDATE music_generations SET trimmed_audio_url = $1, updated_at = NOW() WHERE id = $2',
            [trimmedAudioUrl, trackId]
          );
          console.log(`✅ Persisted trimmedAudioUrl to DB for track ${trackId}`);
        } catch (_dbErr) {
          // Column may not exist; ignore silently
        }
      } catch (_e) {}
      console.log(`✅ Audio trimmed to 30 seconds: ${trimmedAudioUrl}`);
      console.log(`🔍 Trimmed audio URL type: ${typeof trimmedAudioUrl}`);
      console.log(`🔍 Trimmed audio URL length: ${trimmedAudioUrl?.length}`);
      console.log(`🔍 Original audio URL: ${track.audioUrl}`);
      console.log(`🔍 URLs are different: ${trimmedAudioUrl !== track.audioUrl}`);

      // Now split the trimmed audio into 6 parts (equal duration)
      console.log(`🎵 Starting audio splitting into 6 parts for track: ${trackId} (≈${perSceneDurationSec}s each)`);
      console.log(`🔍 About to call splitAudio with trimmed URL: ${trimmedAudioUrl}`);
      const audioSplitResult = await splitAudio({
        audio_url: trimmedAudioUrl,
        parts: 6
      });

      // Download and save audio parts to storage
      const savedAudioParts = await downloadAndSaveAudioParts(audioSplitResult.audio_parts, trackId);
      console.log(`✅ Audio split and saved: ${savedAudioParts.length} parts (~${perSceneDurationSec}s each)`);

      // Generate scene images with KIE.AI
      const sceneTasks = [];
      for (let i = 0; i < scenes.length; i++) {
        const scenePrompt = scenes[i];
        try {
          // Convert band character image URLs to public URLs for KIE.AI
          const publicBandImages = [];
          const storageService = getStorageService();
          
          // For scenes 2, 4, 6 (close-up shots), only use the lead singer (first band member)
          // For scenes 1, 3, 5 (medium/far shots), use all band members
          const sceneNumber = i + 1;
          const isCloseUpScene = sceneNumber === 2 || sceneNumber === 4 || sceneNumber === 6;
          const imagesToUse = isCloseUpScene ? [bandCharacterImages[0]] : bandCharacterImages;
          
          console.log(`🎬 Scene ${sceneNumber}: ${isCloseUpScene ? 'Close-up (lead singer only)' : 'Medium/Far shot (all members)'}`);
          
          for (const imageUrl of imagesToUse) {
            if (imageUrl && imageUrl.startsWith('/objects/')) {
              // Convert relative path to public URL
              const publicUrl = await (storageService as any).getObjectEntityPublicUrl(imageUrl, 3600);
              publicBandImages.push(publicUrl);
              console.log(`✅ Converted band image to public URL: ${publicUrl}`);
            } else if (imageUrl) {
              publicBandImages.push(imageUrl);
            }
          }
          
          const sceneTask = await generateSceneImage({
            prompt: scenePrompt,
            image_urls: publicBandImages,
            output_format: "png",
            image_size: "3:4"
          });
          
          sceneTasks.push({
            sceneNumber: i + 1,
            prompt: scenePrompt,
            taskId: sceneTask.data.taskId,
            status: 'processing',
            audioPartUrl: savedAudioParts[i] // Link each scene to its corresponding audio part
          });
        } catch (error) {
          console.error(`Error generating scene ${i + 1}:`, error);
          sceneTasks.push({
            sceneNumber: i + 1,
            prompt: scenePrompt,
            taskId: null,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            audioPartUrl: savedAudioParts[i] // Still link audio part even if image generation fails
          });
        }
      }

      console.log(`🔍 Scene generation response - trimmedAudioUrl: ${trimmedAudioUrl}`);
      console.log(`🔍 Scene generation response - trimmedAudioUrl type: ${typeof trimmedAudioUrl}`);
      console.log(`🔍 Scene generation response - trimmedAudioUrl length: ${trimmedAudioUrl?.length}`);
      
      res.json({ 
        scenes,
        sceneTasks,
        trackId,
        videoPrompt: videoPrompt.trim(),
        bandCharacterImages,
        audioParts: savedAudioParts,
        audioSplitSuccess: true,
        trimmedAudioUrl: trimmedAudioUrl,
        videoDurationSec: totalDurationSec
      });
    } catch (error) {
      console.error('Error generating video scenes:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to generate video scenes' 
      });
    }
  });

  // Start video generation endpoint (called after scene images are ready)
  app.post('/api/start-video-generation', requireAuth, async (req, res) => {
    try {
      const { trackId, sceneTasks, videoDurationSec } = req.body as { trackId: string; sceneTasks: any[]; videoDurationSec?: number };
      
      if (!trackId || !sceneTasks || !Array.isArray(sceneTasks)) {
        return res.status(400).json({ message: 'Track ID and scene tasks are required' });
      }

      // Get the track information to access audio parts
      const userId = (req as any).user.id;
      const track = await storage.getMusicGeneration(trackId);
      
      if (!track) {
        return res.status(404).json({ message: 'Track not found' });
      }

      console.log(`🎬 Starting video generation for track: ${trackId}`);
      console.log(`Scene tasks:`, sceneTasks);

      // Determine per-scene duration
      const totalDurationSec = videoDurationSec === 60 ? 60 : 30;
      const perSceneDurationSec = totalDurationSec / 6; // 5 or 10 seconds

      // Generate videos for each scene
      const videoTasks = [];
      for (let i = 0; i < sceneTasks.length; i++) {
        const sceneTask = sceneTasks[i];
        
        if (sceneTask.status !== 'completed' || !sceneTask.resultUrls || sceneTask.resultUrls.length === 0) {
          console.log(`⚠️ Skipping scene ${i + 1} - not completed or no image available`);
          videoTasks.push({
            sceneNumber: i + 1,
            status: 'skipped',
            reason: 'Scene image not ready'
          });
          continue;
        }

        const sceneImageUrl = sceneTask.resultUrls[0]; // Use first image
        const sceneNumber = i + 1;
        
        try {
          let videoRequestId: string;
          
          if (sceneNumber % 2 === 1) {
            // Scenes 1, 3, 5: Use Seedance (image-to-video)
            console.log(`🎥 Generating Seedance video for scene ${sceneNumber}`);
            videoRequestId = await wavespeedService.generateSeedanceVideo(
              sceneImageUrl, 
              sceneTask.prompt,
              perSceneDurationSec
            );
          } else {
            // Scenes 2, 4, 6: Use InfiniteTalk (lipsync with audio)
            console.log(`🎥 Generating InfiniteTalk video for scene ${sceneNumber}`);
            if (!sceneTask.audioPartUrl) {
              throw new Error(`No audio part available for scene ${sceneNumber}`);
            }
            
            // Convert audio part URL to public URL for Wavespeed API
            let publicAudioUrl = sceneTask.audioPartUrl;
            if (sceneTask.audioPartUrl.startsWith('/objects/')) {
              const storageService = getStorageService();
              publicAudioUrl = await (storageService as any).getObjectEntityPublicUrl(sceneTask.audioPartUrl, 3600);
              console.log(`✅ Converted audio part to public URL: ${publicAudioUrl}`);
            }
            
            videoRequestId = await wavespeedService.generateInfiniteTalkVideo(
              sceneImageUrl,
              publicAudioUrl
            );
          }
          
          videoTasks.push({
            sceneNumber: sceneNumber,
            videoRequestId: videoRequestId,
            status: 'processing',
            model: sceneNumber % 2 === 1 ? 'seedance' : 'infinitetalk',
            imageUrl: sceneImageUrl,
            audioPartUrl: sceneTask.audioPartUrl
          });
          
        } catch (error) {
          console.error(`❌ Error generating video for scene ${sceneNumber}:`, error);
          videoTasks.push({
            sceneNumber: sceneNumber,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        trackId,
        videoTasks,
        totalVideos: videoTasks.filter(t => t.status === 'processing').length,
        message: 'Video generation started'
      });
      
    } catch (error) {
      console.error('Error starting video generation:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to start video generation' 
      });
    }
  });

  // Check video generation status endpoint
  app.get('/api/video-task-status/:requestId', requireAuth, async (req, res) => {
    try {
      const { requestId } = req.params;
      
      if (!requestId) {
        return res.status(400).json({ message: 'Request ID is required' });
      }

      const status = await wavespeedService.checkVideoStatus(requestId);
      
      res.json({
        requestId: status.id,
        status: status.status,
        outputs: status.outputs,
        error: status.error,
        model: status.model,
        created_at: status.created_at,
        timings: status.timings
      });
    } catch (error) {
      console.error('Error checking video task status:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to check video task status' 
      });
    }
  });

  // Merge videos endpoint (called when all videos are completed)
  app.post('/api/merge-videos', requireAuth, async (req, res) => {
    try {
      const { trackId, videoTasks, trimmedAudioUrl } = req.body;
      
      console.log(`🔍 Merge endpoint received:`);
      console.log(`  - trackId: ${trackId}`);
      console.log(`  - videoTasks length: ${videoTasks?.length || 'N/A'}`);
      console.log(`  - trimmedAudioUrl: ${trimmedAudioUrl}`);
      console.log(`  - trimmedAudioUrl type: ${typeof trimmedAudioUrl}`);
      console.log(`  - trimmedAudioUrl is null: ${trimmedAudioUrl === null}`);
      console.log(`  - trimmedAudioUrl is undefined: ${trimmedAudioUrl === undefined}`);
      
      if (!trackId || !videoTasks || !Array.isArray(videoTasks)) {
        return res.status(400).json({ message: 'Track ID and video tasks are required' });
      }

      // Get the track information to access the original audio
      const userId = (req as any).user.id;
      
      // Check if user can generate more videos
      const videoGenerationCheck = await storage.canUserGenerateVideo(userId);
      if (!videoGenerationCheck.canGenerate) {
        return res.status(403).json({ 
          message: videoGenerationCheck.reason,
          currentUsage: videoGenerationCheck.currentUsage,
          maxGenerations: videoGenerationCheck.maxGenerations
        });
      }
      
      const track = await storage.getMusicGeneration(trackId);
      
      if (!track) {
        return res.status(404).json({ message: 'Track not found' });
      }

      // Filter completed videos and sort by scene number
      const completedVideos = videoTasks
        .filter(task => task.status === 'completed' && task.videoUrl)
        .sort((a, b) => a.sceneNumber - b.sceneNumber);

      if (completedVideos.length === 0) {
        return res.status(400).json({ message: 'No completed videos found to merge' });
      }

      if (completedVideos.length < 6) {
        return res.status(400).json({ 
          message: `Only ${completedVideos.length} videos completed. Need all 6 videos to merge.` 
        });
      }

      console.log(`🎬 Starting video merging for track: ${trackId}`);
      console.log(`Completed videos:`, completedVideos.map(v => ({ scene: v.sceneNumber, url: v.videoUrl })));

      // Determine final trimmed audio URL, preferring:
      // 1) request body trimmedAudioUrl
      // 2) in-memory cache
      // 3) DB column trimmed_audio_url (if exists)
      // 4) fallback to track.audioUrl (should rarely happen)
      let finalTrimmed = trimmedAudioUrl as string | undefined;
      if (!finalTrimmed) {
        finalTrimmed = trimmedAudioCache.get(trackId) || undefined;
        if (finalTrimmed) console.log(`💡 Using cached trimmedAudioUrl for track ${trackId}`);
      }
      if (!finalTrimmed) {
        try {
          const dbRes = await pool.query('SELECT trimmed_audio_url FROM music_generations WHERE id = $1', [trackId]);
          const dbUrl = dbRes.rows?.[0]?.trimmed_audio_url as string | undefined;
          if (dbUrl) {
            finalTrimmed = dbUrl;
            console.log(`💡 Using DB trimmedAudioUrl for track ${trackId}`);
          }
        } catch (_e) {
          // Column may not exist; ignore
        }
      }

      const finalAudioUrl = finalTrimmed || track.audioUrl || "";
      console.log(`🔊 Audio URL for merging:`);
      console.log(`  - from request.trimmedAudioUrl: ${trimmedAudioUrl}`);
      console.log(`  - from cache: ${trimmedAudioCache.get(trackId) || 'N/A'}`);
      console.log(`  - from DB: ${finalTrimmed && finalTrimmed !== trimmedAudioCache.get(trackId) ? finalTrimmed : 'N/A'}`);
      console.log(`  - track.audioUrl (fallback): ${track.audioUrl}`);
      console.log(`  - Final chosen audio_url: ${finalAudioUrl}`);

      // Extract video URLs in order
      const videoUrls = completedVideos.map(video => video.videoUrl);

      // Merge videos using FFMPEG
      const mergeResult = await mergeVideos({
        video_urls: videoUrls,
        audio_url: finalAudioUrl, // Always prefer trimmed audio
        subtitle_url: "",
        watermark_url: "",
        dimensions: "768x1024",
        async: false
      });

      // Download and save the final merged video
      const finalVideoUrl = await downloadAndSaveFinalVideo(mergeResult.download_url, trackId);

      // Update the track with the video URL
      await pool.query(
        'UPDATE music_generations SET video_url = $1, updated_at = NOW() WHERE id = $2',
        [finalVideoUrl, trackId]
      );

      // Increment user's video generation count
      await storage.incrementVideoGenerationCount(userId);

      console.log(`✅ Video URL saved to database: ${finalVideoUrl}`);

      // Queue for MUX processing (non-blocking)
      try {
        await createMuxAssetForVideo(trackId, finalVideoUrl);
        console.log(`📋 MUX processing queued for track ${trackId}`);
      } catch (error) {
        console.error('⚠️  Failed to queue MUX processing:', error);
        // Don't fail the request if MUX fails - video still works via direct URL
      }

      res.json({
        trackId,
        success: true,
        finalVideoUrl,
        mergeResult,
        videoCount: completedVideos.length,
        message: 'Videos merged successfully'
      });
      
    } catch (error) {
      console.error('Error merging videos:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to merge videos' 
      });
    }
  });

  // Check scene generation status endpoint
  app.get('/api/scene-task-status/:taskId', requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      
      if (!taskId) {
        return res.status(400).json({ message: 'Task ID is required' });
      }

      const status = await checkSceneTaskStatus(taskId);
      
      // Parse the result JSON to get the image URLs
      let resultUrls: string[] = [];
      if (status.data.resultJson) {
        try {
          const resultData = JSON.parse(status.data.resultJson);
          resultUrls = resultData.resultUrls || [];
        } catch (error) {
          console.error('Error parsing result JSON:', error);
        }
      }

      res.json({
        taskId: status.data.taskId,
        status: status.data.state,
        resultUrls,
        error: status.data.failMsg || null,
        createTime: status.data.createTime,
        completeTime: status.data.completeTime
      });
    } catch (error) {
      console.error('Error checking scene task status:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to check scene task status' 
      });
    }
  });

  // Serve generated files from storage
  // If using GCS, redirect to the public GCS URL to avoid auth issues and support Range natively
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const storageService = getStorageService();

      // Fast-path for GCS: redirect to public GCS URL instead of proxying
      if (storageService.constructor && storageService.constructor.name === 'GCSStorageService') {
        try {
          const directUrl = (storageService as any).getObjectEntityDirectPublicUrl(req.path);
          return res.redirect(302, directUrl);
        } catch (e) {
          console.error('GCS direct URL redirect failed, falling back to proxy:', e);
        }
      }

      const objectFile = await storageService.getObjectEntityFile(req.path);

      // Fetch metadata for content-type and total size
      const [metadata] = await objectFile.getMetadata();
      const totalSize = Number(metadata.size || 0);
      const contentType = metadata.contentType || 'application/octet-stream';

      const range = req.headers.range;
      if (range && totalSize > 0) {
        // Parse Range: bytes=start-end
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = match[2] ? Math.min(parseInt(match[2], 10), totalSize - 1) : totalSize - 1;
          if (start <= end && start < totalSize) {
            const chunkSize = end - start + 1;
            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${totalSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunkSize,
              'Content-Type': contentType,
              'Cache-Control': `public, max-age=3600`,
            });

            const stream = objectFile.createReadStream({ start, end });
            stream.on('error', (err: any) => {
              console.error('Stream error (range):', err);
              if (!res.headersSent) res.sendStatus(500);
            });
            return stream.pipe(res);
          }
        }
        // Invalid range → 416
        res.status(416).set({
          'Content-Range': `bytes */${totalSize}`,
        }).end();
        return;
      }

      // No range header: stream entire file
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': totalSize || undefined,
        'Accept-Ranges': 'bytes',
        'Cache-Control': `public, max-age=3600`,
      });
      const stream = objectFile.createReadStream();
      stream.on('error', (err: any) => {
        console.error('Stream error (full):', err);
        if (!res.headersSent) res.sendStatus(500);
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // ===== STRIPE ROUTES =====

  // Create checkout session
  app.post("/api/stripe/create-checkout-session", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { planId, billingCycle } = req.body;

      console.log('=== STRIPE CHECKOUT REQUEST DEBUG ===');
      console.log('Full request body:', JSON.stringify(req.body, null, 2));
      console.log('Extracted planId:', planId, 'Type:', typeof planId);
      console.log('Extracted billingCycle:', billingCycle, 'Type:', typeof billingCycle);
      console.log('=====================================');

      if (!planId || !billingCycle) {
        return res.status(400).json({ message: "Plan ID and billing cycle are required" });
      }

      console.log('Received billing cycle:', billingCycle, 'Type:', typeof billingCycle);
      console.log('Valid billing cycles:', ['weekly', 'monthly', 'yearly']);
      console.log('Includes check:', ['weekly', 'monthly', 'yearly'].includes(billingCycle));
      
      if (!['weekly', 'monthly', 'yearly'].includes(billingCycle)) {
        return res.status(400).json({ message: "Invalid billing cycle" });
      }

      const successUrl = `${req.protocol}://${req.get('host')}/profile?success=true`;
      const cancelUrl = `${req.protocol}://${req.get('host')}/pricing?canceled=true`;

      const session = await createCheckoutSession({
        userId,
        planId,
        billingCycle,
        successUrl,
        cancelUrl,
      });

      console.log(`Created Stripe checkout session:`, {
        sessionId: session.id,
        url: session.url,
        userId,
        planId,
        billingCycle
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create checkout session" 
      });
    }
  });

  // Create customer portal session
  app.post("/api/stripe/create-portal-session", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const returnUrl = `${req.protocol}://${req.get('host')}/profile`;

      const session = await createCustomerPortalSession(userId, returnUrl);

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create portal session" 
      });
    }
  });

  // Stripe webhook endpoint
  app.post("/api/webhooks/stripe", async (req: Request & { rawBody?: string }, res) => {
    console.log('=== STRIPE WEBHOOK RECEIVED ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        console.log('Missing Stripe signature');
        return res.status(400).json({ message: "Missing Stripe signature" });
      }

      // Use raw body for Stripe signature verification
      const payload = req.rawBody ?? JSON.stringify(req.body);
      const event = await verifyWebhookSignature(payload, signature);
      
      console.log('Webhook event type:', event.type);
      console.log('Webhook event data:', JSON.stringify(event.data, null, 2));
      
      console.log('Processing webhook event...');
      await handleWebhookEvent(event);
      console.log('Webhook event processed successfully');
      
      console.log('Webhook processed successfully');
      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Webhook processing failed" 
      });
    }
  });

  // Cancel subscription
  app.post("/api/stripe/cancel-subscription", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      await cancelSubscription(userId);
      
      res.json({ message: "Subscription cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to cancel subscription" 
      });
    }
  });

  // Reactivate subscription
  app.post("/api/stripe/reactivate-subscription", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      await reactivateSubscription(userId);
      
      res.json({ message: "Subscription reactivated successfully" });
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to reactivate subscription" 
      });
    }
  });

  // KIE.ai callback endpoint
  app.post("/api/kie-callback", async (req, res) => {
    try {
      console.log('📞 KIE.ai callback received:', JSON.stringify(req.body, null, 2));
      
      const { taskId, status, response } = req.body;
      
      if (!taskId) {
        return res.status(400).json({ message: "Missing taskId" });
      }

      // Find the generation record by KIE task ID
      const generation = await storage.findGenerationByKieTaskId(taskId);
      if (!generation) {
        console.log(`⚠️  No generation found for KIE task ID: ${taskId}`);
        return res.status(404).json({ message: "Generation not found" });
      }

      if (status === 'SUCCESS' && response?.sunoData && response.sunoData.length > 0) {
        // KIE.ai returns multiple songs; update the primary with the first one
        const sunoData = response.sunoData[0];
        console.log(`✅ KIE.ai generation completed for task ${taskId}`);
        console.log(`📊 Found ${response.sunoData.length} songs, using the first one`);
        console.log(`📊 Selected song data:`, JSON.stringify(sunoData, null, 2));
        
        // Upload to GCS (if configured) and update generation with final URLs
        let audioUrlToSave = sunoData.audioUrl;
        try {
          if (process.env.STORAGE_PROVIDER === 'gcs') {
            console.log('☁️ GCS upload attempt (primary):', {
              provider: process.env.STORAGE_PROVIDER,
              bucket: process.env.GCS_BUCKET_NAME || 'NOT SET',
              sourceUrl: sunoData.audioUrl,
              generationId: generation.id,
            });
            const storageService = getStorageService();
            const resp = await fetch(sunoData.audioUrl);
            console.log(`☁️ GCS fetch (primary) status: ${resp.status}`);
            const arrBuf = await resp.arrayBuffer();
            console.log(`☁️ GCS fetch (primary) bytes: ${arrBuf.byteLength}`);
            const buf = new Uint8Array(arrBuf);
            const filename = `${generation.id}.mp3`;
            audioUrlToSave = await storageService.uploadAudioBuffer(buf, filename);
            console.log(`☁️ Uploaded primary track to GCS path: ${audioUrlToSave}`);
          } else {
            console.log('☁️ Skipping GCS upload (primary): STORAGE_PROVIDER is not gcs');
          }
        } catch (e) {
          console.error('GCS upload error (primary track), falling back to remote URL:', e);
        }

        await storage.updateMusicGeneration(generation.id, {
          status: "completed",
          audioUrl: audioUrlToSave,
          imageUrl: sunoData.imageUrl,
          title: sunoData.title || generation.title,
        });
        
        console.log(`🎵 Generation ${generation.id} completed successfully`);
        console.log(`🎵 Audio URL: ${sunoData.audioUrl}`);
        console.log(`🖼️ Image URL: ${sunoData.imageUrl}`);

        // Save additional songs (if any) as separate tracks for the user library
        if (response.sunoData.length > 1) {
          for (let i = 1; i < response.sunoData.length; i++) {
            const alt = response.sunoData[i];
            try {
              // Avoid duplicates if callback retries
              const existing = (await storage.getUserMusicGenerations(generation.userId))
                .find(g => g.audioUrl === alt.audioUrl);
              if (existing) {
                console.log(`ℹ️ Alternate track already saved: ${existing.id}`);
                continue;
              }

              const altGen = await storage.createTextToMusicGeneration(generation.userId, {
                tags: generation.tags,
                lyrics: generation.lyrics || undefined,
                duration: generation.duration || undefined,
                visibility: generation.visibility,
                title: alt.title || generation.title || undefined,
                type: "text-to-music",
              } as any);

              let altAudioUrlToSave = alt.audioUrl;
              try {
                if (process.env.STORAGE_PROVIDER === 'gcs') {
                  console.log('☁️ GCS upload attempt (alternate):', {
                    provider: process.env.STORAGE_PROVIDER,
                    bucket: process.env.GCS_BUCKET_NAME || 'NOT SET',
                    sourceUrl: alt.audioUrl,
                    generationId: altGen.id,
                  });
                  const storageService = getStorageService();
                  const respAlt = await fetch(alt.audioUrl);
                  console.log(`☁️ GCS fetch (alternate) status: ${respAlt.status}`);
                  const arrBufAlt = await respAlt.arrayBuffer();
                  console.log(`☁️ GCS fetch (alternate) bytes: ${arrBufAlt.byteLength}`);
                  const bufAlt = new Uint8Array(arrBufAlt);
                  const altFilename = `${altGen.id}.mp3`;
                  altAudioUrlToSave = await storageService.uploadAudioBuffer(bufAlt, altFilename);
                  console.log(`☁️ Uploaded alternate track to GCS path: ${altAudioUrlToSave}`);
                } else {
                  console.log('☁️ Skipping GCS upload (alternate): STORAGE_PROVIDER is not gcs');
                }
              } catch (e) {
                console.error('GCS upload error (alternate track), falling back to remote URL:', e);
              }

              await storage.updateMusicGeneration(altGen.id, {
                status: 'completed',
                audioUrl: altAudioUrlToSave,
                imageUrl: alt.imageUrl,
                kieTaskId: generation.kieTaskId,
              });
              console.log(`✅ Saved alternate track ${altGen.id} for user ${generation.userId}`);
            } catch (e) {
              console.error(`Failed saving alternate track index ${i}:`, e);
            }
          }
        }
      } else if (status === 'FAILED') {
        console.log(`❌ KIE.ai generation failed for task ${taskId}`);
        await storage.updateMusicGeneration(generation.id, {
          status: "failed",
        });
      } else {
        console.log(`📊 KIE.ai generation status update for task ${taskId}: ${status}`);
        await storage.updateMusicGeneration(generation.id, {
          status: status === 'PROCESSING' ? 'generating' : 'pending',
        });
      }

      res.json({ message: "Callback processed" });
    } catch (error) {
      console.error("Error processing KIE.ai callback:", error);
      res.status(500).json({ message: "Failed to process callback" });
    }
  });

  // Check KIE.ai generation status manually
  app.get("/api/check-generation-status/:generationId", requireAuth, async (req: any, res) => {
    try {
      const { generationId } = req.params;
      const userId = req.user.id;
      
      // Get the generation record
      const generation = await storage.getGenerationById(generationId);
      if (!generation || generation.userId !== userId) {
        return res.status(404).json({ message: "Generation not found" });
      }

      console.log(`\n📊 STATUS CHECK DEBUG INFO`);
      console.log(`📋 Generation ID: ${generationId}`);
      console.log(`🎯 KIE Task ID: ${generation.kieTaskId || 'MISSING'}`);
      console.log(`📊 Current Status: ${generation.status}`);
      console.log(`👤 User ID: ${generation.userId}`);
      console.log(`⏰ Created: ${generation.createdAt}`);
      console.log(`🔍 Will check KIE status: ${!!(generation.kieTaskId && generation.status === 'generating')}`);
      console.log(`=====================================`);

      // If it has a KIE task ID and is still generating, check status
      if (generation.kieTaskId && generation.status === 'generating') {
        try {
          console.log(`\n🔍 MANUAL STATUS CHECK INITIATED`);
          console.log(`📋 Generation ID: ${generationId}`);
          console.log(`🎯 KIE Task ID: ${generation.kieTaskId}`);
          console.log(`📊 Current Status: ${generation.status}`);
          console.log(`⏰ Created: ${generation.createdAt}`);
          console.log(`=====================================`);
          
          const statusResponse = await checkTaskStatus(generation.kieTaskId);
          
          if (statusResponse.code === 200) {
            const { status, response } = statusResponse.data;
            
            console.log(`📊 KIE.ai Status Response Analysis:`);
            console.log(`   - Code: ${statusResponse.code}`);
            console.log(`   - Status: ${status}`);
            console.log(`   - Has Response: ${!!response}`);
            console.log(`   - Has SunoData: ${!!response?.sunoData}`);
            console.log(`   - SunoData Length: ${response?.sunoData?.length || 0}`);
            
            if (status === 'SUCCESS' && response?.sunoData && response.sunoData.length > 0) {
               const sunoData = response.sunoData[0];
               console.log(`📊 Manual status check - Found ${response.sunoData.length} songs, using first one`);
               console.log(`📊 Manual status check - Selected song:`, JSON.stringify(sunoData, null, 2));
               
               // Upload primary to GCS if enabled
               let manualAudioUrlToSave = sunoData.audioUrl;
               try {
                 if (process.env.STORAGE_PROVIDER === 'gcs') {
                   console.log('☁️ GCS upload attempt (manual primary):', {
                     provider: process.env.STORAGE_PROVIDER,
                     bucket: process.env.GCS_BUCKET_NAME || 'NOT SET',
                     sourceUrl: sunoData.audioUrl,
                     generationId: generation.id,
                   });
                   const storageService = getStorageService();
                   const resp = await fetch(sunoData.audioUrl);
                   console.log(`☁️ GCS fetch (manual primary) status: ${resp.status}`);
                   const arrBuf = await resp.arrayBuffer();
                   console.log(`☁️ GCS fetch (manual primary) bytes: ${arrBuf.byteLength}`);
                   const buf = new Uint8Array(arrBuf);
                   const filename = `${generation.id}.mp3`;
                   manualAudioUrlToSave = await storageService.uploadAudioBuffer(buf, filename);
                   console.log(`☁️ Uploaded primary track (manual check) to GCS path: ${manualAudioUrlToSave}`);
                 } else {
                   console.log('☁️ Skipping GCS upload (manual primary): STORAGE_PROVIDER is not gcs');
                 }
               } catch (e) {
                 console.error('GCS upload error (manual primary), falling back to remote URL:', e);
               }

               await storage.updateMusicGeneration(generation.id, {
                 status: "completed",
                 audioUrl: manualAudioUrlToSave,
                 imageUrl: sunoData.imageUrl,
                 title: sunoData.title || generation.title,
               });
               
               // Save alternates as additional tracks
               if (response.sunoData.length > 1) {
                 for (let i = 1; i < response.sunoData.length; i++) {
                   const alt = response.sunoData[i];
                   try {
                     const existing = (await storage.getUserMusicGenerations(generation.userId))
                       .find(g => g.audioUrl === alt.audioUrl);
                     if (existing) {
                       console.log(`ℹ️ Alternate track already saved: ${existing.id}`);
                       continue;
                     }

                     const altGen = await storage.createTextToMusicGeneration(generation.userId, {
                       tags: generation.tags,
                       lyrics: generation.lyrics || undefined,
                       duration: generation.duration || undefined,
                       visibility: generation.visibility,
                       title: alt.title || generation.title || undefined,
                       type: "text-to-music",
                     } as any);

                     let manualAltAudioUrlToSave = alt.audioUrl;
                     try {
                       if (process.env.STORAGE_PROVIDER === 'gcs') {
                         console.log('☁️ GCS upload attempt (manual alternate):', {
                           provider: process.env.STORAGE_PROVIDER,
                           bucket: process.env.GCS_BUCKET_NAME || 'NOT SET',
                           sourceUrl: alt.audioUrl,
                           generationId: altGen.id,
                         });
                         const storageService = getStorageService();
                         const respAlt = await fetch(alt.audioUrl);
                         console.log(`☁️ GCS fetch (manual alternate) status: ${respAlt.status}`);
                         const arrBufAlt = await respAlt.arrayBuffer();
                         console.log(`☁️ GCS fetch (manual alternate) bytes: ${arrBufAlt.byteLength}`);
                         const bufAlt = new Uint8Array(arrBufAlt);
                         const altFilename = `${altGen.id}.mp3`;
                         manualAltAudioUrlToSave = await storageService.uploadAudioBuffer(bufAlt, altFilename);
                         console.log(`☁️ Uploaded alternate track (manual check) to GCS path: ${manualAltAudioUrlToSave}`);
                       } else {
                         console.log('☁️ Skipping GCS upload (manual alternate): STORAGE_PROVIDER is not gcs');
                       }
                     } catch (e) {
                       console.error('GCS upload error (manual alternate), falling back to remote URL:', e);
                     }

                     await storage.updateMusicGeneration(altGen.id, {
                       status: 'completed',
                       audioUrl: manualAltAudioUrlToSave,
                       imageUrl: alt.imageUrl,
                       kieTaskId: generation.kieTaskId,
                     });
                     console.log(`✅ Saved alternate track ${altGen.id} for user ${generation.userId}`);
                   } catch (e) {
                     console.error(`Failed saving alternate track index ${i}:`, e);
                   }
                 }
               }
               
               console.log(`🎵 Manual check - Updated generation ${generation.id} with URLs`);
               console.log(`🎵 Audio URL: ${sunoData.audioUrl}`);
               console.log(`🖼️ Image URL: ${sunoData.imageUrl}`);
               
               return res.json({
                 status: "completed",
                 primary: {
                   audioUrl: sunoData.audioUrl,
                   imageUrl: sunoData.imageUrl,
                   title: sunoData.title,
                 },
                 alternates: response.sunoData.slice(1).map(alt => ({
                   audioUrl: alt.audioUrl,
                   imageUrl: alt.imageUrl,
                   title: alt.title,
                 })),
               });
                          } else if (status === 'FAILED') {
               console.log(`❌ Generation failed according to KIE.ai`);
               await storage.updateMusicGeneration(generation.id, {
                 status: "failed",
               });
               
               return res.json({ status: "failed" });
             } else {
               console.log(`⏳ Generation still in progress. Status: ${status}`);
               // Update status to current KIE.ai status
               await storage.updateMusicGeneration(generation.id, {
                 status: status === 'PROCESSING' ? 'generating' : 'pending',
               });
             }
           } else {
             console.log(`❌ KIE.ai API returned non-200 code: ${statusResponse.code}`);
           }
         } catch (statusError) {
          console.error("Error checking KIE.ai status:", statusError);
        }
      } else {
        console.log(`🚫 SKIPPING KIE.ai status check:`);
        console.log(`   - Has KIE Task ID: ${!!generation.kieTaskId}`);
        console.log(`   - Status is 'generating': ${generation.status === 'generating'}`);
        console.log(`   - Actual status: ${generation.status}`);
      }

      // Return current status
      res.json({
        status: generation.status,
        audioUrl: generation.audioUrl,
        imageUrl: generation.imageUrl,
        title: generation.title,
      });
    } catch (error) {
      console.error("Error checking generation status:", error);
      res.status(500).json({ message: "Failed to check generation status" });
    }
  });

  // ===== DATABASE MANAGEMENT ROUTES (Admin Only) =====
  
  // Get database statistics
  app.get('/api/admin/database/stats', isAdminAuthenticated, async (req, res) => {
    try {
      console.log('🔍 Getting database statistics...');
      const client = await pool.connect();
      
      try {
        // First, let's check what schemas exist
        const schemasResult = await client.query(`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          ORDER BY schema_name
        `);
        console.log('📋 Available schemas:', schemasResult.rows.map((r: any) => r.schema_name));
        
        // Get all table names from all schemas (not just public)
        const tablesResult = await client.query(`
          SELECT table_schema, table_name 
          FROM information_schema.tables 
          WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          AND table_type = 'BASE TABLE'
          ORDER BY table_schema, table_name
        `);
        
        console.log('📊 Found tables:', tablesResult.rows);
        const tableNames = tablesResult.rows.map((row: any) => row.table_name);
        
        // Get row counts for each table
        const tableStats = [];
        let totalRows = 0;
        
        for (const row of tablesResult.rows) {
          const { table_schema, table_name } = row as any;
          try {
            const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table_schema}"."${table_name}"`);
            const rowCount = parseInt(countResult.rows[0].count);
            tableStats.push({ tableName: table_name, rowCount });
            totalRows += rowCount;
            console.log(`✅ ${table_schema}.${table_name}: ${rowCount} rows`);
          } catch (error) {
            console.error(`❌ Error counting rows in ${table_schema}.${table_name}:`, error);
            tableStats.push({ tableName: table_name, rowCount: 0 });
          }
        }
        
        console.log('📈 Final stats:', { totalTables: tableNames.length, totalRows, tableStats });
        
        res.json({
          totalTables: tableNames.length,
          totalRows,
          tableStats,
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      res.status(500).json({ message: 'Failed to get database statistics', error: (error as Error).message });
    }
  });

  // Get list of all tables
  app.get('/api/admin/database/tables', isAdminAuthenticated, async (req, res) => {
    try {
      const client = await pool.connect();
      
      try {
        const result = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);
        
        const tableNames = result.rows.map((row: any) => row.table_name);
        res.json(tableNames);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting table list:', error);
      res.status(500).json({ message: 'Failed to get table list' });
    }
  });

  // Get table structure and sample data
  app.get('/api/admin/database/table/:tableName', isAdminAuthenticated, async (req, res) => {
    try {
      const { tableName } = req.params;
      
      // Validate table name to prevent SQL injection
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        return res.status(400).json({ message: 'Invalid table name' });
      }
      
      const client = await pool.connect();
      
      try {
        // First, find which schema the table is in
        const schemaResult = await client.query(`
          SELECT table_schema 
          FROM information_schema.tables 
          WHERE table_name = $1 
          AND table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          LIMIT 1
        `, [tableName]);
        
        if (schemaResult.rows.length === 0) {
          return res.status(404).json({ message: 'Table not found' });
        }
        
        const tableSchema = schemaResult.rows[0].table_schema;
        
        // Get table columns
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          AND table_schema = $2
          ORDER BY ordinal_position
        `, [tableName, tableSchema]);
        
        // Get sample data (first 10 rows)
        const sampleResult = await client.query(`
          SELECT * FROM "${tableSchema}"."${tableName}" 
          ORDER BY 
            CASE 
              WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND table_schema = $2 AND column_name = 'created_at') 
              THEN 'created_at' 
              ELSE (SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = $2 ORDER BY ordinal_position LIMIT 1)
            END DESC
          LIMIT 10
        `, [tableName, tableSchema]);
        
        // Get total row count
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableSchema}"."${tableName}"`);
        const rowCount = parseInt(countResult.rows[0].count);
        
        res.json({
          tableName,
          columns: columnsResult.rows,
          rowCount,
          sampleData: sampleResult.rows,
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting table data:', error);
      res.status(500).json({ message: 'Failed to get table data' });
    }
  });

  // ===== PLAYLIST ENDPOINTS =====

  // Create playlist tables (migration endpoint)
  app.post('/api/admin/create-playlist-tables', isAdminAuthenticated, async (req: any, res) => {
    try {
      const client = await pool.connect();
      
      try {
        console.log('Creating playlist tables...');
        
        // Create playlists table
        await client.query(`
          CREATE TABLE IF NOT EXISTS playlists (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            description TEXT,
            is_public BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
        
        // Create playlist_tracks table
        await client.query(`
          CREATE TABLE IF NOT EXISTS playlist_tracks (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            playlist_id VARCHAR NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
            track_id VARCHAR NOT NULL REFERENCES music_generations(id) ON DELETE CASCADE,
            added_at TIMESTAMP DEFAULT NOW(),
            position INTEGER NOT NULL DEFAULT 0
          );
        `);
        
        // Create indexes for better performance
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
        `);
        
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
        `);
        
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id);
        `);
        
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);
        `);
        
        // Add unique constraint to prevent duplicate tracks in the same playlist
        await client.query(`
          ALTER TABLE playlist_tracks 
          ADD CONSTRAINT IF NOT EXISTS unique_playlist_track 
          UNIQUE (playlist_id, track_id);
        `);
        
        console.log('✅ Playlist tables created successfully!');
        res.json({ message: 'Playlist tables created successfully!' });
        
      } catch (error) {
        console.error('❌ Error creating playlist tables:', error);
        res.status(500).json({ message: 'Failed to create playlist tables', error: error instanceof Error ? error.message : String(error) });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Database connection error:', error);
      res.status(500).json({ message: 'Database connection failed', error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get user's playlists
  app.get('/api/playlists', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userPlaylists = await storage.getUserPlaylists(userId);
      res.json(userPlaylists);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      res.status(500).json({ message: 'Failed to fetch playlists' });
    }
  });

  // Create new playlist
  app.post('/api/playlists', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validation = insertPlaylistSchema.parse(req.body);
      
      const playlist = await storage.createPlaylist(userId, validation);
      res.status(201).json(playlist);
    } catch (error) {
      console.error('Error creating playlist:', error);
      res.status(500).json({ message: 'Failed to create playlist' });
    }
  });

  // Update playlist
  app.patch('/api/playlists/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const validation = updatePlaylistSchema.parse(req.body);
      
      const playlist = await storage.updatePlaylist(id, userId, validation);
      if (!playlist) {
        return res.status(404).json({ message: 'Playlist not found' });
      }
      
      res.json(playlist);
    } catch (error) {
      console.error('Error updating playlist:', error);
      res.status(500).json({ message: 'Failed to update playlist' });
    }
  });

  // Delete playlist
  app.delete('/api/playlists/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const success = await storage.deletePlaylist(id, userId);
      if (!success) {
        return res.status(404).json({ message: 'Playlist not found' });
      }
      
      res.json({ message: 'Playlist deleted successfully' });
    } catch (error) {
      console.error('Error deleting playlist:', error);
      res.status(500).json({ message: 'Failed to delete playlist' });
    }
  });

  // Get playlist tracks
  app.get('/api/playlists/:id/tracks', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const tracks = await storage.getPlaylistTracks(id, userId);
      res.json(tracks);
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      res.status(500).json({ message: 'Failed to fetch playlist tracks' });
    }
  });

  // Add track to playlist
  app.post('/api/playlists/:id/tracks', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id: playlistId } = req.params;
      const { trackId } = req.body;
      
      if (!trackId) {
        return res.status(400).json({ message: 'Track ID is required' });
      }
      
      const success = await storage.addTrackToPlaylist(playlistId, trackId, userId);
      if (!success) {
        return res.status(404).json({ message: 'Playlist or track not found' });
      }
      
      res.json({ message: 'Track added to playlist successfully' });
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      res.status(500).json({ message: 'Failed to add track to playlist' });
    }
  });

  // Remove track from playlist
  app.delete('/api/playlists/:playlistId/tracks/:trackId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { playlistId, trackId } = req.params;
      
      const success = await storage.removeTrackFromPlaylist(playlistId, trackId, userId);
      if (!success) {
        return res.status(404).json({ message: 'Playlist or track not found' });
      }
      
      res.json({ message: 'Track removed from playlist successfully' });
    } catch (error) {
      console.error('Error removing track from playlist:', error);
      res.status(500).json({ message: 'Failed to remove track from playlist' });
    }
  });

  // Community feed routes
  app.get('/api/community/tracks', async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit || '50');
      const offset = parseInt(req.query.offset || '0');
      const tracks = await storage.getCommunityTracks(limit, offset);
      
      // Get user's like status if authenticated
      const userId = req.session?.userId || req.user?.id || null;
      const tracksWithUserLikes = await Promise.all(
        tracks.map(async (track) => {
          const userLiked = userId ? await storage.hasUserLikedTrack(track.id, userId) : false;
          return { ...track, userLiked };
        })
      );
      
      res.json(tracksWithUserLikes);
    } catch (error) {
      console.error('Error fetching community tracks:', error);
      res.status(500).json({ message: 'Failed to fetch community tracks' });
    }
  });

  // Track likes routes
  app.post('/api/tracks/:id/like', requireAuth, async (req: any, res) => {
    try {
      const { id: trackId } = req.params;
      const userId = req.user.id;
      
      const result = await storage.toggleTrackLike(trackId, userId);
      res.json(result);
    } catch (error) {
      console.error('Error toggling track like:', error);
      res.status(500).json({ message: 'Failed to toggle like' });
    }
  });

  app.get('/api/tracks/:id/likes', async (req: any, res) => {
    try {
      const { id: trackId } = req.params;
      const likeCount = await storage.getTrackLikeCount(trackId);
      const userId = req.session?.userId || req.user?.id || null;
      const userLiked = userId ? await storage.hasUserLikedTrack(trackId, userId) : false;
      
      res.json({ likeCount, userLiked });
    } catch (error) {
      console.error('Error fetching track likes:', error);
      res.status(500).json({ message: 'Failed to fetch likes' });
    }
  });

  // Track comments routes
  app.post('/api/tracks/:id/comments', requireAuth, async (req: any, res) => {
    try {
      const { id: trackId } = req.params;
      const userId = req.user.id;
      const validation = insertTrackCommentSchema.parse({ ...req.body, trackId });
      
      const comment = await storage.createTrackComment(trackId, userId, validation.comment);
      
      // Get user info for the comment
      const user = await storage.getUser(userId);
      const commentWithUser = {
        ...comment,
        user: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImageUrl: user.profileImageUrl,
          username: user.username,
        } : null,
      };
      
      res.json(commentWithUser);
    } catch (error) {
      console.error('Error creating comment:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create comment' });
    }
  });

  app.get('/api/tracks/:id/comments', async (req: any, res) => {
    try {
      const { id: trackId } = req.params;
      const comments = await storage.getTrackComments(trackId);
      res.json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });

  app.delete('/api/tracks/:trackId/comments/:commentId', requireAuth, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;
      
      const deleted = await storage.deleteTrackComment(commentId, userId);
      if (!deleted) {
        return res.status(404).json({ message: 'Comment not found or access denied' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ message: 'Failed to delete comment' });
    }
  });

  // Get track with album and band info for community feed
  app.get('/api/tracks/:id/community-info', async (req: any, res) => {
    try {
      const { id: trackId } = req.params;
      const track = await storage.getMusicGeneration(trackId);
      
      if (!track || track.visibility !== 'public' || track.status !== 'completed') {
        return res.status(404).json({ message: 'Track not found or not available' });
      }
      
      // Get album info
      const album = track.albumId ? await storage.getAlbumById(track.albumId) : null;
      
      // Get user info
      const user = await storage.getUser(track.userId);
      
      // Get band info
      let band = null;
      let bandMembers = [];
      if (user) {
        const bandResult = await pool.query(
          'SELECT id, name, description, band_image_url AS "bandImageUrl" FROM bands WHERE user_id = $1',
          [user.id]
        );
        if (bandResult.rows.length > 0) {
          band = bandResult.rows[0];
          const membersResult = await pool.query(
            'SELECT id, name, role, image_url AS "imageUrl", description, position FROM band_members WHERE band_id = $1 ORDER BY position',
            [band.id]
          );
          bandMembers = membersResult.rows;
        }
      }
      
      // Get like and comment counts
      const likeCount = await storage.getTrackLikeCount(trackId);
      const comments = await storage.getTrackComments(trackId);
      const userId = req.session?.userId || req.user?.id || null;
      const userLiked = userId ? await storage.hasUserLikedTrack(trackId, userId) : false;
      
      res.json({
        track,
        user: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImageUrl: user.profileImageUrl,
          username: user.username,
        } : null,
        album,
        band,
        bandMembers,
        likeCount,
        commentCount: comments.length,
        userLiked,
      });
    } catch (error) {
      console.error('Error fetching track community info:', error);
      res.status(500).json({ message: 'Failed to fetch track info' });
    }
  });

  // Band routes
  // Get user's band
  app.get('/api/band', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const bandResult = await pool.query(
        `SELECT 
           id,
           user_id          AS "userId",
           name,
           description,
           band_image_url   AS "bandImageUrl",
           created_at       AS "createdAt",
           updated_at       AS "updatedAt"
         FROM bands WHERE user_id = $1`,
        [userId]
      );
      
      if (bandResult.rows.length === 0) {
        return res.json({ band: null, members: [] });
      }
      
      const band = bandResult.rows[0];
      
      const membersResult = await pool.query(
        `SELECT 
           id,
           band_id       AS "bandId",
           name,
           role,
           image_url     AS "imageUrl",
           description,
           position,
           created_at    AS "createdAt",
           updated_at    AS "updatedAt"
         FROM band_members 
         WHERE band_id = $1 
         ORDER BY position ASC`,
        [band.id]
      );
      
      res.json({ 
        band, 
        members: membersResult.rows 
      });
    } catch (error) {
      console.error('Error fetching band:', error);
      res.status(500).json({ message: 'Failed to fetch band' });
    }
  });

  // Create or update band
  app.post('/api/band', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertBandSchema.parse(req.body);
      
      // Check if user already has a band
      const existingBand = await pool.query(
        'SELECT id FROM bands WHERE user_id = $1',
        [userId]
      );
      
      let band;
      if (existingBand.rows.length > 0) {
        // Update existing band
        const result = await pool.query(
          'UPDATE bands SET name = $1, description = $2, updated_at = NOW() WHERE user_id = $3 RETURNING *',
          [validatedData.name, validatedData.description, userId]
        );
        band = result.rows[0];
      } else {
        // Create new band
        const result = await pool.query(
          'INSERT INTO bands (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
          [userId, validatedData.name, validatedData.description]
        );
        band = result.rows[0];
      }
      
      res.json({ band });
    } catch (error) {
      console.error('Error creating/updating band:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create/update band' });
    }
  });

  // Add band member
  app.post('/api/band/members', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertBandMemberSchema.parse(req.body);
      
      // Check if user has a band
      const bandResult = await pool.query(
        'SELECT id FROM bands WHERE user_id = $1',
        [userId]
      );
      
      if (bandResult.rows.length === 0) {
        return res.status(400).json({ message: 'User does not have a band' });
      }
      
      const bandId = bandResult.rows[0].id;
      
      // Check if position is already taken
      const existingMember = await pool.query(
        'SELECT id FROM band_members WHERE band_id = $1 AND position = $2',
        [bandId, validatedData.position]
      );
      
      if (existingMember.rows.length > 0) {
        return res.status(400).json({ message: 'Position already taken' });
      }
      
      const result = await pool.query(
        `INSERT INTO band_members (band_id, name, role, description, position)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING 
           id,
           band_id       AS "bandId",
           name,
           role,
           image_url     AS "imageUrl",
           description,
           position,
           created_at    AS "createdAt",
           updated_at    AS "updatedAt"`,
        [bandId, validatedData.name, validatedData.role, validatedData.description, validatedData.position]
      );
      
      res.json({ member: result.rows[0] });
    } catch (error) {
      console.error('Error adding band member:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to add band member' });
    }
  });

  // Update band member
  app.put('/api/band/members/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const memberId = req.params.id;
      const validatedData = updateBandMemberSchema.parse(req.body);
      
      // Verify the member belongs to the user's band
      const memberResult = await pool.query(
        `SELECT bm.* FROM band_members bm 
         JOIN bands b ON bm.band_id = b.id 
         WHERE bm.id = $1 AND b.user_id = $2`,
        [memberId, userId]
      );
      
      if (memberResult.rows.length === 0) {
        return res.status(404).json({ message: 'Band member not found' });
      }
      
      // Build update query dynamically
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      if (validatedData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(validatedData.name);
      }
      if (validatedData.role !== undefined) {
        updateFields.push(`role = $${paramCount++}`);
        values.push(validatedData.role);
      }
      if (validatedData.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(validatedData.description);
      }
      if (validatedData.position !== undefined) {
        updateFields.push(`position = $${paramCount++}`);
        values.push(validatedData.position);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(memberId);
      
      const result = await pool.query(
        `UPDATE band_members 
           SET ${updateFields.join(', ')} 
         WHERE id = $${paramCount} 
         RETURNING 
           id,
           band_id       AS "bandId",
           name,
           role,
           image_url     AS "imageUrl",
           description,
           position,
           created_at    AS "createdAt",
           updated_at    AS "updatedAt"`,
        values
      );
      
      res.json({ member: result.rows[0] });
    } catch (error) {
      console.error('Error updating band member:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update band member' });
    }
  });

  // Delete band member
  app.delete('/api/band/members/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const memberId = req.params.id;
      
      // Verify the member belongs to the user's band
      const memberResult = await pool.query(
        `SELECT bm.* FROM band_members bm 
         JOIN bands b ON bm.band_id = b.id 
         WHERE bm.id = $1 AND b.user_id = $2`,
        [memberId, userId]
      );
      
      if (memberResult.rows.length === 0) {
        return res.status(404).json({ message: 'Band member not found' });
      }
      
      await pool.query('DELETE FROM band_members WHERE id = $1', [memberId]);
      
      res.json({ message: 'Band member deleted successfully' });
    } catch (error) {
      console.error('Error deleting band member:', error);
      res.status(500).json({ message: 'Failed to delete band member' });
    }
  });

  // Generate band member image
  app.post('/api/band/members/generate-image', requireAuth, async (req: any, res) => {
    try {
      const { description } = req.body;
      
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ message: 'Description is required' });
      }
      
      const requestId = await wavespeedService.generateImage(description);
      
      res.json({ requestId });
    } catch (error) {
      console.error('Error generating band member image:', error);
      res.status(500).json({ message: 'Failed to generate image' });
    }
  });

  // Check image generation status
  app.get('/api/band/members/image-status/:requestId', requireAuth, async (req: any, res) => {
    try {
      const { requestId } = req.params;
      
      const result = await wavespeedService.checkImageStatus(requestId);
      
      res.json({ 
        status: result.status,
        imageUrl: result.status === 'completed' ? result.outputs[0] : null,
        error: result.error
      });
    } catch (error) {
      console.error('Error checking image status:', error);
      res.status(500).json({ message: 'Failed to check image status' });
    }
  });

  // Save band member image
  app.post('/api/band/members/:id/save-image', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const memberId = req.params.id;
      const { imageUrl } = req.body;
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ message: 'Image URL is required' });
      }
      
      // Verify the member belongs to the user's band
      const memberResult = await pool.query(
        `SELECT bm.* FROM band_members bm 
         JOIN bands b ON bm.band_id = b.id 
         WHERE bm.id = $1 AND b.user_id = $2`,
        [memberId, userId]
      );
      
      if (memberResult.rows.length === 0) {
        return res.status(404).json({ message: 'Band member not found' });
      }
      
      // Download and save the image to our storage
      const storageService = getStorageService();
      let imageBuffer: Buffer;
      if (typeof imageUrl === 'string' && imageUrl.startsWith('/objects/')) {
        // Download directly from our storage if it's an internal object path
        const objectFile: any = await storageService.getObjectEntityFile(imageUrl);
        const [buf] = await objectFile.download();
        imageBuffer = buf as Buffer;
      } else {
        // Absolute URL
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error('Failed to download image');
        }
        const arr = await imageResponse.arrayBuffer();
        imageBuffer = Buffer.from(arr);
      }
      const fileName = `band-members/${memberId}-${Date.now()}.png`;
      
      let savedUrl: string;
      if (storageService instanceof GCSStorageService) {
        savedUrl = await storageService.uploadImageBuffer(new Uint8Array(imageBuffer), fileName);
      } else {
        // For other storage services, we'll need to implement a generic upload method
        // For now, let's throw an error
        throw new Error('Image upload not supported for this storage service');
      }
      
      // Update the band member with the saved image URL
      const result = await pool.query(
        `UPDATE band_members 
           SET image_url = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING 
           id,
           band_id       AS "bandId",
           name,
           role,
           image_url     AS "imageUrl",
           description,
           position,
           created_at    AS "createdAt",
           updated_at    AS "updatedAt"`,
        [savedUrl, memberId]
      );
      
      res.json({ member: result.rows[0] });
    } catch (error) {
      console.error('Error saving band member image:', error);
      res.status(500).json({ message: 'Failed to save image' });
    }
  });

  // Generate band picture (edit API)
  app.post('/api/band/generate-picture', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { prompt, memberIds } = req.body as { prompt: string; memberIds: string[] };
      if (!prompt || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ message: 'Prompt and memberIds are required' });
      }
      // Load user band and validate members
      const bandResult = await pool.query('SELECT id FROM bands WHERE user_id = $1', [userId]);
      if (bandResult.rows.length === 0) return res.status(400).json({ message: 'User does not have a band' });
      const bandId = bandResult.rows[0].id;
      const members = await pool.query(
        `SELECT id, image_url FROM band_members WHERE band_id = $1 AND id = ANY($2::varchar[])`,
        [bandId, memberIds]
      );
      const imageUrls: string[] = [];
      for (const m of members.rows) {
        const url = m.image_url as string | null;
        if (url) {
          // convert internal /objects/* to absolute public URL
          const absolute = url.startsWith('/objects/') ? `${req.protocol}://${req.get('host')}${url}` : url;
          imageUrls.push(absolute);
        }
      }
      if (imageUrls.length === 0) return res.status(400).json({ message: 'Selected members have no images' });
      const requestId = await wavespeedService.generateBandPicture(prompt, imageUrls);
      res.json({ requestId });
    } catch (e) {
      console.error('Error starting band picture generation:', e);
      res.status(500).json({ message: 'Failed to start generation' });
    }
  });

  // Poll band picture status
  app.get('/api/band/picture-status/:requestId', requireAuth, async (req: any, res) => {
    try {
      const { requestId } = req.params;
      const status = await wavespeedService.checkImageStatus(requestId);
      res.json({
        status: status.status,
        imageUrl: status.status === 'completed' ? status.outputs[0] : null,
        error: status.error,
      });
    } catch (e) {
      res.status(500).json({ message: 'Failed to check status' });
    }
  });

  // Save band picture to band
  app.post('/api/band/save-picture', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { imageUrl } = req.body as { imageUrl: string };
      if (!imageUrl) return res.status(400).json({ message: 'imageUrl is required' });
      const bandResult = await pool.query('SELECT id FROM bands WHERE user_id = $1', [userId]);
      if (bandResult.rows.length === 0) return res.status(400).json({ message: 'User does not have a band' });
      const bandId = bandResult.rows[0].id;

      // Download external and store into generated/
      const storageService = getStorageService();
      const resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error('download failed');
      const arr = await resp.arrayBuffer();
      const buf = Buffer.from(arr);

      let savedUrl: string;
      if (storageService instanceof GCSStorageService) {
        const fileName = `band-images/${bandId}-${Date.now()}.jpeg`;
        savedUrl = await storageService.uploadImageBuffer(new Uint8Array(buf), fileName);
      } else {
        throw new Error('Image upload not supported for this storage service');
      }

      await pool.query('UPDATE bands SET band_image_url = $1, updated_at = NOW() WHERE id = $2', [savedUrl, bandId]);
      res.json({ bandImageUrl: savedUrl });
    } catch (e) {
      console.error('Error saving band picture:', e);
      res.status(500).json({ message: 'Failed to save band picture' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
