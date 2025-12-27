import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
// import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';

const RUMBLE_BASE_URL = 'https://web22.rumble.com/upload.php';
const RUMBLE_API_VERSION = '1.3';

// Initialize Google Generative AI
const genAI = process.env.GOOGLE_AI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })
    : null;

function getRumbleHeaders(contentType?: string) {
    const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0',
        'Accept': '*/*',
        'Accept-Language': 'id,en-US;q=0.7,en;q=0.3',
        'Origin': 'https://rumble.com',
        'Referer': 'https://rumble.com/',
        'Connection': 'keep-alive',
    };

    if (process.env.RUMBLE_COOKIE) {
        headers['Cookie'] = process.env.RUMBLE_COOKIE;
    }

    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    return headers;
}

/**
 * Generate tags using Google Generative AI
 * Returns comma-separated tags based on the video title and description
 */
export async function generateAITags(
    title: string,
    description: string
): Promise<string> {
    if (!genAI) {
        console.warn('[AI Tags] Google AI API key not configured, returning empty tags');
        return '';
    }

    try {
        console.log('[AI Tags] Generating tags for:', title);

        const prompt = `Generate 5-10 list of relevant, high-traffic, SEO-friendly video tags short Chinese drama video tags for a video with the following information:
Title: ${title}
Description: ${description}

Requirements:
- Use english language
- Tags should be relevant to the content
- Separate tags with commas only
- No hashtags or special characters
- Mix of broad and specific tags
- Lowercase only
- Return ONLY the comma-separated tags, no other text

Example output: anime, action, adventure, fantasy, series`;

        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const tags = response?.text?.toString()?.trim() || '';
        console.log('[AI Tags] Generated tags:', tags);

        return tags;
    } catch (error) {
        console.error('[AI Tags] Error generating tags:', error);
        // Return empty string on error to allow upload to continue
        return '';
    }
}

/**
 * Step 1: Upload video file to Rumble
 * Returns the video ID
 */
export async function uploadVideoFile(filePath: string, filename: string): Promise<string> {
    console.log("=".repeat(50))
    console.log("uploadVideoFile", filePath, filename)
    console.log("=".repeat(50))

    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const form = new FormData();
    form.append('Filedata', fs.createReadStream(filePath), {
        filename: filename,
        contentType: 'video/mp4',
    });

    try {
        const response = await axios.post(
            `${RUMBLE_BASE_URL}?api=${RUMBLE_API_VERSION}`,
            form,
            {
                headers: {
                    ...getRumbleHeaders(),
                    ...form.getHeaders(),
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            }
        );

        const videoId = response.data;

        if (!videoId || videoId.trim() === '') {
            throw new Error('Failed to upload video - no video ID returned');
        }

        console.log("Video uploaded successfully. Video ID:", videoId.trim());
        return videoId.trim();
    } catch (error) {
        console.error("Upload error:", error);
        throw error;
    }
}

/**
 * Step 2: Send duration request
 * This is a processing step, response can be ignored
 */
export async function sendDurationRequest(videoId: string): Promise<void> {
    await fetch(`${RUMBLE_BASE_URL}?duration=${videoId}&api=${RUMBLE_API_VERSION}`, {
        method: 'GET',
        headers: getRumbleHeaders(),
    });
}

/**
 * Step 3: Fetch available thumbnails
 * Returns object with thumbnail IDs and base64 data
 */
export async function fetchThumbnails(videoId: string): Promise<Record<string, string>> {
    const response = await fetch(`${RUMBLE_BASE_URL}?thumbnails=${videoId}&api=${RUMBLE_API_VERSION}`, {
        method: 'GET',
        headers: getRumbleHeaders(),
    });

    const thumbnails = await response.json();
    return thumbnails;
}

/**
 * Step 4 & 5: Publish video with metadata
 * Returns success status
 */
export async function publishVideo(
    videoId: string,
    metadata: {
        title: string;
        description: string;
        thumbnailId: string;
        videoFilename: string;
        fileSize: number;
        tags?: string;
    }
): Promise<{ success: boolean; rumbleUrl?: string }> {
    const channelId = process.env.RUMBLE_CHANNEL_ID || '7830376';
    const siteChannelId = process.env.RUMBLE_SITE_CHANNEL_ID || '15';
    const mediaChannelId = process.env.RUMBLE_MEDIA_CHANNEL_ID || '892';

    const timeStart = Date.now() - 20000; // Simulate upload started 20s ago
    const timeEnd = Date.now();

    const fileMeta = {
        name: metadata.videoFilename,
        modified: Date.now(),
        size: metadata.fileSize,
        type: 'video/mp4',
        time_start: timeStart,
        speed: Math.floor(metadata.fileSize / ((timeEnd - timeStart) / 1000)),
        num_chunks: 1,
        time_end: timeEnd,
    };

    const formData = new FormData();
    formData.append('title', metadata.title);
    formData.append('description', metadata.description);
    formData.append('video[]', `${videoId}`);
    formData.append('featured', '6');
    formData.append('rights', '1');
    formData.append('terms', '1');
    formData.append('facebookUpload', '');
    formData.append('vimeoUpload', '');
    formData.append('infoWho', '');
    formData.append('infoWhen', '');
    formData.append('infoWhere', '');
    formData.append('infoExtUser', '');
    formData.append('tags', metadata.tags || '');
    formData.append('channelId', channelId);
    formData.append('siteChannelId', siteChannelId);
    formData.append('mediaChannelId', mediaChannelId);
    formData.append('isGamblingRelated', 'false');
    formData.append('set_default_channel_id', '1');
    formData.append('sendPush', '0');
    formData.append('setFeaturedForUser', '1');
    formData.append('setFeaturedForChannel', '1');
    formData.append('visibility', 'public');
    formData.append('availability', 'free');
    formData.append('file_meta', JSON.stringify(fileMeta));
    formData.append('thumb', metadata.thumbnailId);

    try {
        const response = await axios.post(
            `${RUMBLE_BASE_URL}?form=1&api=${RUMBLE_API_VERSION}`,
            formData,
            {
                headers: {
                    ...getRumbleHeaders(),
                    ...formData.getHeaders(),
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            }
        );

        const result = response.data;
        console.log("result", result)

        // The response contains the video URL or ID
        // Parse it to extract the Rumble URL if possible
        // For now, return success if we got a response

        return {
            success: true,
            rumbleUrl: result.includes('rumble.com') ? result : undefined,
        };
    } catch (error) {
        console.error('Error publishing video to Rumble:', error);
        return {
            success: false,
        };
    }
}

/**
 * Complete upload flow
 */
export async function uploadToRumble(
    localFilePath: string,
    filename: string,
    metadata: {
        title: string;
        description: string;
    }
): Promise<{ videoId: string; rumbleUrl?: string }> {
    // Step 1: Upload video file
    const videoId = await uploadVideoFile(localFilePath, filename);
    console.log("videoId", videoId)

    // Step 2: Send duration request
    await sendDurationRequest(videoId);
    console.log("duration request sent")

    // Step 3: Fetch thumbnails
    const thumbnails = await fetchThumbnails(videoId);
    console.log("thumbnails", thumbnails)

    // Select the first available thumbnail
    const thumbnailId = Object.keys(thumbnails)[0];
    console.log("thumbnailId success")

    if (!thumbnailId) {
        throw new Error('No thumbnails available');
    }

    // Get file size
    const stats = fs.statSync(localFilePath);
    console.log("stats", stats)

    // Step 3.5: Generate AI tags
    const aiTags = await generateAITags(metadata.title, metadata.description);
    console.log("AI tags generated:", aiTags)

    // Step 4 & 5: Publish video
    const result = await publishVideo(videoId, {
        title: metadata.title,
        description: metadata.description,
        thumbnailId: thumbnailId,
        videoFilename: filename,
        fileSize: stats.size,
        tags: aiTags,
    });

    if (!result.success) {
        throw new Error('Failed to publish video to Rumble');
    }

    return {
        videoId,
        rumbleUrl: result.rumbleUrl,
    };
}
