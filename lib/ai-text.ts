import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Generative AI
const genAI = process.env.GOOGLE_AI_API_KEY
    ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
    : null;

/**
 * Paraphrase text using Google Generative AI
 * Makes text more engaging and SEO-friendly
 */
export async function paraphraseText(
    text: string,
    type: 'title' | 'description'
): Promise<string> {
    if (!genAI) {
        console.warn('[AI Paraphrase] Google AI API key not configured, returning original text');
        return text;
    }

    if (!text || text.trim().length === 0) {
        return text;
    }

    try {
        console.log(`[AI Paraphrase] Paraphrasing ${type}:`, text.substring(0, 50) + '...');

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = type === 'title'
            ? `Paraphrase this video series title to make it more engaging, click-worthy, and SEO-friendly. Keep it concise and punchy.

Original title: "${text}"

Requirements:
- Make it catchy and engaging
- Keep it under 80 characters
- Use power words and emotional language
- Maintain the original meaning
- Make it SEO-friendly for video platforms
- Return ONLY the paraphrased title, no other text

Examples:
- "The CEO's Secret Lover" → "The Billionaire CEO's Hidden Love: A Romance That Shook Everything"
- "Reborn as a System" → "I Was Reborn as a System! My Journey to Become the Ultimate Helper"
- "The General's Daughter" → "The General's Daughter: Revenge, Love, and a Secret Identity"

Paraphrased title:`
            : `Paraphrase this video series description to make it more engaging, intriguing, and compelling for viewers.

Original description: "${text}"

Requirements:
- Make it exciting and hook the reader
- Highlight the key conflicts and themes
- Create curiosity and emotional connection
- Keep it under 300 characters
- Use persuasive language
- Maintain the original meaning
- Return ONLY the paraphrased description, no other text

Example:
- "A story about love and revenge" → "She thought she had lost everything, until fate gave her a second chance. Now, she's back for revenge, but will love stand in her way? A gripping tale of passion, betrayal, and redemption that will keep you on the edge of your seat."

Paraphrased description:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const paraphrased = response.text().trim();

        console.log(`[AI Paraphrase] Original ${type}:`, text);
        console.log(`[AI Paraphrase] Paraphrased ${type}:`, paraphrased);

        return paraphrased || text; // Fall back to original if empty
    } catch (error) {
        console.error(`[AI Paraphrase] Error paraphrasing ${type}:`, error);
        // Return original text on error to allow operation to continue
        return text;
    }
}

/**
 * Paraphrase both title and intro for a series
 */
export async function paraphraseSeriesInfo(
    title: string,
    intro: string
): Promise<{ title: string; intro: string }> {
    console.log('[AI Paraphrase] Starting series info paraphrasing...');

    // Run both paraphrasing operations in parallel for better performance
    const [paraphrasedTitle, paraphrasedIntro] = await Promise.all([
        paraphraseText(title, 'title'),
        paraphraseText(intro, 'description'),
    ]);

    console.log('[AI Paraphrase] Series info paraphrasing completed');

    return {
        title: paraphrasedTitle,
        intro: paraphrasedIntro,
    };
}
