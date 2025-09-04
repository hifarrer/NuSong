import fetch from 'node-fetch';

if (!process.env.KIE_API_KEY) {
  throw new Error('Missing required KIE.ai API key: KIE_API_KEY');
}

const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const KIE_API_KEY = process.env.KIE_API_KEY;

export interface KieMusicGenerationParams {
  prompt: string;
  style: string;
  title?: string;
  instrumental?: boolean;
  model?: string;
  callBackUrl?: string;
  negativeTags?: string;
  vocalGender?: string;
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
}

export interface KieAudioToMusicParams {
  uploadUrl: string;
  prompt: string;
  style: string;
  title: string;
  customMode?: boolean;
  instrumental?: boolean;
  model?: string;
  negativeTags?: string;
  callBackUrl?: string;
  vocalGender?: string;
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
}

export interface KieGenerationResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export interface KieTaskStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    parentMusicId: string;
    param: string;
    response: {
      taskId: string;
      sunoData: Array<{
        id: string;
        audioUrl: string;
        sourceAudioUrl: string;
        streamAudioUrl: string;
        sourceStreamAudioUrl: string;
        imageUrl: string;
        sourceImageUrl: string;
        prompt: string;
        modelName: string;
        title: string;
        tags: string;
        createTime: number;
        duration: number;
      }>;
    };
    status: string;
    type: string;
    operationType: string;
    errorCode: string | null;
    errorMessage: string | null;
    createTime: number;
  };
}

export async function generateMusic(params: KieMusicGenerationParams): Promise<KieGenerationResponse> {
  const { 
    prompt, 
    style, 
    title, 
    instrumental = true, 
    model = "V4", 
    callBackUrl,
    negativeTags = "",
    vocalGender = "",
    styleWeight = 0.65,
    weirdnessConstraint = 0.65,
    audioWeight = 0.65
  } = params;
  
  try {
    const requestBody = {
      prompt,
      style,
      title: title || "Generated Song",
      customMode: true, // Always use custom mode for full control
      instrumental,
      model,
      callBackUrl,
      negativeTags,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight
    };

    console.log(`\n=== KIE.AI MUSIC GENERATION REQUEST ===`);
    console.log(`API Base: ${KIE_API_BASE}`);
    console.log(`API Key: ${KIE_API_KEY ? `${KIE_API_KEY.substring(0, 8)}...` : 'MISSING'}`);
    console.log(`Request Body:`, JSON.stringify(requestBody, null, 2));
    console.log(`=====================================\n`);

    const response = await fetch(`${KIE_API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('KIE.ai API error:', response.status, errorText);
      throw new Error(`KIE.ai API error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as any; // Use any for debugging
    
    console.log(`📋 KIE.ai API Response:`, JSON.stringify(result, null, 2));
    
         // Check if response structure is as expected
     if (!result || !result.data || !result.data.taskId) {
       console.error('❌ Unexpected KIE.ai response structure:', result);
       throw new Error(`Invalid KIE.ai response: ${JSON.stringify(result)}`);
     }
     
     console.log(`✅ KIE.ai generation started successfully`);
     console.log(`Task ID: ${result.data.taskId}`);
     console.log(`Full response:`, JSON.stringify(result, null, 2));
     
     return result as KieGenerationResponse;
  } catch (error) {
    console.error('KIE.ai music generation error:', error);
    throw new Error('Failed to generate music with KIE.ai');
  }
}

export async function checkTaskStatus(taskId: string): Promise<KieTaskStatusResponse> {
  try {
    const requestUrl = `${KIE_API_BASE}/generate/record-info?taskId=${taskId}`;
    
    console.log(`\n=== KIE.AI STATUS CHECK REQUEST ===`);
    console.log(`🔍 Checking task: ${taskId}`);
    console.log(`🔑 API Key: ${KIE_API_KEY ? `${KIE_API_KEY.substring(0, 8)}...` : 'MISSING'}`);
    console.log(`🌐 Full URL: ${requestUrl}`);
    console.log(`📤 Method: GET`);
    console.log(`📋 Headers:`, {
      'Authorization': `Bearer ${KIE_API_KEY ? `${KIE_API_KEY.substring(0, 8)}...` : 'MISSING'}`,
      'Content-Type': 'application/json',
    });
    console.log(`=====================================`);
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ KIE.ai API Error ${response.status}:`, errorText);
      console.error(`❌ Full error response:`, errorText);
      throw new Error(`KIE.ai status check error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as KieTaskStatusResponse;
    
    console.log(`📊 FULL KIE.AI STATUS RESPONSE:`);
    console.log(JSON.stringify(result, null, 2));
    console.log(`=====================================\n`);
    
    return result;
  } catch (error) {
    console.error(`❌ KIE.ai status check failed:`, error);
    if (error instanceof Error) {
      console.error(`❌ Error message:`, error.message);
      console.error(`❌ Error stack:`, error.stack);
    }
    throw new Error('Failed to check task status with KIE.ai');
  }
}

export async function generateAudioToMusic(params: KieAudioToMusicParams): Promise<KieGenerationResponse> {
  const { 
    uploadUrl,
    prompt, 
    style, 
    title, 
    customMode = true,
    instrumental = true, 
    model = "V4", 
    callBackUrl,
    negativeTags = "",
    vocalGender = "",
    styleWeight = 0.65,
    weirdnessConstraint = 0.65,
    audioWeight = 0.65
  } = params;
  
  try {
    const requestBody = {
      uploadUrl,
      prompt,
      style,
      title,
      customMode,
      instrumental,
      model,
      negativeTags,
      callBackUrl,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight
    };

    console.log(`\n=== KIE.AI AUDIO-TO-MUSIC GENERATION REQUEST ===`);
    console.log(`API Base: ${KIE_API_BASE}`);
    console.log(`API Key: ${KIE_API_KEY ? `${KIE_API_KEY.substring(0, 8)}...` : 'MISSING'}`);
    console.log(`Request Body:`, JSON.stringify(requestBody, null, 2));
    console.log(`===============================================\n`);

    const response = await fetch(`${KIE_API_BASE}/generate/upload-cover`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('KIE.ai upload-cover API error:', response.status, errorText);
      throw new Error(`KIE.ai API error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as any; // Use any for debugging
    
    console.log(`📋 KIE.ai upload-cover API Response:`, JSON.stringify(result, null, 2));
    
    // Check if response structure is as expected
    if (!result || !result.data || !result.data.taskId) {
      console.error('❌ Unexpected KIE.ai response structure:', result);
      throw new Error(`Invalid KIE.ai response: ${JSON.stringify(result)}`);
    }
     
    console.log(`✅ KIE.ai audio-to-music generation started successfully`);
    console.log(`Task ID: ${result.data.taskId}`);
    console.log(`Full response:`, JSON.stringify(result, null, 2));
     
    return result as KieGenerationResponse;
  } catch (error) {
    console.error('KIE.ai audio-to-music generation error:', error);
    throw new Error('Failed to generate audio-to-music with KIE.ai');
  }
}

export function buildPromptFromTags(tags: string, lyrics?: string): { prompt: string; style: string; title?: string } {
  // For KIE.ai, we separate the lyrics (prompt) from the style
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
