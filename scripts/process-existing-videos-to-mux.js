import { Pool } from 'pg';
import dotenv from 'dotenv';
import Mux from '@mux/mux-node';

// Load environment variables
dotenv.config({ path: '.env' });

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// MUX configuration
const muxTokenId = process.env.MUX_TOKEN_ID;
const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

if (!muxTokenId || !muxTokenSecret) {
  console.error('❌ MUX_TOKEN_ID or MUX_TOKEN_SECRET not found in environment variables');
  process.exit(1);
}

// Initialize MUX client
const mux = new Mux({
  tokenId: muxTokenId,
  tokenSecret: muxTokenSecret,
});

/**
 * Normalize video URL to ensure it's publicly accessible
 */
function normalizeVideoUrl(videoUrl) {
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    return videoUrl; // Already absolute
  }
  
  // Get base URL from environment or use default
  const baseUrl = process.env.PRODUCTION_URL || 
                  process.env.BASE_URL || 
                  process.env.VITE_BASE_URL ||
                  'https://your-domain.com';
  
  const cleanPath = videoUrl.startsWith('/') ? videoUrl.slice(1) : videoUrl;
  
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Create a new MUX asset from a video URL
 */
async function createMuxAsset(videoUrl) {
  const fullVideoUrl = normalizeVideoUrl(videoUrl);
  
  console.log(`  📹 Creating MUX asset from URL: ${fullVideoUrl}`);
  
  const asset = await mux.video.assets.create({
    inputs: [{ url: fullVideoUrl }],
    playback_policy: ['public'],
    encoding_tier: 'baseline',
    mp4_support: 'none',
    normalize_audio: true,
  });

  const playbackId = asset.playback_ids?.[0]?.id;
  
  return {
    assetId: asset.id,
    playbackId,
    status: asset.status,
  };
}

/**
 * Check the processing status of a MUX asset
 */
async function getMuxAssetStatus(assetId) {
  const asset = await mux.video.assets.retrieve(assetId);
  
  const playbackId = asset.playback_ids?.[0]?.id;

  return {
    assetId: asset.id,
    status: asset.status,
    playbackId,
    errors: asset.errors?.messages || [],
  };
}

/**
 * Wait for MUX asset to be ready
 */
async function waitForMuxAssetReady(assetId, maxWaitTime = 300000) {
  const startTime = Date.now();
  const pollInterval = 10000; // Check every 10 seconds
  
  while (Date.now() - startTime < maxWaitTime) {
    const status = await getMuxAssetStatus(assetId);
    
    if (status.status === 'ready') {
      return { success: true, playbackId: status.playbackId };
    }
    
    if (status.status === 'errored') {
      return { success: false, errors: status.errors };
    }
    
    // Still processing
    console.log(`  ⏳ Status: ${status.status}... waiting...`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  return { success: false, error: 'Timeout waiting for asset to be ready' };
}

/**
 * Process a single video
 */
async function processVideo(track) {
  const { id, video_url } = track;
  
  try {
    console.log(`\n🎬 Processing track ${id}...`);
    console.log(`  Video URL: ${video_url}`);
    
    // Step 1: Create MUX asset
    const assetResult = await createMuxAsset(video_url);
    
    console.log(`  ✅ MUX asset created: ${assetResult.assetId}`);
    console.log(`  Playback ID: ${assetResult.playbackId}`);
    
    // Update database with initial asset info
    await pool.query(
      `UPDATE music_generations 
       SET mux_asset_id = $1, 
           mux_playback_id = $2, 
           mux_asset_status = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [assetResult.assetId, assetResult.playbackId, assetResult.status, id]
    );
    
    // Step 2: Wait for asset to be ready
    console.log(`  ⏳ Waiting for MUX asset to be ready...`);
    const waitResult = await waitForMuxAssetReady(assetResult.assetId);
    
    if (waitResult.success) {
      // Update database with ready status
      await pool.query(
        `UPDATE music_generations 
         SET mux_asset_status = $1,
             updated_at = NOW()
         WHERE id = $2`,
        ['ready', id]
      );
      
      console.log(`  ✅ MUX asset ready! Playback ID: ${waitResult.playbackId}`);
      return { success: true, trackId: id };
    } else {
      // Update database with error status
      await pool.query(
        `UPDATE music_generations 
         SET mux_asset_status = $1,
             updated_at = NOW()
         WHERE id = $2`,
        ['errored', id]
      );
      
      console.error(`  ❌ MUX asset failed:`, waitResult.errors || waitResult.error);
      return { success: false, trackId: id, error: waitResult.errors || waitResult.error };
    }
    
  } catch (error) {
    console.error(`  ❌ Error processing track ${id}:`, error.message);
    
    // Update database with error status
    await pool.query(
      `UPDATE music_generations 
       SET mux_asset_status = $1,
           updated_at = NOW()
       WHERE id = $2`,
      ['errored', id]
    );
    
    return { success: false, trackId: id, error: error.message };
  }
}

/**
 * Main function to process all existing videos
 */
async function processAllVideos() {
  try {
    console.log('🚀 Starting MUX processing for existing videos...\n');
    
    // Get all videos that have videoUrl but no muxPlaybackId (or null)
    const result = await pool.query(`
      SELECT id, video_url, title, tags
      FROM music_generations
      WHERE video_url IS NOT NULL 
        AND video_url != ''
        AND (mux_playback_id IS NULL OR mux_playback_id = '')
      ORDER BY created_at DESC
    `);
    
    const videos = result.rows;
    
    if (videos.length === 0) {
      console.log('✅ No videos found that need MUX processing.');
      return;
    }
    
    console.log(`📊 Found ${videos.length} video(s) to process:\n`);
    
    videos.forEach((video, index) => {
      console.log(`  ${index + 1}. Track ${video.id} - ${video.title || video.tags || 'Untitled'}`);
    });
    
    console.log(`\n⚠️  This will process videos one by one. It may take a while.\n`);
    
    // Process videos one by one
    const results = {
      success: [],
      failed: [],
    };
    
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      console.log(`\n[${i + 1}/${videos.length}] Processing video...`);
      
      const result = await processVideo(video);
      
      if (result.success) {
        results.success.push(result.trackId);
      } else {
        results.failed.push({ trackId: result.trackId, error: result.error });
      }
      
      // Add a small delay between videos to avoid rate limiting
      if (i < videos.length - 1) {
        console.log(`  ⏸️  Waiting 2 seconds before next video...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Summary
    console.log(`\n\n📊 Processing Summary:`);
    console.log(`  ✅ Successfully processed: ${results.success.length}`);
    console.log(`  ❌ Failed: ${results.failed.length}`);
    
    if (results.success.length > 0) {
      console.log(`\n✅ Successfully processed tracks:`);
      results.success.forEach(id => console.log(`  - ${id}`));
    }
    
    if (results.failed.length > 0) {
      console.log(`\n❌ Failed tracks:`);
      results.failed.forEach(({ trackId, error }) => {
        console.log(`  - ${trackId}: ${error}`);
      });
    }
    
    console.log(`\n✅ Processing complete!`);
    
  } catch (error) {
    console.error('❌ Error processing videos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
processAllVideos()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

