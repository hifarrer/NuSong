import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing required OpenAI API key: OPENAI_API_KEY');
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateLyrics(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional songwriter and lyricist. Create engaging, creative lyrics based on the user's prompt. 
          
          Guidelines:
          - Structure the lyrics with clear sections like [Verse 1], [Chorus], [Verse 2], [Bridge], etc.
          - Make lyrics that flow well and are suitable for music
          - Keep it appropriate and creative
          - Match the mood and theme from the user's prompt
          - Aim for 2-3 verses, a chorus, and optionally a bridge
          - Each verse should be 4-8 lines, chorus 4-6 lines
          - Use rhyme schemes that work well for music
          
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