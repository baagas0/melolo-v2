export interface Series {
  id: number
  melolo_series_id: string
  cover_url: string
  intro: string
  title: string
  episode_count: number
  created_at: string
  updated_at: string
}

export interface Episode {
  id: number
  series_id: number
  melolo_vid_id: string
  cover: string
  title: string
  index_sequence: number
  duration: number
  video_height: number
  video_weight: number
  path: string | null
  created_at: string
  updated_at: string
}

export interface SearchResultItem {
  series_id: string
  cover_url: string
  title: string
  intro: string
  episode_count: number
}

export interface VideoStreamData {
  play_url: string
  definition: string
  width: number
  height: number
}
