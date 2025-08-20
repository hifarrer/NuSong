import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTextToMusicSchema, insertAudioToMusicSchema } from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { z } from "zod";

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || "36d002d2-c5db-49fe-b02c-5552be87e29e:cb8148d966acf4a68d72e1cb719d6079";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Object storage routes
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.post("/api/objects/normalize-path", isAuthenticated, async (req, res) => {
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

  // Text-to-music generation
  app.post("/api/generate-text-to-music", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertTextToMusicSchema.parse(req.body);
      
      // Create generation record
      const generation = await storage.createTextToMusicGeneration(userId, validation);
      
      // Submit request to FAL.ai
      const falResponse = await fetch("https://queue.fal.run/fal-ai/ace-step", {
        method: "POST",
        headers: {
          "Authorization": `Key ${FAL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tags: validation.tags,
          lyrics: validation.lyrics || "",
          duration: validation.duration,
        })
      });

      if (!falResponse.ok) {
        const errorText = await falResponse.text();
        console.error("FAL.ai API error:", errorText);
        await storage.updateMusicGeneration(generation.id, { status: "failed" });
        return res.status(500).json({ message: "Failed to submit music generation request" });
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
      console.error("Error generating music:", error);
      res.status(500).json({ message: "Failed to generate music" });
    }
  });

  // Audio-to-music generation
  app.post("/api/generate-audio-to-music", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      
      // Submit request to FAL.ai
      const falResponse = await fetch("https://queue.fal.run/fal-ai/ace-step/audio-to-audio", {
        method: "POST",
        headers: {
          "Authorization": `Key ${FAL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          audio_url: publicAudioUrl,
          tags: validation.tags,
          original_tags: validation.tags, // Copy tags to original_tags as required by FAL.ai
          lyrics: validation.lyrics || "",
        })
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

  app.get("/api/generation/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get("/api/my-generations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const generations = await storage.getUserMusicGenerations(userId);
      res.json(generations);
    } catch (error) {
      console.error("Error fetching user generations:", error);
      res.status(500).json({ message: "Failed to fetch generations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
