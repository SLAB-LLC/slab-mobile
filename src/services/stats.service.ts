import { supabase } from '../utils/supabase'

export interface DailyUsageStat {
  date: string // YYYY-MM-DD
  total_active_minutes: number
  transcript_views: number
  audio_listen_minutes: number
  session_count: number
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  email: string
  current_streak: number
  longest_streak: number
  total_activities: number
  company_rank: number
  profile_picture_url?: string
}

export interface UsageStatsData {
  totalMinutesToday: number
  totalMinutesWeek: number
  totalTranscriptsViewed: number
  streakDays: number[]  // 0-6, which days this week had activity
}

/**
 * Fetch company leaderboard from the company_streak_leaderboard view
 */
export async function getCompanyLeaderboard(companyId: string): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('company_streak_leaderboard')
      .select('*')
      .eq('company_id', companyId)
      .limit(50)

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return []
    }

    const entries: LeaderboardEntry[] = data || []
    if (entries.length === 0) return []

    // Fetch profile pictures from user_profiles for all leaderboard users
    const userIds = entries.map((e) => e.user_id)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, profile_picture_url')
      .in('id', userIds)

    if (profiles) {
      const picMap: Record<string, string> = {}
      profiles.forEach((p: any) => { if (p.profile_picture_url) picMap[p.id] = p.profile_picture_url })
      return entries.map((e) => ({ ...e, profile_picture_url: picMap[e.user_id] }))
    }

    return entries
  } catch (err) {
    console.error('Error in getCompanyLeaderboard:', err)
    return []
  }
}

/**
 * Get the user's rank within their company
 */
export async function getUserCompanyRank(
  userId: string,
  companyId: string
): Promise<{ rank: number; total: number } | null> {
  try {
    const { data, error } = await supabase
      .from('company_streak_leaderboard')
      .select('user_id, company_rank')
      .eq('company_id', companyId)

    if (error) {
      console.error('Error fetching rank:', error)
      return null
    }

    if (!data || data.length === 0) return null

    const userEntry = data.find((e) => e.user_id === userId)
    return {
      rank: userEntry?.company_rank || data.length + 1,
      total: data.length,
    }
  } catch (err) {
    console.error('Error in getUserCompanyRank:', err)
    return null
  }
}

/**
 * Get personal daily usage stats for the last 7 days
 */
export async function getPersonalWeeklyStats(userId: string): Promise<DailyUsageStat[]> {
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const startDate = sevenDaysAgo.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('daily_usage_stats')
      .select('date, total_active_minutes, transcript_views, audio_listen_minutes, session_count')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching weekly stats:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('Error in getPersonalWeeklyStats:', err)
    return []
  }
}

/**
 * Get personal daily usage stats for the last 30 days
 */
export async function getPersonalMonthlyStats(userId: string): Promise<DailyUsageStat[]> {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    const startDate = thirtyDaysAgo.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('daily_usage_stats')
      .select('date, total_active_minutes, transcript_views, audio_listen_minutes, session_count')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching monthly stats:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('Error in getPersonalMonthlyStats:', err)
    return []
  }
}

/**
 * Get lifetime totals for the user across all time
 */
export async function getPersonalLifetimeTotals(
  userId: string
): Promise<{ total_active_minutes: number; transcript_views: number }> {
  try {
    const { data, error } = await supabase
      .from('daily_usage_stats')
      .select('total_active_minutes, transcript_views')
      .eq('user_id', userId)

    if (error || !data) return { total_active_minutes: 0, transcript_views: 0 }

    return {
      total_active_minutes: data.reduce((s, d) => s + (d.total_active_minutes || 0), 0),
      transcript_views: data.reduce((s, d) => s + (d.transcript_views || 0), 0),
    }
  } catch (err) {
    console.error('Error in getPersonalLifetimeTotals:', err)
    return { total_active_minutes: 0, transcript_views: 0 }
  }
}

/**
 * Get this week's activity days for the user
 */
export async function getWeekActivityDays(userId: string): Promise<number[]> {
  try {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sun
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('streak_activities')
      .select('activity_date')
      .eq('user_id', userId)
      .gte('activity_date', startOfWeek.toISOString().split('T')[0])

    if (error) {
      console.error('Error fetching week activity:', error)
      return []
    }

    return (data || []).map((d) => {
      const date = new Date(d.activity_date + 'T00:00:00')
      return date.getDay()
    })
  } catch (err) {
    console.error('Error in getWeekActivityDays:', err)
    return []
  }
}
