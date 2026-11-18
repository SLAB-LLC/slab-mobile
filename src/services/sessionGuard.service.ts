import { supabase } from '../utils/supabase'

/**
 * One sign-in at a time (slabtech sql/login-sharing-protection.sql): when the same login signs in
 * on another phone or the website, this phone's sign-in is ended on the server. These helpers
 * let the app notice within a minute instead of when its token runs out (up to an hour).
 */

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://www.slabtraining.com').replace(/\/$/, '')

/** Tell the website about this sign-in (login log, real IP, alert email for a flagged account). */
export async function reportLogin(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch(`${SITE_URL}/api/auth/log-login`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
  } catch {
    // Best-effort: never in the way of signing in
  }
}

/**
 * False only when the server says this sign-in no longer exists (signed in elsewhere, or SLAB
 * signed the account out). Offline or any other error counts as still signed in.
 */
export async function isSignInStillValid(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return true // nothing to check; onAuthStateChange handles signed-out state
    const { error } = await supabase.auth.getUser()
    if (!error) return true
    const code = (error as { code?: string }).code
    return !(code === 'session_not_found' || code === 'refresh_token_not_found' || code === 'user_banned')
  } catch {
    return true
  }
}
