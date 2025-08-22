import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing required OpenAI API key: OPENAI_API_KEY');
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateLyrics(prompt: string, duration: number = 60): Promise<string> {
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
          content: `You are a professional songwriter and lyricist. Create engaging, creative lyrics based on the user's prompt. 
          
          The song will be ${duration} seconds long, so ${structureGuidance}
          
          Guidelines:
          - Structure the lyrics with clear sections like [Verse 1], [Chorus], [Verse 2], [Bridge], etc.
          - Make lyrics that flow well and are suitable for music
          - Keep it appropriate and creative
          - Match the mood and theme from the user's prompt
          - Each verse should be 4-8 lines, chorus 4-6 lines
          - Use rhyme schemes that work well for music
          - Adjust the number of sections based on the song duration
          
          Return only the lyrics with section markers, no additional text or explanations.`
        },
        {
          role: "user",
          content: `Write lyrics for a song about: ${prompt}`
        }
      ],
      max_tokens: 800,
      temperature: 0.8,
    });

    const lyrics = response.choices[0]?.message?.content?.trim();
    
    if (!lyrics) {
      throw new Error('No lyrics generated');
    }

    return lyrics;
  } catch (error) {
    console.error('Error generating lyrics:', error);
    throw new Error('Failed to generate lyrics. Please try again.');
  }
}