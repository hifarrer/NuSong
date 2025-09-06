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

    try {
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
    } catch (error) {
      console.error('Error generating image with Wavespeed:', error);
      throw new Error('Failed to generate image');
    }
  }

  /**
   * Check the status of an image generation request
   * @param requestId The request ID from generateImage
   * @returns Promise with the result data
   */
  async checkImageStatus(requestId: string): Promise<WavespeedResultResponse['data']> {
    try {
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
    } catch (error) {
      console.error('Error checking image status with Wavespeed:', error);
      throw new Error('Failed to check image status');
    }
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
}

export const wavespeedService = new WavespeedService();
