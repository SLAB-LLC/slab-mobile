import { supabase } from '../utils/supabase'

/**
 * XP service. The database owns XP: the app asks grant_xp() for a grant and
 * the server picks the amount from the company's config, applies streak and
 * power hour multipliers, caps and one-time rules (slabtech
 * sql/xp-engine-migration.sql).
 */

export type XpReason =
  | 'lesson_complete'
  | 'book_pass'
  | 'boss_win'
  | 'vault_minute'
  | 'library_open'
  | 'coach_ask'

export interface XpGrant {
  granted: boolean
  /** Final reason recorded (a repeat boss win comes back as boss_rematch) */
  reason: string
  amount: number
  multiplier: number
  powerHour: boolean
  /** The rep's all-time XP after this grant */
  total: number
}

export interface XpTotals {
  total_xp: number
  month_xp: number
  week_xp: number
}

const deviceTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export async function grantXp(reason: XpReason, sourceId?: string | null): Promise<XpGrant> {
  const { data, error } = await supabase.rpc('grant_xp', {
    p_reason: reason,
    p_source_id: sourceId ?? null,
    p_tz: deviceTimeZone(),
  })
  if (error) throw error
  return data as XpGrant
}

export async function getMyXpTotals(userId: string): Promise<XpTotals> {
  const { data, error } = await supabase
    .from('user_xp_totals')
    .select('total_xp, month_xp, week_xp')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ?? { total_xp: 0, month_xp: 0, week_xp: 0 }
}
