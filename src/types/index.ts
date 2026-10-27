// Navigation types
export type RootStackParamList = {
  Landing: undefined
  Login: undefined
  MainDrawer: undefined
  Profile: undefined
  Support: undefined
  NotificationSettings: undefined
  MyStats: undefined
  Locker: undefined
  TranscriptDetail: { id: string }
  TermsOfService: undefined
  BroadcastDetail: { id: string }
}

export type MainTabParamList = {
  Lab: undefined
  Vault: undefined
  Chat: undefined
  Leaderboard: undefined
  Library: undefined
}

export type VideoStackParamList = {
  VideoList: undefined
  VideoPlayer: { videoId: string }
}

// Database types
export interface Transcript {
  id: string
  created_at: string
  salesperson_name: string
  salesperson_id: string | null
  original_filename: string
  file_storage_path?: string
  redaction_config_used: string
  // Recording context metadata
  actual_sales_count?: number
  expected_customer_count?: number
  area_type?: string
  estimated_duration_hours?: number
  upload_notes?: string
  /** Day the recording was made (YYYY-MM-DD), when known */
  recording_date?: string | null
  // Transcript data from backend processing
  transcript_redacted?: {
    text: string
    words: Array<{
      word: string
      start: number
      end: number
      speaker?: string
    }>
    pii_matches: Array<{
      start: number
      end: number
      label: string
    }>
    redacted_file_storage_path: string
  }
  // Legacy field for backwards compatibility
  transcript_data?: any
}

export interface Salesperson {
  id: string
  name: string
  display_order: number
  profile_picture_url?: string
}

export interface UserProfile {
  id: string
  email?: string
  role: 'user' | 'company_admin' | 'super_admin'
  company_id?: string
  full_name?: string
  display_name?: string
  profile_picture_url?: string
}

export interface Company {
  id: string
  name: string
  slug: string
  created_at: string
  primary_color?: string
  secondary_color?: string
  logo_url?: string
}

export interface Conversation {
  id: string
  transcript_id: string
  conversation_number: number
  start_time: number
  end_time: number
  speakers: string[]
  sales_rep_speaker: string
  word_count: number
  duration_seconds: number
  category: 'sale' | 'pitch' | 'interaction'
  objections: string[]
  objections_with_text: Array<{ type: string; text: string }>
  objection_timestamps: Array<{ type: string; text: string; timestamp: number }>
  has_price_mention: boolean
  pii_redaction_count: number
  analysis_completed: boolean
  analysis_error?: string
}

export interface Word {
  word: string
  start: number
  end: number
  speaker?: string
}

export interface PiiMatch {
  start: number
  end: number
  label: string
}

export interface TrainingVideo {
  id: string
  company_id: string
  title: string
  description?: string
  video_type: 'youtube' | 'upload'
  youtube_url?: string
  storage_path?: string
  thumbnail_url?: string
  duration?: number
  created_at: string
}

export interface TrainingPlaylist {
  id: string
  company_id: string
  name: string
  description?: string
  created_at: string
}

export interface VideoCompletion {
  id: string
  video_id: string
  user_id: string
  completed_at: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
