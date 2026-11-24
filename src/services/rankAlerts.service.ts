import { supabase } from '../utils/supabase'

/**
 * Leaderboard rank-drop alerts (slabtech sql/rank-drop-alerts-migration.sql).
 *
 * The database notices when someone knocks a rep down inside their company's top 3 or off it, and
 * writes the alert. Pushes go out from the website: the app pings it right after every XP grant
 * (the grant is what moves the board). In the app, a rep sees the drops they missed as a banner.
 */

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://www.slabtraining.com').replace(/\/$/, '')

export interface RankAlert {
  id: string
  oldRank: number
  /** null: out of the top 3 */
  newRank: number | null
  title: string
  body: string
  at: string
}

/** Push anything the last grant set off. Fire and forget: a missed ping is picked up by the next grant */
export function sendRankAlertPushes(): void {
  ;(async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return
    await fetch(`${SITE_URL}/api/app/rank-alerts`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  })().catch(() => {})
}

/** Drops the rep hasn't seen yet (newest first); they're marked seen. Empty until the SQL is run */
export async function takeUnseenRankAlerts(): Promise<RankAlert[]> {
  const { data, error } = await supabase.rpc('my_rank_alerts')
  if (error || !Array.isArray(data)) return []
  return data as RankAlert[]
}
