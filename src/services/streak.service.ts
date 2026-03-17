import { supabase } from '../utils/supabase'

export interface StreakData {
  current_streak: number
  longest_streak: number
  total_activities: number
  last_activity_date: string | null
}

export interface ActivityEvent {
  event_type: 'audio_play' | 'audio_pause' | 'audio_complete' | 'transcript_view' | 'page_view'
  event_data?: Record<string, any>
  transcript_id?: string
}

/**
 * Log a streak activity for today.
 * The backend trigger automatically updates the user_streaks table.
 * Only one activity per user per day is counted.
 */
export async function logStreakActivity(
  userId: string,
  companyId: string,
  transcriptId?: string,
  activityType: string = 'audio_listen'
): Promise<{ alreadyLogged: boolean; streak?: StreakData }> {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Check if already logged today
    const { data: existing } = await supabase
      .from('streak_activities')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_date', today)
      .maybeSingle()

    if (existing) {
      return { alreadyLogged: true }
    }

    // Insert activity
    const { error: insertError } = await supabase
      .from('streak_activities')
      .insert({
        user_id: userId,
        company_id: companyId,
        activity_date: today,
        activity_type: activityType,
        transcript_id: transcriptId || null,
      })

    if (insertError) {
      console.error('Error logging streak activity:', insertError)
      return { alreadyLogged: false }
    }

    // Fetch updated streak
    const streak = await getStreak(userId)
    return { alreadyLogged: false, streak: streak || undefined }
  } catch (err) {
    console.error('Error in logStreakActivity:', err)
    return { alreadyLogged: false }
  }
}

/**
 * Get current streak data for a user.
 */
export async function getStreak(userId: string): Promise<StreakData | null> {
  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, total_activities, last_activity_date')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching streak:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Error in getStreak:', err)
    return null
  }
}

/**
 * Fire a heartbeat ping and update daily_usage_stats — mirrors the web /api/activity/heartbeat.
 * Called every 60s while audio is actively playing.
 */
export async function recordHeartbeat(
  userId: string,
  companyId: string,
  sessionId: string
): Promise<void> {
  try {
    await supabase.rpc('record_activity_heartbeat', {
      p_session_id: sessionId,
      p_page_path: '/mobile/audio',
      p_activity_type: 'audio_playing',
      p_metadata: {},
    })
    // update_daily_usage_stats may be security-definer and callable by users;
    // if not, the error is swallowed gracefully.
    supabase
      .rpc('update_daily_usage_stats', {
        p_user_id: userId,
        p_date: new Date().toISOString().split('T')[0],
      })
      .then(({ error }) => {
        if (error) console.warn('update_daily_usage_stats:', error.message)
      })
  } catch (err) {
    console.warn('Error recording heartbeat:', err)
  }
}

/**
 * Log a specific activity event (for detailed tracking).
 */
export async function logActivityEvent(
  userId: string,
  companyId: string,
  event: ActivityEvent
): Promise<void> {
  try {
    await supabase.from('user_activity_events').insert({
      user_id: userId,
      company_id: companyId,
      event_type: event.event_type,
      event_data: event.event_data || {},
    })
  } catch (err) {
    console.error('Error logging activity event:', err)
  }
}
