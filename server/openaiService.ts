import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing required OpenAI API key: OPENAI_API_KEY');
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateLyrics(prompt: string, duration: number = 60): Promise<{ lyrics: string; title: string }> {
  // Determine song structure based on duration
  let structureGuidance = "";
  if (duration <= 30) {
    structureGuidance = "Create a short, concise song with just [Verse 1] and [Chorus]. Keep it simple and impactful for a 30-second track.";
  } else if (duration <= 60) {
    structureGuidance = "Create a standard pop song structure with [Verse 1], [Chorus], [Verse 2], [Chorus]. Perfect for a 1-minute track.";
  } else if (duration <= 120) {
    structureGuidance = "Create a full song structure with [Verse 1], [Chorus], [Verse 2], [Chorus], [Bridge], [Chorus]. Suitable for a 2-minute track.";
  } else {
    structureGuidance = "Create an extended song with [Verse 1], [Chorus], [Verse 2], [Chorus], [Bridge], [Chorus], [Verse 3], [Chorus]. Perfect for a longer track.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional songwriter and lyricist. Create engaging, creative lyrics and a compelling track title based on the user's prompt. 
          
          The song will be ${duration} seconds long, so ${structureGuidance}
          
          Guidelines:
          - Structure the lyrics with clear sections like [Verse 1], [Chorus], [Verse 2], [Bridge], etc.
          - Make lyrics that flow well and are suitable for music
          - Keep it appropriate and creative
          - Match the mood and theme from the user's prompt
          - Each verse should be 4-8 lines, chorus 4-6 lines
          - Use rhyme schemes that work well for music
          - Adjust the number of sections based on the song duration
          - Create a catchy, memorable track title that captures the essence of the song
          
          Return your response as a JSON object with this exact structure:
          {
            "title": "Your Track Title Here",
            "lyrics": "Your lyrics here with section markers like [Verse 1], [Chorus], etc."
          }
          
          Make sure the JSON is valid and properly formatted.`
        },
        {
          role: "user",
          content: `Write lyrics and a track title for a song about: ${prompt}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('No content generated');
    }

    // Parse the JSON response
    try {
      const parsed = JSON.parse(content);
      
      if (!parsed.title || !parsed.lyrics) {
        throw new Error('Invalid response structure');
      }

      return {
        title: parsed.title,
        lyrics: parsed.lyrics
      };
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Raw response:', content);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  } catch (error) {
    console.error('Error generating lyrics:', error);
    throw new Error('Failed to generate lyrics. Please try again.');
  }
}

export async function generateVideoScenes(videoPrompt: string, trackInfo: { title?: string; tags?: string; lyrics?: string }): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional music video director and cinematographer. Create 6 concise scene descriptions for a music video based on the user's vision and track information.

          IMPORTANT SCENE STRUCTURE REQUIREMENTS:
          - Scene 1: Medium/far distance shot showing characters
          - Scene 2: Close-up shot of the main character (lead singer)
          - Scene 3: Medium/far distance shot showing characters
          - Scene 4: Close-up shot of the main character (lead singer)
          - Scene 5: Medium/far distance shot showing characters
          - Scene 6: Close-up shot of the main character (lead singer)

          Guidelines:
          - Each scene should be a concise, single-sentence description suitable for AI image generation
          - Focus on visual elements, lighting, composition, and mood
          - Make scenes cinematic and engaging
          - Ensure variety in settings and visual elements while maintaining coherence
          - Consider the music's mood and style when creating scenes
          - Keep descriptions under 20 words each
          - Be specific about camera angles and shot types
          - Include relevant visual details like lighting, colors, and atmosphere

          Return exactly 6 scene descriptions, one per line, numbered 1-6. No additional text or explanations.`
        },
        {
          role: "user",
          content: `Create 6 scene descriptions for a music video with this vision: "${videoPrompt}"

          Track Information:
          - Title: ${trackInfo.title || 'Untitled'}
          - Genre/Style: ${trackInfo.tags || 'Not specified'}
          - ${trackInfo.lyrics ? `Lyrics: ${trackInfo.lyrics.substring(0, 200)}...` : 'No lyrics provided'}`
        }
      ],
      max_tokens: 600,
      temperature: 0.8,
    });

    const scenesText = response.choices[0]?.message?.content?.trim();
    
    if (!scenesText) {
      throw new Error('No scenes generated');
    }

    // Parse the scenes from the response
    const scenes = scenesText
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim()) // Remove numbering
      .filter(scene => scene.length > 0)
      .slice(0, 6); // Ensure we only get 6 scenes

    if (scenes.length !== 6) {
      throw new Error(`Expected 6 scenes, got ${scenes.length}`);
    }

    return scenes;
  } catch (error) {
    console.error('Error generating video scenes:', error);
    throw new Error('Failed to generate video scenes. Please try again.');
  }
}