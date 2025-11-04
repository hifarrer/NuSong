import Mux from '@mux/mux-node';

// Initialize MUX client
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

/**
 * Normalize video URL to ensure it's publicly accessible
 */
function normalizeVideoUrl(videoUrl: string): string {
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
 * 
 * @param videoUrl - Full URL to your video (must be publicly accessible)
 * @returns Object with assetId, playbackId, and status
 */
export async function createMuxAsset(videoUrl: string) {
  // Ensure the URL is absolute and publicly accessible
  const fullVideoUrl = normalizeVideoUrl(videoUrl);
  
  console.log(`📹 Creating MUX asset from URL: ${fullVideoUrl}`);
  
  // Create MUX asset
  const asset = await mux.video.assets.create({
    inputs: [{ url: fullVideoUrl }],
    playback_policy: ['public'],       // Makes video publicly streamable
    encoding_tier: 'baseline',         // Quality tier
    mp4_support: 'none',               // We only need HLS streaming
    normalize_audio: true,             // Improve audio quality
  });

  const playbackId = asset.playback_ids?.[0]?.id;
  
  console.log(`✅ MUX asset created: ${asset.id}, playback ID: ${playbackId}`);
  
  return {
    assetId: asset.id,                 // Use to track asset status
    playbackId,                        // Use for video playback
    status: asset.status,              // preparing/ready/errored
  };
}

/**
 * Check the processing status of a MUX asset
 */
export async function getMuxAssetStatus(assetId: string) {
  const asset = await mux.video.assets.retrieve(assetId);
  
  const playbackId = asset.playback_ids?.[0]?.id;
  const hlsUrl = playbackId 
    ? `https://stream.mux.com/${playbackId}.m3u8` 
    : undefined;

  return {
    assetId: asset.id,
    status: asset.status,              // Check if 'ready'
    playbackId,
    hlsUrl,                            // HLS streaming URL
    duration: asset.duration,
    errors: asset.errors?.messages || [],
  };
}

/**
 * Get HLS streaming URL from playback ID
 */
export function getHlsUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/**
 * Delete a MUX asset (cleanup)
 */
export async function deleteMuxAsset(assetId: string): Promise<void> {
  await mux.video.assets.delete(assetId);
  console.log(`🗑️  Deleted MUX asset: ${assetId}`);
}

/**
 * Check if MUX is configured
 */
export function isMuxConfigured(): boolean {
  return !!(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}

