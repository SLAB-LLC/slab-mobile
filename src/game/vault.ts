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
/** Ace's Vault is Marshall only (Duncan, 2026-11-03: Marshall said a second style would confuse Ace's reps).
 *  Other companies and solo reps still get Rylan. The page applies the same rule to the pack it ships with. */
const ACE_HIDDEN = /^rylan\b/i
const shownFor = (ace: boolean) => (r: any) => !(ace && ACE_HIDDEN.test(r.rep_name ?? ''))
const COLORS = ['#6ea8ff', '#e0664f', '#b48ef0', '#8fcf6a']
/** Signed links last the whole session */
const LINK_SECONDS = 12 * 3600
/** Published recordings loaded at start-up, enough for the whole library (light: see vaultRows) */
const MAX_DAYS = 100

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
  return new Map((signed ?? []).filter((s) => s.path && s.signedUrl).map((s) => [s.path as string, s.signedUrl]))
}

/**
 * One day's published recordings as a Vault entry, with doors and clips renumbered to match.
 * The page finds a door by its number, so they run 1..n in order; each door keeps its recording's
 * folder (`prefix`) and published number (`orig`) so the coach's pitch links can find it.
 */
function toDay(rows: any[], p: VaultPerson, id: string, url: Map<string, string>): { day: VaultDay; clips: any[] } {
  const doors: any[] = []
  const clips: any[] = []
  for (const r of rows) {
    const renumber = new Map<number, number>()
    for (const d of r.doors as any[]) {
      const src = url.get(`${r.audio_prefix}/${d.src}`)
      if (!src) continue
      renumber.set(d.n, doors.length + 1)
      doors.push({ ...d, n: doors.length + 1, orig: d.n, prefix: r.audio_prefix, src })
    }
    for (const c of r.clips as any[]) {
      if (renumber.has(c.door)) clips.push({ ...c, rep: id, door: renumber.get(c.door) })
    }
  }
  const area = rows.find((r) => r.area)?.area as string | undefined
  const mins = rows.reduce((sum, r) => sum + Number(r.minutes), 0)
  const day: VaultDay = { ...p, id, who: p.id, prefix: rows[0].audio_prefix, days: [{ ...dayLabels(rows[0].recording_date), area: area ? area[0].toUpperCase() + area.slice(1) : '', mins, doors }] }
  return { day, clips }
}

/** A rep's recordings from the same date are one day; a recording with no date stays on its own */
function groupByDay(rows: any[]): any[][] {
  const groups = new Map<string, any[]>()
  for (const r of rows) {
    const key = r.recording_date ? `${r.rep_name}|${r.recording_date}` : r.audio_prefix
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return [...groups.values()]
}

let extraDays = 0

/** One day by its audio folder, for a door the coach points at that isn't among the featured days */
export async function loadVaultDay(prefix: string, ace = false): Promise<VaultDay | null> {
  const { data: r } = await supabase.from('vault_days').select(DAY_COLUMNS).eq('audio_prefix', prefix).maybeSingle()
  if (!r || !shownFor(ace)(r)) return null
  const p = person(r.rep_name, 0)
  // Ids stay plain (the page puts them in attributes); the featured days use their position
  const { day } = toDay([r], p, `${p.id}~more${++extraDays}`, await signAll([r]))
  return day.days[0].doors.length ? day : null
}

/**
 * Every published day from vault_days_index (slabtech sql/vault-days-index-view.sql): doors come
 * without their transcripts, except doors a reel plays from, and loadVaultLines fills a day in when
 * a rep opens it. Until that view exists, only the featured days load, transcripts and all.
 */
async function vaultRows(): Promise<any[] | null> {
  const all = await supabase
    .from('vault_days_index')
    .select(DAY_COLUMNS)
    .order('recording_date', { ascending: false, nullsFirst: false })
    .limit(MAX_DAYS)
  if (!all.error) return all.data ?? []
  const featured = await supabase
    .from('vault_days')
    .select(DAY_COLUMNS)
    .eq('featured', true)
    .order('recording_date', { ascending: false, nullsFirst: false })
    .limit(MAX_DAYS)
  return featured.error ? null : featured.data ?? []
}

/** Transcripts for the doors of these recordings: prefix -> published door number -> lines */
export async function loadVaultLines(prefixes: string[]): Promise<Record<string, Record<number, any[]>>> {
  const out: Record<string, Record<number, any[]>> = {}
  if (!prefixes.length) return out
  const { data, error } = await supabase.from('vault_days').select('audio_prefix, doors').in('audio_prefix', prefixes)
  if (error) throw new Error('That day could not load')
  for (const r of data ?? []) {
    out[r.audio_prefix] = {}
    for (const d of (r.doors as any[]) ?? []) out[r.audio_prefix][d.n] = d.lines ?? []
  }
  return out
}

export async function loadVault(ace = false): Promise<VaultData | null> {
  const rows = await vaultRows()
  const keep = (rows ?? []).filter(shownFor(ace))
  if (!keep.length) return null

  const url = await signAll(keep)
  const people: VaultPerson[] = []
  const reps: VaultData['reps'] = []
  const clips: any[] = []
  groupByDay(keep).forEach((group, i) => {
    const base = person(group[0].rep_name, people.length)
    let p = people.find((x) => x.id === base.id)
    if (!p) people.push((p = base))
    const got = toDay(group, p, `${p.id}~${i}`, url)
    reps.push(got.day)
    clips.push(...got.clips)
  })
  const days = reps.filter((r) => r.days[0].doors.length)
  if (!days.length) return null
  const best = days.slice().sort((a, b) => sales(b) - sales(a))[0]
  return { people, reps: days, clips: clips.filter((c) => days.some((d) => d.id === c.rep)), start: best.id }
}

const sales = (r: { days: any[] }) => r.days[0].doors.filter((d: any) => d.kind === 'sale').length
