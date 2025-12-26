# AI-Generated Tags for Rumble Uploads

This feature uses Google Generative AI to automatically generate relevant tags for your Rumble video uploads.

## Overview

The AI analyzes the video title and description to generate 5-10 relevant tags that are automatically applied to your Rumble uploads.

## Setup

### 1. Get Google AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Add to Environment Variables

Add your Google AI API key to your `.env` file:

```env
GOOGLE_AI_API_KEY=your_api_key_here
```

## How It Works

1. **Before Publishing**: After the video file is uploaded and thumbnails are fetched, the AI generates tags
2. **Content Analysis**: The AI analyzes the video title and description
3. **Tag Generation**: Uses Google's Gemini 1.5 Flash model to generate 5-10 relevant tags
4. **Automatic Application**: Tags are automatically included when publishing to Rumble

## Features

- **Smart Tag Generation**: Context-aware tags based on video content
- **Comma-Separated Format**: Properly formatted for Rumble's tag system
- **Error Handling**: If AI fails, uploads continue without tags (no interruption)
- **Lowercase Tags**: Consistent formatting
- **Relevant Mix**: Both broad and specific tags for better discoverability

## Example

### Input:
```
Title: EPS 1 - Naruto Shippuden
Description: Naruto Shippuden Episode 1: Homecoming
```

### AI Generated Tags:
```
naruto, anime, shippuden, action, ninja, adventure, series
```

## Configuration

### AI Model

Current model: `gemini-1.5-flash` (Fast and cost-effective)

To change the model, edit `lib/rumble-api.ts:52`:

```typescript
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
```

Available models:
- `gemini-1.5-flash` - Fast, low latency (recommended)
- `gemini-1.5-pro` - Higher quality, slower
- `gemini-pro` - Previous generation model

### Tag Generation Prompt

Customize the prompt in `lib/rumble-api.ts:54-66` to adjust tag generation behavior:

```typescript
const prompt = `Generate 5-10 relevant tags for a video...
```

## API Integration

The AI tag generation is automatically integrated into:

- **Manual Uploads**: `app/api/rumble/upload/route.ts`
- **Scheduled Uploads**: `lib/scheduler.ts`

No changes needed to existing upload code - tags are generated automatically during the upload process.

## Logging

All AI tag generation is logged:

```
[AI Tags] Generating tags for: EPS 1 - Naruto Shippuden
[AI Tags] Generated tags: naruto, anime, shippuden, action, ninja
AI tags generated: naruto, anime, shippuden, action, ninja
```

## Error Handling

If AI tag generation fails:
1. Error is logged to console
2. Upload continues with empty tags
3. No interruption to the upload process
4. Video is still published successfully

Example error log:
```
[AI Tags] Error generating tags: API key invalid
```

## Cost

**Google Gemini 1.5 Flash Pricing** (as of 2024):
- Free tier: 15 requests per minute
- Pay-as-you-go: Very low cost per request
- Typically costs less than $0.001 per 1000 tag generations

For automated uploads (every 6 hours = 4 uploads/day):
- Estimated cost: ~$0.00015 per day
- Estimated cost: ~$0.005 per month
- **Practically free for normal use**

## Disabling AI Tags

To disable AI tag generation, remove the `GOOGLE_AI_API_KEY` from your environment variables.

The system will automatically fall back to empty tags and continue working normally.

## Testing

Test the AI tag generation:

```bash
# Trigger a manual upload
curl -X POST http://localhost:3000/api/scheduler/upload

# Check logs for AI tag generation
# You should see:
# [AI Tags] Generating tags for: ...
# [AI Tags] Generated tags: ...
```

## Troubleshooting

### No tags generated

**Possible causes:**
1. `GOOGLE_AI_API_KEY` not set in environment
2. Invalid API key
3. Rate limit exceeded
4. Network issues

**Solution:**
- Check your `.env` file
- Verify API key at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check console logs for error messages

### Poor quality tags

**Solution:**
- Customize the prompt in `lib/rumble-api.ts`
- Provide more detailed descriptions
- Switch to `gemini-1.5-pro` model for better quality

### API errors

**Common errors:**
- `API_KEY_INVALID`: Check your API key
- `RATE_LIMIT_EXCEEDED`: Too many requests, wait a bit
- `QUOTA_EXCEEDED`: Billing limit reached

**Solution:**
- Verify API key is correct
- Reduce upload frequency if needed
- Check Google AI Studio quota settings

## Future Enhancements

Potential improvements:
- Custom tag presets for different series
- Tag history and analytics
- Manual tag override option
- Tag optimization based on performance
- Multi-language support
