import { supabase } from '../utils/supabase'
import { TOS_VERSION } from '../data/termsOfService'

/**
 * Returns true if the user has already accepted the current TOS version.
 * Reads tos_version_accepted from user_profiles.
 */
export async function hasAcceptedCurrentTos(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('tos_version_accepted')
    .eq('id', userId)
    .single()

  if (error || !data) return false
  return data.tos_version_accepted === TOS_VERSION
}

/**
 * Record that the user has accepted the current version of the Terms of Service.
 * Writes tos_accepted_at + tos_version_accepted to user_profiles.
 */
export async function recordTosAcceptance(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      tos_accepted_at: new Date().toISOString(),
      tos_version_accepted: TOS_VERSION,
    })
    .eq('id', userId)

  if (error) throw error
}
