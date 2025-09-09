import fetch from 'node-fetch';
import { getStorageService } from './routes';

if (!process.env.FFMPEG_API_KEY) {
  throw new Error('Missing required FFMPEG API key: FFMPEG_API_KEY');
}

const FFMPEG_API_BASE = 'https://ffmpegapi.net/api';
const FFMPEG_API_KEY = process.env.FFMPEG_API_KEY;

export interface FFMPEGSplitAudioParams {
  audio_url: string;
  parts: number;
}

export interface FFMPEGSplitAudioResponse {
  success: boolean;
  message: string;
  parts: number;
  audio_parts: Array<{
    part: string;
    download_url: string;
  }>;
}

export interface FFMPEGMergeVideosParams {
  video_urls: string[];
  audio_url: string;
  subtitle_url?: string;
  watermark_url?: string;
  dimensions?: string;
  async?: boolean;
}

export interface FFMPEGMergeVideosResponse {
  success: boolean;
  message: string;
  download_url: string;
  filename: string;
}

export interface FFMPEGTrimAudioParams {
  audio_url: string;
  desired_length: number;
  fade_duration: number;
}

export interface FFMPEGTrimAudioResponse {
  success: boolean;
  filename: string;
  download_url: string;
  trimmed_length: number;
  fade_duration: number;
  original_length: number;
  message: string;
}

export async function trimAudio(params: FFMPEGTrimAudioParams): Promise<FFMPEGTrimAudioResponse> {
  const { audio_url, desired_length, fade_duration } = params;

  try {
    // First, download the audio file and upload it to our storage to make it publicly accessible
    console.log(`\n=== DOWNLOADING AND UPLOADING AUDIO FOR TRIMMING ===`);
    console.log(`Original audio URL: ${audio_url}`);
    
    const audioResponse = await fetch(audio_url);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
    }
    
    const audioBuffer = await audioResponse.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);
    
    // Generate a unique filename for the audio
    const audioFileName = `temp-audio/${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    
    // Upload to our storage service
    const storageService = getStorageService();
    let publicAudioUrl: string;
    
    if (storageService.constructor.name === 'GCSStorageService') {
      publicAudioUrl = await (storageService as any).uploadAudioBuffer(new Uint8Array(buffer), audioFileName);
    } else if (storageService.constructor.name === 'LocalStorageService') {
      publicAudioUrl = await (storageService as any).uploadAudioBuffer(new Uint8Array(buffer), audioFileName);
    } else if (storageService.constructor.name === 'RenderStorageService') {
      publicAudioUrl = await (storageService as any).uploadBuffer(buffer, audioFileName, 'audio/mpeg');
    } else {
      throw new Error(`Unsupported storage service: ${storageService.constructor.name}`);
    }
    
    console.log(`✅ Audio uploaded to public URL: ${publicAudioUrl}`);

    const requestBody = {
      audio_url: publicAudioUrl,
      desired_length,
      fade_duration
    };

    console.log(`\n=== FFMPEG AUDIO TRIMMING REQUEST ===`);
    console.log(`API Base: ${FFMPEG_API_BASE}`);
    console.log(`API Key: ${FFMPEG_API_KEY ? `${FFMPEG_API_KEY.substring(0, 8)}...` : 'MISSING'}`);
    console.log(`Request Body:`, JSON.stringify(requestBody, null, 2));
    console.log(`=====================================\n`);

    const response = await fetch(`${FFMPEG_API_BASE}/trim_audio`, {
      method: 'POST',
      headers: {
        'X-API-Key': FFMPEG_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FFMPEG API error:', response.status, errorText);
      throw new Error(`FFMPEG API error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as FFMPEGTrimAudioResponse;
    
    console.log(`📋 FFMPEG Audio Trimming Response:`, JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('❌ FFMPEG audio trimming failed:', result.message);
      throw new Error(`FFMPEG audio trimming failed: ${result.message}`);
    }
    
    console.log(`✅ FFMPEG audio trimming completed successfully`);
    console.log(`Download URL: ${result.download_url}`);
    console.log(`Trimmed length: ${result.trimmed_length} seconds`);
    
    return result;
  } catch (error) {
    console.error('FFMPEG audio trimming error:', error);
    throw new Error('Failed to trim audio with FFMPEG');
  }
}

export async function splitAudio(params: FFMPEGSplitAudioParams): Promise<FFMPEGSplitAudioResponse> {
  const { audio_url, parts } = params;

  try {
    // First, download the audio file and upload it to our storage to make it publicly accessible
    console.log(`\n=== DOWNLOADING AND UPLOADING AUDIO FOR FFMPEG ===`);
    console.log(`Original audio URL: ${audio_url}`);
    
    const audioResponse = await fetch(audio_url);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
    }
    
    const audioBuffer = await audioResponse.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);
    
    // Generate a unique filename for the audio
    const audioFileName = `temp-audio/${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    
    // Upload to our storage service
    const storageService = getStorageService();
    let publicAudioUrl: string;
    
    if (storageService.constructor.name === 'GCSStorageService') {
      publicAudioUrl = await (storageService as any).uploadAudioBuffer(new Uint8Array(buffer), audioFileName);
    } else if (storageService.constructor.name === 'LocalStorageService') {
      publicAudioUrl = await (storageService as any).uploadAudioBuffer(new Uint8Array(buffer), audioFileName);
    } else if (storageService.constructor.name === 'RenderStorageService') {
      publicAudioUrl = await (storageService as any).uploadBuffer(buffer, audioFileName, 'audio/mpeg');
    } else {
      throw new Error(`Unsupported storage service: ${storageService.constructor.name}`);
    }
    
    console.log(`✅ Audio uploaded to public URL: ${publicAudioUrl}`);

    const requestBody = {
      audio_url: publicAudioUrl, // Use the publicly accessible URL
      parts
    };

    console.log(`\n=== FFMPEG AUDIO SPLITTING REQUEST ===`);
    console.log(`API Base: ${FFMPEG_API_BASE}`);
    console.log(`API Key: ${FFMPEG_API_KEY ? `${FFMPEG_API_KEY.substring(0, 8)}...` : 'MISSING'}`);
    console.log(`Request Body:`, JSON.stringify(requestBody, null, 2));
    console.log(`=====================================\n`);

    const response = await fetch(`${FFMPEG_API_BASE}/split_audio`, {
      method: 'POST',
      headers: {
        'X-API-Key': FFMPEG_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FFMPEG API error:', response.status, errorText);
      throw new Error(`FFMPEG API error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as FFMPEGSplitAudioResponse;
    
    console.log(`📋 FFMPEG Audio Splitting Response:`, JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('❌ FFMPEG audio splitting failed:', result.message);
      throw new Error(`FFMPEG audio splitting failed: ${result.message}`);
    }
    
    console.log(`✅ FFMPEG audio splitting completed successfully`);
    console.log(`Parts generated: ${result.parts}`);
    console.log(`Audio parts:`, result.audio_parts);
    
    return result;
  } catch (error) {
    console.error('FFMPEG audio splitting error:', error);
    throw new Error('Failed to split audio with FFMPEG');
  }
}

export async function downloadAndSaveAudioParts(
  audioParts: Array<{ part: string; download_url: string }>,
  trackId: string
): Promise<string[]> {
  const storageService = getStorageService();
  const savedUrls: string[] = [];

  console.log(`\n=== DOWNLOADING AND SAVING AUDIO PARTS ===`);
  console.log(`Track ID: ${trackId}`);
  console.log(`Parts to download: ${audioParts.length}`);
  console.log(`==========================================\n`);

  for (let i = 0; i < audioParts.length; i++) {
    const audioPart = audioParts[i];
    
    try {
      console.log(`📥 Downloading part ${i + 1}/${audioParts.length}: ${audioPart.part}`);
      
      // Download the audio part
      const response = await fetch(audioPart.download_url);
      if (!response.ok) {
        throw new Error(`Failed to download audio part: ${response.status} ${response.statusText}`);
      }
      
      const audioBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(audioBuffer);
      
      // Generate filename for storage
      const fileName = `video-audio-parts/${trackId}/part_${String(i + 1).padStart(2, '0')}.mp3`;
      
      console.log(`💾 Saving to storage: ${fileName}`);
      
      // Save to storage
      let savedUrl: string;
      if (storageService.constructor.name === 'GCSStorageService') {
        savedUrl = await (storageService as any).uploadAudioBuffer(new Uint8Array(buffer), fileName);
      } else if (storageService.constructor.name === 'LocalStorageService') {
        savedUrl = await (storageService as any).uploadAudioBuffer(new Uint8Array(buffer), fileName);
      } else if (storageService.constructor.name === 'RenderStorageService') {
        savedUrl = await (storageService as any).uploadBuffer(buffer, fileName, 'audio/mpeg');
      } else {
        throw new Error(`Unsupported storage service: ${storageService.constructor.name}`);
      }
      
      savedUrls.push(savedUrl);
      console.log(`✅ Part ${i + 1} saved successfully: ${savedUrl}`);
      
    } catch (error) {
      console.error(`❌ Error downloading/saving part ${i + 1}:`, error);
      throw new Error(`Failed to download and save audio part ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`\n✅ All audio parts downloaded and saved successfully`);
  console.log(`Saved URLs:`, savedUrls);
  console.log(`==========================================\n`);

  return savedUrls;
}

export async function mergeVideos(params: FFMPEGMergeVideosParams): Promise<FFMPEGMergeVideosResponse> {
  const { video_urls, audio_url, subtitle_url = "", watermark_url = "", dimensions = "768x1024", async = false } = params;

  try {
    // Download and upload the audio file to make it publicly accessible
    console.log(`\n=== DOWNLOADING AND UPLOADING AUDIO FOR VIDEO MERGING ===`);
    console.log(`Original audio URL: ${audio_url}`);
    
    const audioResponse = await fetch(audio_url);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
    }
    
    const audioBuffer = await audioResponse.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);
    
    // Generate a unique filename for the audio
    const audioFileName = `temp-audio/${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    
    // Upload to our storage service
    const storageService = getStorageService();
    let publicAudioUrl: string;
    
    if (storageService.constructor.name === 'GCSStorageService') {
      publicAudioUrl = await (storageService as any).uploadAudioBuffer(new Uint8Array(buffer), audioFileName);
    } else if (storageService.constructor.name === 'LocalStorageService') {
      publicAudioUrl = await (storageService as any).uploadAudioBuffer(new Uint8Array(buffer), audioFileName);
    } else if (storageService.constructor.name === 'RenderStorageService') {
      publicAudioUrl = await (storageService as any).uploadBuffer(buffer, audioFileName, 'audio/mpeg');
    } else {
      throw new Error(`Unsupported storage service: ${storageService.constructor.name}`);
    }
    
    console.log(`✅ Audio uploaded to public URL: ${publicAudioUrl}`);

    const requestBody = {
      video_urls,
      audio_url: publicAudioUrl, // Use the publicly accessible URL
      subtitle_url,
      watermark_url,
      dimensions,
      async
    };

    console.log(`\n=== FFMPEG VIDEO MERGING REQUEST ===`);
    console.log(`API Base: ${FFMPEG_API_BASE}`);
    console.log(`API Key: ${FFMPEG_API_KEY ? `${FFMPEG_API_KEY.substring(0, 8)}...` : 'MISSING'}`);
    console.log(`Video URLs:`, video_urls);
    console.log(`Audio URL: ${publicAudioUrl}`);
    console.log(`Dimensions: ${dimensions}`);
    console.log(`Request Body:`, JSON.stringify(requestBody, null, 2));
    console.log(`====================================\n`);

    const response = await fetch(`${FFMPEG_API_BASE}/merge_videos`, {
      method: 'POST',
      headers: {
        'X-API-Key': FFMPEG_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FFMPEG API error:', response.status, errorText);
      throw new Error(`FFMPEG API error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as FFMPEGMergeVideosResponse;
    
    console.log(`📋 FFMPEG Video Merging Response:`, JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('❌ FFMPEG video merging failed:', result.message);
      throw new Error(`FFMPEG video merging failed: ${result.message}`);
    }
    
    console.log(`✅ FFMPEG video merging completed successfully`);
    console.log(`Download URL: ${result.download_url}`);
    console.log(`Filename: ${result.filename}`);
    
    return result;
  } catch (error) {
    console.error('FFMPEG video merging error:', error);
    throw new Error('Failed to merge videos with FFMPEG');
  }
}

export async function downloadAndSaveFinalVideo(
  downloadUrl: string,
  trackId: string
): Promise<string> {
  const storageService = getStorageService();

  console.log(`\n=== DOWNLOADING AND SAVING FINAL VIDEO ===`);
  console.log(`Track ID: ${trackId}`);
  console.log(`Download URL: ${downloadUrl}`);
  console.log(`==========================================\n`);

  try {
    console.log(`📥 Downloading final merged video...`);
    
    // Download the final video
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download final video: ${response.status} ${response.statusText}`);
    }
    
    const videoBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(videoBuffer);
    
    // Generate filename for storage
    const fileName = `video-final/${trackId}/final_music_video.mp4`;
    
    console.log(`💾 Saving to storage: ${fileName}`);
    
    // Save to storage
    let savedUrl: string;
    if (storageService.constructor.name === 'GCSStorageService') {
      // For videos, we'll use uploadImageBuffer as it's the closest method available
      savedUrl = await (storageService as any).uploadImageBuffer(new Uint8Array(buffer), fileName);
    } else if (storageService.constructor.name === 'LocalStorageService') {
      // For videos, we'll use uploadImageBuffer as it's the closest method available
      savedUrl = await (storageService as any).uploadImageBuffer(new Uint8Array(buffer), fileName);
    } else if (storageService.constructor.name === 'RenderStorageService') {
      savedUrl = await (storageService as any).uploadBuffer(buffer, fileName, 'video/mp4');
    } else {
      throw new Error(`Unsupported storage service: ${storageService.constructor.name}`);
    }
    
    console.log(`✅ Final video saved successfully: ${savedUrl}`);
    console.log(`==========================================\n`);

    return savedUrl;
  } catch (error) {
    console.error(`❌ Error downloading/saving final video:`, error);
    throw new Error(`Failed to download and save final video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
