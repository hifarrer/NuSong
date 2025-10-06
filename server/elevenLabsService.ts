import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error('Missing required ElevenLabs API key: ELEVENLABS_API_KEY');
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

export interface ElevenLabsCompositionResponse {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  prompt: string;
  music_length_ms: number;
  audio_url?: string;
  error?: string;
  compositionPlan?: any;
  songMetadata?: any;
}

export async function createCompositionPlan(params: {
  prompt: string;
  music_length_ms: number;
}): Promise<ElevenLabsCompositionResponse> {
  const { prompt, music_length_ms } = params;
  
  try {
    console.log(`\n=== ELEVENLABS COMPOSITION PLAN REQUEST ===`);
    console.log(`API Key: ${ELEVENLABS_API_KEY ? `${ELEVENLABS_API_KEY.substring(0, 8)}...` : 'MISSING'}`);
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`Music Length: ${music_length_ms}ms`);
    console.log(`==========================================\n`);

    const result = await elevenlabs.music.compose({
      prompt,
      musicLengthMs: music_length_ms,
      respectSectionsDurations: true, // Ensure strict adherence to section durations
      forceInstrumental: false, // Allow vocals if specified in prompt
    });
    
    console.log(`📋 ElevenLabs Composition Response:`, JSON.stringify(result, null, 2));
    
    // The compose method returns a ReadableStream of audio
    if (!result) {
      console.error('❌ Unexpected ElevenLabs response structure:', result);
      throw new Error(`Invalid ElevenLabs response: ${JSON.stringify(result)}`);
    }
    
    // Convert ReadableStream to Buffer
    const reader = result.getReader();
    const chunks = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    const audioBuffer = Buffer.concat(chunks);
    
    console.log(`✅ ElevenLabs music generation completed successfully`);
    console.log(`Audio Buffer Size: ${audioBuffer.length} bytes`);
    console.log(`Requested Duration: ${music_length_ms}ms`);
    
    // Return the composition response with audio
    return {
      id: `composition_${Date.now()}`, // Generate a unique ID
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      prompt,
      music_length_ms,
      audio_url: `data:audio/mp3;base64,${audioBuffer.toString('base64')}`, // Convert audio buffer to base64 data URL
      error: undefined
    } as ElevenLabsCompositionResponse;
  } catch (error) {
    console.error('ElevenLabs composition plan error:', error);
    throw new Error('Failed to create composition plan with ElevenLabs');
  }
}

export async function checkCompositionStatus(compositionId: string): Promise<ElevenLabsCompositionResponse> {
  try {
    console.log(`\n=== ELEVENLABS COMPOSITION STATUS CHECK ===`);
    console.log(`🔍 Checking composition: ${compositionId}`);
    console.log(`🔑 API Key: ${ELEVENLABS_API_KEY ? `${ELEVENLABS_API_KEY.substring(0, 8)}...` : 'MISSING'}`);
    console.log(`=========================================`);
    
    // Since we're using the compose method that returns audio immediately,
    // the composition is already completed and stored in the database
    console.log(`✅ Composition already completed (immediate generation)`);
    
    return {
      id: compositionId,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      prompt: 'Generated music',
      music_length_ms: 60000,
      audio_url: undefined, // Audio is stored in the database, not returned here
      error: undefined
    } as ElevenLabsCompositionResponse;
  } catch (error) {
    console.error(`❌ ElevenLabs status check failed:`, error);
    if (error instanceof Error) {
      console.error(`❌ Error message:`, error.message);
      console.error(`❌ Error stack:`, error.stack);
    }
    throw new Error('Failed to check composition status with ElevenLabs');
  }
}

export async function generateMusic(params: {
  prompt: string;
  style: string;
  title?: string;
  duration?: number;
}): Promise<ElevenLabsCompositionResponse> {
  const { prompt, style, title, duration = 60 } = params;
  
  // Convert duration from seconds to milliseconds
  const music_length_ms = duration * 1000;
  
  // Create a comprehensive prompt that includes style information and explicit duration
  const enhancedPrompt = `${prompt}. Style: ${style}. ${title ? `Title: ${title}` : ''}. IMPORTANT: Generate exactly ${duration} seconds of music, no longer.`;
  
  try {
    console.log(`\n=== ELEVENLABS MUSIC GENERATION ===`);
    console.log(`🎵 Generating music with prompt: ${enhancedPrompt.substring(0, 100)}...`);
    console.log(`🎼 Style: ${style}`);
    console.log(`⏱️ Duration: ${duration}s (${music_length_ms}ms)`);
    console.log(`=====================================\n`);

    const result = await elevenlabs.music.compose({
      prompt: enhancedPrompt,
      musicLengthMs: music_length_ms,
      respectSectionsDurations: true, // Ensure strict adherence to section durations
      forceInstrumental: false, // Allow vocals if specified in prompt
    });

    // Convert ReadableStream to Buffer
    const reader = result.getReader();
    const chunks = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    const audioBuffer = Buffer.concat(chunks);

    console.log(`✅ ElevenLabs music generation completed`);
    console.log(`Audio Buffer Size: ${audioBuffer.length} bytes`);
    console.log(`Requested Duration: ${duration}s (${music_length_ms}ms)`);
    
    return {
      id: `composition_${Date.now()}`,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      prompt: enhancedPrompt,
      music_length_ms,
      audio_url: `data:audio/mp3;base64,${audioBuffer.toString('base64')}`,
      error: undefined
    } as ElevenLabsCompositionResponse;
  } catch (error) {
    console.error('ElevenLabs music generation error:', error);
    throw new Error('Failed to generate music with ElevenLabs');
  }
}

export function buildPromptFromTags(tags: string, lyrics?: string): { prompt: string; style: string; title?: string } {
  // For ElevenLabs, we combine the lyrics (prompt) with the style
  const style = tags;
  const prompt = lyrics && lyrics.trim() ? lyrics : `Create a song in ${tags} style`;
  
  // Generate a title based on the style and lyrics
  let title: string | undefined;
  if (lyrics && lyrics.trim()) {
    // Extract first line of lyrics for title
    const firstLine = lyrics.split('\n')[0].replace(/^\[.*?\]\s*/, '').trim();
    title = firstLine || `${tags} Song`;
  } else {
    title = `${tags} Song`;
  }
  
  return { prompt, style, title };
}
