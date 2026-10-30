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

/** One published day; `prefix` is its audio folder, and each door keeps its published number as `orig` */
export type VaultDay = VaultPerson & { who: string; prefix: string; days: any[] }

export interface VaultData {
  people: VaultPerson[]
  reps: VaultDay[]
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

const DAY_COLUMNS = 'id, rep_name, recording_date, area, minutes, doors, clips, audio_prefix'

async function signAll(rows: any[]): Promise<Map<string, string>> {
  const paths = rows.flatMap((r: any) => (r.doors as any[]).map((d) => `${r.audio_prefix}/${d.src}`))
  const { data: signed } = await supabase.storage.from('vault-audio').createSignedUrls(paths, LINK_SECONDS)
  return new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]))
}

/** A published day as a Vault entry, with its clips renumbered to match */
function toDay(r: any, p: VaultPerson, id: string, url: Map<string, string>): { day: VaultDay; clips: any[] } {
  const doors = (r.doors as any[])
    .map((d) => ({ ...d, orig: d.n, src: url.get(`${r.audio_prefix}/${d.src}`) }))
    .filter((d) => d.src)
  // The page finds a door by its number, so keep them 1..n in order
  const renumber = new Map(doors.map((d, k) => [d.n, k + 1]))
  doors.forEach((d) => { d.n = renumber.get(d.n) })
  const day: VaultDay = { ...p, id, who: p.id, prefix: r.audio_prefix, days: [{ ...dayLabels(r.recording_date), area: r.area ? r.area[0].toUpperCase() + r.area.slice(1) : '', mins: Number(r.minutes), doors }] }
  const clips = (r.clips as any[]).filter((c) => renumber.has(c.door)).map((c) => ({ ...c, rep: id, door: renumber.get(c.door) }))
  return { day, clips }
}

let extraDays = 0

/** One day by its audio folder, for a door the coach points at that isn't among the featured days */
export async function loadVaultDay(prefix: string): Promise<VaultDay | null> {
  const { data: r } = await supabase.from('vault_days').select(DAY_COLUMNS).eq('audio_prefix', prefix).maybeSingle()
  if (!r) return null
  const p = person(r.rep_name, 0)
  // Ids stay plain (the page puts them in attributes); the featured days use their position
  const { day } = toDay(r, p, `${p.id}~more${++extraDays}`, await signAll([r]))
  return day.days[0].doors.length ? day : null
}

export async function loadVault(): Promise<VaultData | null> {
  const { data: rows, error } = await supabase
    .from('vault_days')
    .select(DAY_COLUMNS)
    .eq('featured', true)
    .order('recording_date', { ascending: false, nullsFirst: false })
    .limit(MAX_DAYS)
  if (error || !rows?.length) return null

  const url = await signAll(rows)
  const people: VaultPerson[] = []
  const reps: VaultData['reps'] = []
  const clips: any[] = []
  rows.forEach((r: any, i: number) => {
    const base = person(r.rep_name, people.length)
    let p = people.find((x) => x.id === base.id)
    if (!p) people.push((p = base))
    const got = toDay(r, p, `${p.id}~${i}`, url)
    reps.push(got.day)
    clips.push(...got.clips)
  })
  const days = reps.filter((r) => r.days[0].doors.length)
  if (!days.length) return null
  const best = days.slice().sort((a, b) => sales(b) - sales(a))[0]
  return { people, reps: days, clips: clips.filter((c) => days.some((d) => d.id === c.rep)), start: best.id }
}

const sales = (r: { days: any[] }) => r.days[0].doors.filter((d: any) => d.kind === 'sale').length
