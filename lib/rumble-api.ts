import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const RUMBLE_BASE_URL = 'https://web22.rumble.com/upload.php';
const RUMBLE_API_VERSION = '1.3';

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

    // const formData = new URLSearchParams({
    //     title: metadata.title,
    //     description: metadata.description,
    //     'video[]': `${videoId}`,
    //     featured: '6',
    //     rights: '1',
    //     terms: '1',
    //     facebookUpload: '',
    //     vimeoUpload: '',
    //     infoWho: '',
    //     infoWhen: '',
    //     infoWhere: '',
    //     infoExtUser: '',
    //     tags: '',
    //     channelId: channelId,
    //     siteChannelId: siteChannelId,
    //     mediaChannelId: mediaChannelId,
    //     isGamblingRelated: 'false',
    //     set_default_channel_id: '1',
    //     sendPush: '0',
    //     setFeaturedForUser: '1',
    //     setFeaturedForChannel: '1',
    //     visibility: 'public',
    //     availability: 'free',
    //     file_meta: JSON.stringify(fileMeta),
    //     thumb: metadata.thumbnailId,
    // });
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
    formData.append('tags', '');
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

    // const response = await fetch(`${RUMBLE_BASE_URL}?form=1&api=${RUMBLE_API_VERSION}`, {
    //     method: 'POST',
    //     headers: getRumbleHeaders('application/x-www-form-urlencoded; charset=UTF-8'),
    //     body: formData.toString(),
    // });

    // const result = await response.text();

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
    console.log("thumbnailId", thumbnailId)

    if (!thumbnailId) {
        throw new Error('No thumbnails available');
    }

    // Get file size
    const stats = fs.statSync(localFilePath);
    console.log("stats", stats)

    // Step 4 & 5: Publish video
    const result = await publishVideo(videoId, {
        title: metadata.title,
        description: metadata.description,
        thumbnailId: thumbnailId,
        videoFilename: filename,
        fileSize: stats.size,
    });

    if (!result.success) {
        throw new Error('Failed to publish video to Rumble');
    }

    return {
        videoId,
        rumbleUrl: result.rumbleUrl,
    };
}
