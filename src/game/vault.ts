import { supabase } from '../utils/supabase'

/**
 * The Vault's live days, published by the recording pipeline (slab-pipeline publish.py) to
 * `vault_days` and the private `vault-audio` bucket (slabtech sql/vault-days-migration.sql).
 *
 * The page's Vault code holds one day per rep entry, so each published day becomes its own entry
 * (`who` says whose day it is) and `people` lists the reps the Vault groups them under.
 * Returns null when nothing is published, and the page keeps the pack that ships in the app.
 */

export interface VaultPerson {
  id: string
  name: string
  ini: string
  color: string
}

export interface VaultData {
  people: VaultPerson[]
  reps: (VaultPerson & { who: string; days: any[] })[]
  clips: any[]
  /** The day the "start here" button opens */
  start: string
}

/** The pack's reps keep the ids the page's faces and tags are keyed by */
const KNOWN: Record<string, VaultPerson> = {
  Marshall: { id: 'm', name: 'Marshall Hawks', ini: 'MH', color: '#daae5d' },
  Rylan: { id: 'r', name: 'Rylan', ini: 'RY', color: '#7fd1c7' },
}
const COLORS = ['#6ea8ff', '#e0664f', '#b48ef0', '#8fcf6a']
/** Signed links last the whole session */
const LINK_SECONDS = 12 * 3600
/** Days loaded at start-up: each carries its full transcript, so the page stays light */
const MAX_DAYS = 12

function person(name: string, i: number): VaultPerson {
  if (KNOWN[name]) return KNOWN[name]
  const ini = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, ini, color: COLORS[i % COLORS.length] }
}

function dayLabels(date: string | null): { t: string; date: string } {
  if (!date) return { t: 'Recorded day', date: 'Summer' }
  const d = new Date(`${date}T12:00:00`)
  return {
    t: d.toLocaleDateString('en-US', { weekday: 'long' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
}

export async function loadVault(): Promise<VaultData | null> {
  const { data: rows, error } = await supabase
    .from('vault_days')
    .select('id, rep_name, recording_date, area, minutes, doors, clips, audio_prefix')
    .eq('featured', true)
    .order('recording_date', { ascending: false, nullsFirst: false })
    .limit(MAX_DAYS)
  if (error || !rows?.length) return null

  const paths = rows.flatMap((r: any) => (r.doors as any[]).map((d) => `${r.audio_prefix}/${d.src}`))
  const { data: signed } = await supabase.storage.from('vault-audio').createSignedUrls(paths, LINK_SECONDS)
  const url = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]))

  const people: VaultPerson[] = []
  const reps: VaultData['reps'] = []
  const clips: any[] = []
  rows.forEach((r: any, i: number) => {
    const base = person(r.rep_name, people.length)
    let p = people.find((x) => x.id === base.id)
    if (!p) people.push((p = base))
    const id = `${p.id}~${i}`
    const doors = (r.doors as any[])
      .map((d) => ({ ...d, src: url.get(`${r.audio_prefix}/${d.src}`) }))
      .filter((d) => d.src)
    // The page finds a door by its number, so keep them 1..n in order
    const renumber = new Map(doors.map((d, k) => [d.n, k + 1]))
    doors.forEach((d) => { d.n = renumber.get(d.n) })
    reps.push({ ...p, id, who: p.id, days: [{ ...dayLabels(r.recording_date), area: r.area ? r.area[0].toUpperCase() + r.area.slice(1) : '', mins: Number(r.minutes), doors }] })
    for (const c of r.clips as any[]) {
      if (renumber.has(c.door)) clips.push({ ...c, rep: id, door: renumber.get(c.door) })
    }
  })
  const days = reps.filter((r) => r.days[0].doors.length)
  if (!days.length) return null
  const best = days.slice().sort((a, b) => sales(b) - sales(a))[0]
  return { people, reps: days, clips: clips.filter((c) => days.some((d) => d.id === c.rep)), start: best.id }
}

const sales = (r: { days: any[] }) => r.days[0].doors.filter((d: any) => d.kind === 'sale').length
