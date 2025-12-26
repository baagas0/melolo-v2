# AI-Powered Title and Description Paraphrasing

This feature uses Google Generative AI to automatically paraphrase series titles and descriptions to make them more engaging, click-worthy, and SEO-friendly.

## Overview

When saving a new series, the AI automatically transforms:
- **Series Title**: Makes it more catchy, concise, and engaging
- **Series Intro/Description**: Makes it more compelling, intriguing, and hook-driven

## Setup

### 1. Get Google AI API Key

If you haven't already:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Add to Environment Variables

Add your Google AI API key to your `.env` file:

```env
GOOGLE_AI_API_KEY=your_api_key_here
```

**Note**: If you've already set this up for the AI tags feature, you don't need to do it again!

## How It Works

### Automatic Paraphrasing

When you save a series via the API:

```bash
POST /api/series/save
{ "seriesId": "7450059162446200848" }
```

The system automatically:

1. Fetches the original title and description from Melolo API
2. Sends them to Google AI for paraphrasing
3. Saves the paraphrased versions to the database
4. Returns both original and paraphrased versions for comparison

### Paraphrasing Strategy

#### For Titles:
- Makes them catchy and engaging
- Keeps under 80 characters
- Uses power words and emotional language
- Maintains original meaning
- Optimizes for SEO

**Example:**
```
Original: "The CEO's Secret Lover"
Paraphrased: "The Billionaire CEO's Hidden Love: A Romance That Shook Everything"
```

#### For Descriptions:
- Creates excitement and hooks the reader
- Highlights key conflicts and themes
- Builds curiosity and emotional connection
- Keeps under 300 characters
- Uses persuasive language

**Example:**
```
Original: "A story about love and revenge"
Paraphrased: "She thought she had lost everything, until fate gave her a second chance.
Now, she's back for revenge, but will love stand in her way? A gripping tale of passion,
betrayal, and redemption that will keep you on the edge of your seat."
```

## API Response

The save endpoint now returns both versions:

```json
{
  "success": true,
  "seriesId": 123,
  "episodeCount": 50,
  "original": {
    "title": "The CEO's Secret Lover",
    "intro": "A story about love and revenge"
  },
  "paraphrased": {
    "title": "The Billionaire CEO's Hidden Love: A Romance That Shook Everything",
    "intro": "She thought she had lost everything, until fate gave her a second chance..."
  }
}
```

## Configuration

### AI Model

Uses `gemini-1.5-flash` for fast, cost-effective paraphrasing.

To change the model, edit `lib/ai-text.ts:28`:

```typescript
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
```

### Customizing Prompts

#### Title Prompt
Edit in `lib/ai-text.ts:30-53`

#### Description Prompt
Edit in `lib/ai-text.ts:55-76`

## Features

- ✅ **Automatic**: Runs every time you save a new series
- ✅ **Parallel Processing**: Paraphrases title and description simultaneously for speed
- ✅ **Error Handling**: Falls back to original text if AI fails
- ✅ **Transparent**: Returns both versions for comparison
- ✅ **SEO Optimized**: Creates search-friendly titles and descriptions
- ✅ **Engaging**: Uses copywriting best practices for higher engagement

## Logging

All paraphrasing operations are logged:

```
[Series Save] Starting AI paraphrasing for series: The CEO's Secret Lover
[AI Paraphrase] Paraphrasing title: The CEO's Secret Lover
[AI Paraphrase] Original title: The CEO's Secret Lover
[AI Paraphrase] Paraphrased title: The Billionaire CEO's Hidden Love: A Romance That Shook Everything
[AI Paraphrase] Paraphrasing description: A story about love and revenge
[AI Paraphrase] Original description: A story about love and revenge
[AI Paraphrase] Paraphrased description: She thought she had lost everything...
[AI Paraphrase] Starting series info paraphrasing...
[Series Save] AI paraphrasing completed
```

## Error Handling

If paraphrasing fails:
1. Error is logged to console
2. Original text is saved instead
3. Series save operation continues successfully
4. No interruption to the workflow

**Example error:**
```
[AI Paraphrase] Error paraphrasing title: API_KEY_INVALID
```

## Performance

- **Speed**: ~1-2 seconds for both title and description
- **Parallel Processing**: Both are paraphrased simultaneously
- **Cost**: Minimal (using Gemini 1.5 Flash)

## Cost Analysis

Using Gemini 1.5 Flash:
- Free tier: 15 requests per minute
- Pay-as-you-go: Very low cost per request
- For series saves (assuming 10-20 series/day): practically free

Estimated costs:
- Per paraphrase operation: ~$0.0001
- Per day (20 series): ~$0.002
- Per month (600 series): ~$0.06

## Use Cases

### 1. New Series Imports
Every time you import a new series from Melolo, the title and description are automatically optimized.

### 2. Content Optimization
Improves engagement and click-through rates for your video uploads.

### 3. SEO Benefits
Better titles and descriptions improve searchability on Rumble and other platforms.

### 4. Consistency
Ensures all your content has high-quality, engaging descriptions.

## Disabling AI Paraphrasing

To disable automatic paraphrasing, remove the `GOOGLE_AI_API_KEY` from your environment variables.

The system will automatically fall back to original text and continue working normally.

## Troubleshooting

### No paraphrasing happening

**Possible causes:**
1. `GOOGLE_AI_API_KEY` not set
2. Invalid API key
3. Network issues

**Solution:**
- Check your `.env` file
- Verify API key at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check console logs for errors

### Poor quality paraphrases

**Possible causes:**
1. Original text is too vague
2. Need to adjust prompts

**Solution:**
- Provide better quality original content
- Customize prompts in `lib/ai-text.ts`
- Try switching to `gemini-1.5-pro` for higher quality

### Slow response time

**Possible causes:**
1. Network latency
2. High API load

**Solution:**
- Check your internet connection
- Consider using `gemini-1.5-flash` (already default)
- The operation has a timeout, so it won't hang indefinitely

## Testing

Test the paraphrasing:

```bash
# Save a new series
curl -X POST http://localhost:3000/api/series/save \
  -H "Content-Type: application/json" \
  -d '{"seriesId": "7450059162446200848"}'

# Check the response for paraphrased content
# You should see both "original" and "paraphrased" fields
```

## Future Enhancements

Potential improvements:
- Add option to manually edit paraphrased content
- Support for multiple paraphrase variations
- Language detection and translation
- Paraphrase history and versioning
- A/B testing different versions
- Custom tone/style options (dramatic, professional, casual, etc.)

## Integration with Other Features

This feature works seamlessly with:
- **AI Tags**: Generates tags based on paraphrased title/description
- **Scheduler**: Uses paraphrased content for automatic uploads
- **Manual Uploads**: Uses paraphrased content when uploading to Rumble

All your content optimization happens automatically in one place!
