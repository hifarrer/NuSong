import { Storage } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class GCSStorageService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    // Parse credentials from environment variable
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is required");
    }

    let credentials: any;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (e) {
      try {
        const decoded = Buffer.from(credentialsJson, 'base64').toString('utf8');
        credentials = JSON.parse(decoded);
      } catch {
        throw new Error("Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON: must be valid JSON or base64-encoded JSON");
      }
    }
    this.bucketName = process.env.GCS_BUCKET_NAME;
    
    if (!this.bucketName) {
      throw new Error("GCS_BUCKET_NAME environment variable is required");
    }

    this.storage = new Storage({
      credentials,
      projectId: credentials.project_id
    });
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    return `/${this.bucketName}`;
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const objectName = `uploads/${objectId}`;
    
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectName);
    
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: 'application/octet-stream'
    });
    
    return url;
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
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(entityId);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    return file;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("file://")) {
      // Not expected for GCS; return as-is
      return rawPath;
    }
    
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      // Normalize to a stable, direct, public GCS URL (strip query if present)
      const url = new URL(rawPath);
      const clean = `https://storage.googleapis.com${url.pathname}`;
      return clean;
    }

    // Assume already a path within our bucket; convert to direct GCS URL
    if (rawPath.startsWith("/objects/")) {
      const parts = rawPath.slice(1).split("/");
      const entityId = parts.slice(1).join("/");
      return `https://storage.googleapis.com/${this.bucketName}/${entityId}`;
    }

    return rawPath;
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
    return `https://storage.googleapis.com/${this.bucketName}/${entityId}`;
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
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(entityId);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + ttlSec * 1000
    });

    return url;
  }

  // Upload audio buffer to GCS
  async uploadAudioBuffer(audioBuffer: Uint8Array, filename: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`generated/${filename}`);
    
    await file.save(audioBuffer, {
      metadata: {
        contentType: 'audio/mpeg'
      }
    });
    
    return `https://storage.googleapis.com/${this.bucketName}/generated/${filename}`;
  }

  // Upload image buffer to GCS
  async uploadImageBuffer(imageBuffer: Uint8Array, filename: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`generated/${filename}`);
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg'
      }
    });
    return `https://storage.googleapis.com/${this.bucketName}/generated/${filename}`;
  }

  // Download object and stream to response
  async downloadObject(file: any, res: Response, cacheTtlSec: number = 3600): Promise<void> {
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
}

// Mock function for signing URLs (not needed for GCS storage)
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
  // This function is not used with GCS storage service
  throw new Error("signObjectURL not implemented for GCS storage");
}
