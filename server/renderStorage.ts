import { Response } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create storage directory if it doesn't exist
const STORAGE_DIR = path.join(__dirname, "..", "render-storage");
const UPLOADS_DIR = path.join(STORAGE_DIR, "uploads");
const GENERATED_DIR = path.join(STORAGE_DIR, "generated");

// Ensure directories exist
[STORAGE_DIR, UPLOADS_DIR, GENERATED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class RenderStorageService {
  constructor() {}

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    return "/render-storage";
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const fullPath = `/render-storage/uploads/${objectId}`;
    
    // For Render, return a local path
    return `file://${path.join(UPLOADS_DIR, objectId)}`;
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<any> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    const filePath = path.join(STORAGE_DIR, entityId);
    
    if (!fs.existsSync(filePath)) {
      throw new ObjectNotFoundError();
    }

    return {
      exists: async () => [true],
      createReadStream: () => fs.createReadStream(filePath),
      getMetadata: async () => [{
        contentType: this.getContentType(filePath),
        size: fs.statSync(filePath).size
      }]
    };
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("file://")) {
      // Extract the filename from the file:// URL
      const url = new URL(rawPath);
      const filename = path.basename(url.pathname);
      return `/objects/uploads/${filename}`;
    }
    
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
  
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
  
    // Extract the entity ID from the path
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // Gets a direct public URL for the object entity (no expiration)
  getObjectEntityDirectPublicUrl(objectPath: string): string {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    return `/uploads/${entityId}`;
  }

  // Gets a publicly accessible signed URL for the object entity
  async getObjectEntityPublicUrl(objectPath: string, ttlSec: number = 3600): Promise<string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    const filePath = path.join(STORAGE_DIR, entityId);
    
    if (!fs.existsSync(filePath)) {
      throw new ObjectNotFoundError();
    }

    // For Render, return a local file URL
    return `file://${filePath}`;
  }

  // Upload audio buffer to Render storage
  async uploadAudioBuffer(audioBuffer: Uint8Array, filename: string): Promise<string> {
    const filePath = path.join(GENERATED_DIR, filename);
    
    // Write the buffer to file
    fs.writeFileSync(filePath, audioBuffer);
    
    return `/objects/generated/${filename}`;
  }

  // Download object and stream to response
  async downloadObject(file: any, res: any, cacheTtlSec: number = 3600): Promise<void> {
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err: any) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.mp3':
        return 'audio/mpeg';
      case '.wav':
        return 'audio/wav';
      case '.m4a':
        return 'audio/mp4';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      default:
        return 'application/octet-stream';
    }
  }
}

// Mock function for signing URLs (not needed for Render storage)
export async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  // For Render, return a local file URL
  const filePath = path.join(STORAGE_DIR, objectName);
  return `file://${filePath}`;
}
