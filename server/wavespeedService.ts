import fetch from 'node-fetch';

interface WavespeedImageRequest {
  enable_base64_output: boolean;
  enable_sync_mode: boolean;
  output_format: string;
  prompt: string;
  seed: number;
  size: string;
}

interface WavespeedImageResponse {
  code: number;
  message: string;
  data: {
    id: string;
  };
}

interface WavespeedResultResponse {
  code: number;
  message: string;
  data: {
    id: string;
    model: string;
    input: WavespeedImageRequest;
    outputs: string[];
    urls: {
      get: string;
    };
    has_nsfw_contents: boolean | null;
    status: string;
    created_at: string;
    error: string;
    timings: {
      inference: number;
    };
  };
}

// New interfaces for video generation
interface SeedanceVideoRequest {
  camera_fixed: boolean;
  duration: number;
  image: string;
  prompt: string;
  seed: number;
}

interface InfiniteTalkVideoRequest {
  audio: string;
  image: string;
  prompt: string;
  resolution: string;
  seed: number;
}

interface WavespeedVideoResponse {
  id: string;
  urls: {
    get: string;
  };
  error: string;
  model: string;
  status: string;
  outputs: string[];
  timings: {
    inference: number;
  };
  created_at: string;
  has_nsfw_contents: boolean | null;
}

export class WavespeedService {
  private apiKey: string;
  private baseUrl = 'https://api.wavespeed.ai/api/v3';

  constructor() {
    this.apiKey = process.env.WAVESPEED_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('WAVESPEED_API_KEY environment variable is required');
    }
  }

  /**
   * Helper method to retry a function once if it fails
   * @param fn The function to retry
   * @param context Context for logging
   * @returns Promise with the result
   */
  private async retryOnce<T>(fn: () => Promise<T>, context: string): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      console.log(`First attempt failed for ${context}, retrying once...`, error);
      try {
        return await fn();
      } catch (retryError) {
        console.error(`Retry also failed for ${context}:`, retryError);
        throw retryError;
      }
    }
  }

  /**
   * Generate an image using Wavespeed AI
   * @param prompt The user's description
   * @returns Promise with the request ID
   */
  async generateImage(prompt: string): Promise<string> {
    const enhancedPrompt = `front shot of a ${prompt} in a plain black background`;
    
    const requestBody: WavespeedImageRequest = {
      enable_base64_output: false,
      enable_sync_mode: false,
      output_format: 'png',
      prompt: enhancedPrompt,
      seed: -1,
      size: '720*720'
    };

    return this.retryOnce(async () => {
      const response = await fetch(`${this.baseUrl}/wavespeed-ai/wan-2.2/text-to-image-realism`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Wavespeed API error: ${response.status} ${response.statusText}`);
      }

      const result: WavespeedImageResponse = await response.json() as WavespeedImageResponse;
      
      if (result.code !== 200) {
        throw new Error(`Wavespeed API error: ${result.message}`);
      }

      return result.data.id;
    }, 'generateImage');
  }

  /**
   * Check the status of an image generation request
   * @param requestId The request ID from generateImage
   * @returns Promise with the result data
   */
  async checkImageStatus(requestId: string): Promise<WavespeedResultResponse['data']> {
    return this.retryOnce(async () => {
      const response = await fetch(`${this.baseUrl}/predictions/${requestId}/result`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Wavespeed API error: ${response.status} ${response.statusText}`);
      }

      const result: WavespeedResultResponse = await response.json() as WavespeedResultResponse;
      
      if (result.code !== 200) {
        throw new Error(`Wavespeed API error: ${result.message}`);
      }

      return result.data;
    }, 'checkImageStatus');
  }

  /**
   * Poll for image generation completion
   * @param requestId The request ID from generateImage
   * @param maxAttempts Maximum number of polling attempts (default: 30)
   * @param intervalMs Polling interval in milliseconds (default: 2000)
   * @returns Promise with the completed result data
   */
  async waitForImageCompletion(
    requestId: string, 
    maxAttempts: number = 30, 
    intervalMs: number = 2000
  ): Promise<WavespeedResultResponse['data']> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const result = await this.checkImageStatus(requestId);
        
        if (result.status === 'completed') {
          return result;
        } else if (result.status === 'failed') {
          throw new Error(`Image generation failed: ${result.error}`);
        }
        
        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      }
    }
    
    throw new Error('Image generation timed out');
  }

  // Band picture edit (multi-image)
  async generateBandPicture(prompt: string, imageUrls: string[]): Promise<string> {
    const enhanced = `An album cover where the characters are in a music band. ${prompt} only add characters that are in the images`;
    const body = {
      enable_base64_output: false,
      enable_sync_mode: false,
      images: imageUrls,
      output_format: 'jpeg',
      prompt: enhanced,
    } as any;

    return this.retryOnce(async () => {
      const response = await fetch(`${this.baseUrl}/google/nano-banana/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Wavespeed error ${response.status}`);
      const json = await response.json() as any;
      if (json.code !== 200) throw new Error(json.message || 'Generation failed');
      return json.data.id as string;
    }, 'generateBandPicture');
  }

  /**
   * Generate a video using Seedance (image-to-video) for scenes 1,3,5
   * @param imageUrl The scene image URL
   * @param prompt The scene prompt
   * @returns Promise with the request ID
   */
  async generateSeedanceVideo(imageUrl: string, prompt: string): Promise<string> {
    const requestBody: SeedanceVideoRequest = {
      camera_fixed: false,
      duration: 5,
      image: imageUrl,
      prompt: prompt,
      seed: -1
    };

    console.log(`\n=== WAVESPEED SEEDANCE VIDEO GENERATION ===`);
    console.log(`Image URL: ${imageUrl}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`Request Body:`, JSON.stringify(requestBody, null, 2));
    console.log(`==========================================\n`);

    return this.retryOnce(async () => {
      const response = await fetch(`${this.baseUrl}/bytedance/seedance-v1-pro-i2v-480p`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Wavespeed Seedance API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`📋 Full Wavespeed Seedance Response:`, JSON.stringify(result, null, 2));
      
      if (result.error) {
        throw new Error(`Wavespeed Seedance API error: ${result.error}`);
      }

      if (!result.id) {
        console.error(`❌ No ID in response:`, result);
        throw new Error(`Wavespeed Seedance API response missing ID field`);
      }

      console.log(`✅ Seedance video generation started successfully`);
      console.log(`Request ID: ${result.id}`);
      
      return result.id;
    }, 'generateSeedanceVideo');
  }

  /**
   * Generate a video using InfiniteTalk (lipsync with audio) for scenes 2,4,6
   * @param imageUrl The scene image URL
   * @param audioUrl The audio part URL
   * @returns Promise with the request ID
   */
  async generateInfiniteTalkVideo(imageUrl: string, audioUrl: string): Promise<string> {
    const requestBody: InfiniteTalkVideoRequest = {
      audio: audioUrl,
      image: imageUrl,
      prompt: "",
      resolution: "480p",
      seed: -1
    };

    console.log(`\n=== WAVESPEED INFINITETALK VIDEO GENERATION ===`);
    console.log(`Image URL: ${imageUrl}`);
    console.log(`Audio URL: ${audioUrl}`);
    console.log(`Request Body:`, JSON.stringify(requestBody, null, 2));
    console.log(`==============================================\n`);

    return this.retryOnce(async () => {
      const response = await fetch(`${this.baseUrl}/wavespeed-ai/infinitetalk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Wavespeed InfiniteTalk API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`📋 Full Wavespeed InfiniteTalk Response:`, JSON.stringify(result, null, 2));
      
      if (result.error) {
        throw new Error(`Wavespeed InfiniteTalk API error: ${result.error}`);
      }

      if (!result.id) {
        console.error(`❌ No ID in response:`, result);
        throw new Error(`Wavespeed InfiniteTalk API response missing ID field`);
      }

      console.log(`✅ InfiniteTalk video generation started successfully`);
      console.log(`Request ID: ${result.id}`);
      
      return result.id;
    }, 'generateInfiniteTalkVideo');
  }

  /**
   * Check the status of a video generation request
   * @param requestId The request ID from video generation
   * @returns Promise with the result data
   */
  async checkVideoStatus(requestId: string): Promise<WavespeedVideoResponse> {
    console.log(`\n=== WAVESPEED VIDEO STATUS CHECK ===`);
    console.log(`Request ID: ${requestId}`);
    console.log(`====================================\n`);

    return this.retryOnce(async () => {
      const response = await fetch(`${this.baseUrl}/predictions/${requestId}/result`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Wavespeed video status API error: ${response.status} ${response.statusText}`);
      }

      const result: WavespeedVideoResponse = await response.json() as WavespeedVideoResponse;
      
      console.log(`📊 Video Status Response:`, JSON.stringify(result, null, 2));
      
      return result;
    }, 'checkVideoStatus');
  }

  /**
   * Poll for video generation completion
   * @param requestId The request ID from video generation
   * @param maxAttempts Maximum number of polling attempts (default: 60 for videos)
   * @param intervalMs Polling interval in milliseconds (default: 5000 for videos)
   * @returns Promise with the completed result data
   */
  async waitForVideoCompletion(
    requestId: string, 
    maxAttempts: number = 60, 
    intervalMs: number = 5000
  ): Promise<WavespeedVideoResponse> {
    let attempts = 0;
    
    console.log(`\n=== WAVESPEED VIDEO POLLING ===`);
    console.log(`Request ID: ${requestId}`);
    console.log(`Max Attempts: ${maxAttempts}`);
    console.log(`Interval: ${intervalMs}ms`);
    console.log(`===============================\n`);
    
    while (attempts < maxAttempts) {
      try {
        const result = await this.checkVideoStatus(requestId);
        
        if (result.status === 'completed') {
          console.log(`✅ Video generation completed successfully`);
          console.log(`Outputs:`, result.outputs);
          return result;
        } else if (result.status === 'failed') {
          throw new Error(`Video generation failed: ${result.error}`);
        }
        
        console.log(`⏳ Video still processing... (attempt ${attempts + 1}/${maxAttempts})`);
        
        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        console.log(`⚠️ Error checking video status, retrying... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      }
    }
    
    throw new Error('Video generation timed out');
  }
}

export const wavespeedService = new WavespeedService();
