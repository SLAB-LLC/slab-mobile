import { supabase } from '../utils/supabase'
import type { RepLook } from '../avatar/types'

/**
 * Pixel rep looks, one row per rep in user_avatars (slabtech
 * sql/avatars-migration.sql). Reps read their company's looks and write
 * only their own.
 */

/** The rep's saved look, or null if they haven't built one yet */
export async function getMyLook(userId: string): Promise<Partial<RepLook> | null> {
  const { data, error } = await supabase
    .from('user_avatars')
    .select('look')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data?.look as Partial<RepLook>) ?? null
}

export async function saveMyLook(userId: string, companyId: string | null, look: RepLook) {
  const { error } = await supabase
    .from('user_avatars')
    .upsert({ user_id: userId, company_id: companyId, look }, { onConflict: 'user_id' })
  if (error) throw error
}

/** Looks for a set of reps (leaderboard, Vault), keyed by user id */
export async function getLooks(userIds: string[]): Promise<Record<string, Partial<RepLook>>> {
  if (!userIds.length) return {}
  const { data, error } = await supabase
    .from('user_avatars')
    .select('user_id, look')
    .in('user_id', userIds)
  if (error) throw error
  return Object.fromEntries((data ?? []).map((r: any) => [r.user_id, r.look]))
}
