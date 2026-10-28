import { Share } from 'react-native'
import { supabase } from '../utils/supabase'

/**
 * The Owner view and My Team in the game page, on real data: the roster and teams come from
 * company_roster() and change through manage_rep / save_team / invite_rep (slabtech
 * sql/owner-tools-migration.sql). Announcements, nudges and shout-outs go through the website,
 * which sends the pushes.
 */

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://www.slabtraining.com').replace(/\/$/, '')

function fail(error: { message?: string } | null): never {
  throw new Error(error?.message || 'Something went wrong')
}

export async function loadRoster(): Promise<unknown> {
  const { data, error } = await supabase.rpc('company_roster')
  if (error) fail(error)
  return data
}

export async function manageRep(p: { id: string; role?: string; level?: string; teamId?: string | null; active?: boolean }) {
  const { error } = await supabase.rpc('manage_rep', {
    p_target: p.id,
    p_role: p.role ?? null,
    p_level: p.level ?? null,
    p_team: p.teamId || null,
    p_clear_team: p.teamId === null || p.teamId === '',
    p_active: typeof p.active === 'boolean' ? p.active : null,
  })
  if (error) fail(error)
  return null
}

export async function saveTeam(p: { id?: string | null; name: string; managerId?: string | null; goal?: number }) {
  const { data, error } = await supabase.rpc('save_team', {
    p_id: p.id || null,
    p_name: p.name,
    p_manager: p.managerId || null,
    p_goal: p.goal ?? null,
  })
  if (error) fail(error)
  return data
}

/** Makes the invite and opens the share sheet so the owner texts or emails the link themselves */
export async function inviteRep(p: { email: string; role?: string; level?: string; teamId?: string | null; companyName?: string | null }) {
  const { data: token, error } = await supabase.rpc('invite_rep', {
    p_email: p.email,
    p_role: p.role || 'user',
    p_level: p.level || 'rookie',
    p_team: p.teamId || null,
  })
  if (error) fail(error)
  const url = `${SITE_URL}/invite/${token}`
  const shared = await Share.share({
    message: `You're invited to ${p.companyName || 'the team'} on SLAB. Set your password here: ${url}`,
  }).catch(() => null)
  return { url, shared: shared?.action === Share.sharedAction }
}

async function siteFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sign in again to send that')
  const res = await fetch(`${SITE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `Couldn't reach SLAB (${res.status})`)
  return body
}

export const notify = (p: { title: string; body: string; to: 'all' | 'team' | 'rep'; teamId?: string; repId?: string }) =>
  siteFetch('/api/company/notify', { method: 'POST', body: JSON.stringify(p) })

export const sentList = () => siteFetch('/api/company/notify').then((b) => b.sent ?? [])

/** Training settings the owner picks (required units and books, pass scores), kept in company_app_config.features.training */
export async function saveTraining(companyId: string, training: unknown) {
  const { data: row, error } = await supabase.from('company_app_config').select('features').eq('company_id', companyId).maybeSingle()
  if (error) fail(error)
  const features = { ...((row?.features as Record<string, unknown>) || {}), training }
  const { error: upErr } = row
    ? await supabase.from('company_app_config').update({ features }).eq('company_id', companyId)
    : await supabase.from('company_app_config').insert({ company_id: companyId, features })
  if (upErr) fail(upErr)
  return null
}
