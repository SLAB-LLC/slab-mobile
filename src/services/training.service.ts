import { supabase } from '../utils/supabase'
import { TrainingVideo, VideoCompletion } from '../types'

/**
 * Training Service
 * Centralized service for training videos and completions
 * All queries include explicit company_id filtering for security
 */

/**
 * Fetch training videos for a specific company
 * @param companyId - The company ID to filter by
 * @returns Array of training videos
 */
export async function getTrainingVideos(
  companyId: string
): Promise<TrainingVideo[]> {
  try {
    const { data, error } = await supabase
      .from('training_videos')
      .select('*')
      .eq('company_id', companyId) // CRITICAL: Explicit company filter
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching training videos:', error)
      throw new Error(`Failed to fetch training videos: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getTrainingVideos:', error)
    throw error
  }
}

/**
 * Fetch a single training video by ID
 * Verifies that the video belongs to the specified company
 * @param id - The video ID
 * @param companyId - The company ID for verification
 * @returns Single video or null
 */
export async function getTrainingVideoById(
  id: string,
  companyId: string
): Promise<TrainingVideo | null> {
  try {
    const { data, error } = await supabase
      .from('training_videos')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId) // CRITICAL: Verify company access
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.warn('Training video not found or access denied:', id)
        return null
      }
      throw new Error(`Failed to fetch video: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in getTrainingVideoById:', error)
    throw error
  }
}

/**
 * Mark a video as completed for a user
 * @param videoId - The video ID
 * @param userId - The user ID
 * @returns The created completion record
 */
export async function markVideoComplete(
  videoId: string,
  userId: string
): Promise<VideoCompletion> {
  try {
    const { data, error } = await supabase
      .from('video_completions')
      .insert({
        video_id: videoId,
        user_id: userId,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error marking video as complete:', error)
      throw new Error(`Failed to mark video complete: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in markVideoComplete:', error)
    throw error
  }
}

/**
 * Get all video completions for a user
 * @param userId - The user ID
 * @returns Array of video completion records
 */
export async function getUserVideoCompletions(
  userId: string
): Promise<VideoCompletion[]> {
  try {
    const { data, error } = await supabase
      .from('video_completions')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching video completions:', error)
      throw new Error(`Failed to fetch completions: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserVideoCompletions:', error)
    throw error
  }
}

/**
 * Check if a user has completed a specific video
 * @param videoId - The video ID
 * @param userId - The user ID
 * @returns True if completed, false otherwise
 */
export async function isVideoCompleted(
  videoId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('video_completions')
      .select('id')
      .eq('video_id', videoId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking video completion:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error in isVideoCompleted:', error)
    return false
  }
}
