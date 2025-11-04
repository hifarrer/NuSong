import { createMuxAsset, getMuxAssetStatus, isMuxConfigured } from './mux.js';
import { storage } from '../storage.js';
import { pool } from '../db.js';

interface MuxJob {
  trackId: string;
  videoUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  assetId?: string;
  playbackId?: string;
  attempts: number;
  createdAt: Date;
}

class MuxJobManager {
  private jobs = new Map<string, MuxJob>();
  private isProcessing = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Check job status every 30 seconds
    this.startProcessing();
  }

  /**
   * Add a new MUX job for a completed video
   */
  async addJob(trackId: string, videoUrl: string): Promise<void> {
    if (!isMuxConfigured()) {
      console.log('⚠️  MUX not configured, skipping video processing');
      return;
    }

    const job: MuxJob = {
      trackId,
      videoUrl,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
    };

    this.jobs.set(trackId, job);
    
    console.log(`📋 MUX job added for track ${trackId}`);
    
    // Process immediately
    if (!this.isProcessing) {
      this.processJobs();
    }
  }

  private startProcessing(): void {
    // Poll every 30 seconds
    this.processInterval = setInterval(() => {
      this.processJobs();
    }, 30000);
  }

  private async processJobs(): Promise<void> {
    if (this.isProcessing || !isMuxConfigured()) return;
    
    this.isProcessing = true;

    try {
      const pendingJobs = Array.from(this.jobs.values()).filter(
        job => job.status === 'pending' || job.status === 'processing'
      );

      if (pendingJobs.length === 0) {
        return;
      }

      console.log(`🔄 Processing ${pendingJobs.length} MUX job(s)...`);

      for (const job of pendingJobs) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error('❌ Error processing MUX jobs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(job: MuxJob): Promise<void> {
    const maxAttempts = 5;
    
    try {
      if (job.status === 'pending') {
        // Step 1: Create MUX asset
        console.log(`📹 Creating MUX asset for track ${job.trackId}`);
        
        const result = await createMuxAsset(job.videoUrl);
        
        job.assetId = result.assetId;
        job.playbackId = result.playbackId;
        job.status = 'processing';

        // Update database with MUX IDs
        await pool.query(
          `UPDATE music_generations 
           SET mux_asset_id = $1, 
               mux_playback_id = $2, 
               mux_asset_status = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [result.assetId, result.playbackId, result.status, job.trackId]
        );

        console.log(`✅ MUX asset created: ${result.assetId}`);
        
      } else if (job.status === 'processing' && job.assetId) {
        // Step 2: Check asset status
        const status = await getMuxAssetStatus(job.assetId);
        
        if (status.status === 'ready') {
          // Success! Video is ready to stream
          job.status = 'completed';
          
          await pool.query(
            `UPDATE music_generations 
             SET mux_asset_status = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            ['ready', job.trackId]
          );

          console.log(`✅ MUX asset ready for track ${job.trackId}: ${status.hlsUrl}`);
          
          // Clean up completed job after 24 hours
          setTimeout(() => {
            this.jobs.delete(job.trackId);
          }, 24 * 60 * 60 * 1000);
          
        } else if (status.status === 'errored') {
          // Failed
          job.status = 'failed';
          
          await pool.query(
            `UPDATE music_generations 
             SET mux_asset_status = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            ['errored', job.trackId]
          );

          console.error(`❌ MUX asset failed for track ${job.trackId}:`, status.errors);
        } else {
          // Still processing
          console.log(`⏳ MUX asset still processing for track ${job.trackId} (status: ${status.status})`);
        }
      }

      job.attempts++;
      this.jobs.set(job.trackId, job);

    } catch (error) {
      console.error(`❌ Error processing MUX job for track ${job.trackId}:`, error);
      
      job.attempts++;
      
      if (job.attempts >= maxAttempts) {
        job.status = 'failed';
        await pool.query(
          `UPDATE music_generations 
           SET mux_asset_status = $1,
               updated_at = NOW()
           WHERE id = $2`,
          ['errored', job.trackId]
        );
        console.error(`❌ MUX job failed after ${maxAttempts} attempts for track ${job.trackId}`);
      }
      
      this.jobs.set(job.trackId, job);
    }
  }

  /**
   * Stop processing (cleanup)
   */
  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }
}

// Singleton instance
export const muxJobManager = new MuxJobManager();

// Helper function to queue a video for MUX processing
export async function createMuxAssetForVideo(
  trackId: string, 
  videoUrl: string
): Promise<void> {
  await muxJobManager.addJob(trackId, videoUrl);
}

