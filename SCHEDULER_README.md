# Rumble Upload Scheduler

This scheduler automatically uploads the next episode of the latest series to Rumble every 6 hours.

## Features

- **Automatic Uploads**: Runs every 6 hours via cron job
- **Smart Episode Detection**: Finds the latest uploaded episode and uploads the next one
- **Database-Driven**: Uses the `rumble_uploads` table to track uploaded episodes
- **Manual Control**: API endpoints to start, stop, and manually trigger uploads
- **Error Handling**: Skips already uploaded episodes and handles errors gracefully
- **Logging**: Detailed console logs for monitoring and debugging

## How It Works

1. The scheduler queries the `rumble_uploads` table to find the most recently published episode
2. It determines the series and episode number from the latest upload
3. It searches for the next episode in the same series (by `index_sequence`)
4. If the next episode exists and has a local video file, it uploads it to Rumble
5. If there are no more episodes in the series, the scheduler waits until a new series is uploaded manually

## API Endpoints

### Start Scheduler
```
POST /api/scheduler/start
```
Starts the automatic cron job scheduler.

### Stop Scheduler
```
POST /api/scheduler/stop
```
Stops the automatic cron job scheduler.

### Manual Upload Trigger
```
POST /api/scheduler/upload
```
Manually triggers an upload (useful for testing or uploading outside the schedule).

### Get Scheduler Status
```
GET /api/scheduler/upload
```
Returns the current status:
```json
{
  "schedulerRunning": true,
  "isUploading": false
}
```

## Configuration

The scheduler is configured in `lib/scheduler.ts`:

- **Cron Expression**: `'0 */6 * * *'` (every 6 hours at minute 0)
- **Timezone**: `'UTC'`

To modify the schedule, change the `cronExpression` in the `RumbleUploadScheduler` constructor.

## Initialization

- **Production Mode**: Scheduler starts automatically when the app starts
- **Development Mode**: Scheduler must be started manually via API call

## Database Schema

The scheduler uses these tables:

### `rumble_uploads`
- Tracks all Rumble upload attempts
- Fields: `episode_id`, `video_id`, `rumble_url`, `status`, `error_message`
- Statuses: `pending`, `uploading`, `processing`, `published`, `failed`

### `episodes`
- Contains episode information
- Important field: `local_video_path` (must exist for upload)

### `series`
- Contains series information
- Used for generating upload titles

## Error Handling

- If an episode is already published, the scheduler skips to the next one
- If an upload fails, the status is set to `failed` with an error message
- The scheduler will attempt the same episode again on the next run if it's still not published
- If no episodes are available, the scheduler logs the message and waits for the next scheduled run

## Logs

All scheduler actions are logged with `[Scheduler]` prefix:
- `[Scheduler] Starting scheduled upload process`
- `[Scheduler] Latest upload: Series "...", Episode X`
- `[Scheduler] Next episode found: ...`
- `[Scheduler] Upload successful: ...`
- `[Scheduler] Upload failed: ...`

## Environment Variables

Required environment variables (already configured in your `.env`):
- `DATABASE_URL`: PostgreSQL database connection
- `RUMBLE_COOKIE`: Rumble authentication cookie
- `RUMBLE_CHANNEL_ID`: Rumble channel ID
- `RUMBLE_SITE_CHANNEL_ID`: Rumble site channel ID
- `RUMBLE_MEDIA_CHANNEL_ID`: Rumble media channel ID

## Example Usage

### Start the scheduler
```bash
curl -X POST http://localhost:3000/api/scheduler/start
```

### Manually trigger an upload
```bash
curl -X POST http://localhost:3000/api/scheduler/upload
```

### Check status
```bash
curl http://localhost:3000/api/scheduler/upload
```

## Notes

- The scheduler only uploads **one episode per scheduled run** to avoid overwhelming the system
- After an upload, it waits for the next cron job to run before uploading another episode
- If you need to upload multiple episodes quickly, use the manual trigger endpoint multiple times
- Make sure episodes are downloaded (have `local_video_path`) before the scheduler runs
