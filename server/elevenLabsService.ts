import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || "sk_d5323a3d63a97aadc7fa918bab31b4cf830fe8ef6a648d88"
});

export interface MusicGenerationParams {
  tags: string;
  lyrics?: string;
  durationMs: number;
}

export async function generateMusic(params: MusicGenerationParams): Promise<ReadableStream<Uint8Array>> {
  const { tags, lyrics, durationMs } = params;
  
  // Validate duration
  if (durationMs < 10000 || durationMs > 300000) {
    throw new Error('Duration must be between 10000ms (10s) and 300000ms (5min)');
  }
  
  // Build prompt
  let prompt = `Create a song with this style: ${tags}`;
  if (lyrics && lyrics.trim()) {
    prompt += ` and these lyrics: ${lyrics}`;
  }
  
  try {
    const track = await elevenlabs.music.compose({
      prompt,
      musicLengthMs: durationMs,
    });
    
    return track;
  } catch (error) {
    console.error('ElevenLabs music generation error:', error);
    throw new Error('Failed to generate music with ElevenLabs');
  }
}