import * as Notifications from 'expo-notifications'
import { supabase } from '../utils/supabase'
import { getNotificationPreferences } from '../services/notifications.service'
import { getCompanyLeaderboard } from '../services/stats.service'
import * as avatarService from '../services/avatar.service'
import type { TenantFeatures, TenantTheme } from '../tenant'
import type { Company, UserProfile } from '../types'
import type { RepLook } from '../avatar'
import { gearBrand } from '../avatar'
import { loadVault, VaultData } from './vault'

/**
 * Builds window.SLAB_APP, the data the game page (assets/game/game.html, built by
 * tools/game/build.py) starts from. Shapes match what the demo's code expects.
 */

export interface GameQuizItem {
  q: string
  o: string[]
  a: number
  e: string
}

export interface GameLesson {
  id: string
  title: string
  description: string | null
  status: 'done' | 'active' | 'locked'
  video: { type: 'youtube' | 'upload'; url: string | null; duration: number | null }
  quiz?: GameQuizItem[]
  passMark?: number
}

export interface GameUnit {
  title: string
  meta: string
  subs: GameLesson[]
}

export interface GameLeader {
  name: string
  streak: number
  xp: number
  you?: boolean
  look?: Partial<RepLook> | null
}

export interface GameBoot {
  me: {
    id: string
    name: string
    email: string | null
    xp: number
    streakDays: number
    roleLabel: string
    role: 'rep' | 'manager' | 'owner'
    level: 'rookie' | 'vet'
    companyName: string | null
    look: Partial<RepLook> | null
  }
  features: { vaultUnlockXp: number; chatUnlockXp: number; monthlyPrize: boolean; companyLessons: boolean }
  brand: {
    cobrand: string
    accent: string
    isAce: boolean
    logoUrl: string | null
    gear: { name: string; letters: string; primary: string; dark: string }
  }
  /** Base URL for the Vault's audio pack (ends with /), or null when it isn't hosted yet */
  media: string | null
  /** Published days for the Vault (the pipeline's vault_days), or null to keep the pack in the app */
  vault: VaultData | null
  /** Which update the phone runs, shown under Sign out */
  build: string
  /** False when the company has no training of its own yet: every door on the street stays locked */
  labOpen: boolean
  /** The company's own lessons (only when features.companyLessons); otherwise the street keeps the standard levels */
  lessons: GameUnit[]
  /** Lessons the rep has finished, by the source id their XP was granted under */
  doneLessons: string[]
  leaders: GameLeader[]
  /** Marshall's videos for his page in the Vault (Ace's training videos), grouped by playlist */
  vaultVideos: { title: string; videos: { id: string; title: string; duration: number | null }[] }[]
  /** The owner's Training tab settings, or null for the defaults */
  training: Record<string, unknown> | null
  /** The profile's notification switches: push is on when this phone has permission */
  notif: { push: boolean; company: boolean; platform: boolean; chat: boolean; streak: boolean }
}

/** Lesson id -> where its video lives, kept natively so signed URLs are made on demand */
export type VideoIndex = Record<string, { type: 'youtube' | 'upload'; youtubeUrl?: string | null; storagePath?: string | null }>

/** Sampled from the Ace logo */
const ACE_GOLD = '#daae5d'

const ROLE_LABELS: Record<UserProfile['role'], string> = {
  user: 'Rep',
  manager: 'Manager',
  company_admin: 'Owner',
  // SLAB admins own every company
  super_admin: 'Owner · SLAB admin',
}

/** The page's three views: rep, manager, owner */
const PAGE_ROLES: Record<UserProfile['role'], 'rep' | 'manager' | 'owner'> = {
  user: 'rep',
  manager: 'manager',
  company_admin: 'owner',
  super_admin: 'owner',
}

/** Ace runs its own library and prize; matched the same way the SQL seed matches it */
export const isAceCompany = (company: Company | null) =>
  !!company && (/^ace/i.test(company.slug || '') || /^ace/i.test(company.name || ''))

/** Turns any YouTube link into an embeddable player URL */
export function youtubeEmbedUrl(url: string): string | null {
  const m =
    url.match(/[?&]v=([\w-]{6,})/) ||
    url.match(/youtu\.be\/([\w-]{6,})/) ||
    url.match(/youtube\.com\/(?:shorts|embed|live)\/([\w-]{6,})/)
  return m ? `https://www.youtube.com/embed/${m[1]}?playsinline=1&rel=0&modestbranding=1` : null
}

const LETTER_IDX = ['A', 'B', 'C', 'D']

/** The company's training as units of lessons: playlists in order, then anything not in a playlist */
async function loadLessons(companyId: string, userId: string): Promise<{ units: GameUnit[]; videos: VideoIndex }> {
  const [videosRes, playlistsRes, completionsRes] = await Promise.all([
    supabase.from('training_videos').select('*').eq('company_id', companyId).order('created_at', { ascending: true }),
    supabase.from('training_playlists').select('id, name, created_at').eq('company_id', companyId).order('created_at', { ascending: true }),
    supabase.from('video_completions').select('video_id').eq('user_id', userId),
  ])
  const videos = (videosRes.data ?? []) as any[]
  if (!videos.length) return { units: [], videos: {} }

  const playlists = (playlistsRes.data ?? []) as any[]
  const done = new Set(((completionsRes.data ?? []) as any[]).map((c) => c.video_id))
  const videoIds = videos.map((v) => v.id)

  const [linksRes, questionsRes, settingsRes] = await Promise.all([
    playlists.length
      ? supabase.from('playlist_videos').select('playlist_id, video_id, position').in('playlist_id', playlists.map((p) => p.id)).order('position', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('video_quiz_questions').select('*').in('video_id', videoIds).order('position', { ascending: true }),
    supabase.from('video_quiz_settings').select('video_id, passing_score').in('video_id', videoIds),
  ])

  const questionsByVideo = new Map<string, GameQuizItem[]>()
  for (const q of (questionsRes.data ?? []) as any[]) {
    const list = questionsByVideo.get(q.video_id) ?? []
    list.push({
      q: q.question_text,
      o: [q.option_a, q.option_b, q.option_c, q.option_d],
      a: Math.max(0, LETTER_IDX.indexOf(q.correct_answer)),
      e: '',
    })
    questionsByVideo.set(q.video_id, list)
  }
  const passScore = new Map<string, number>(((settingsRes.data ?? []) as any[]).map((s) => [s.video_id, s.passing_score]))

  const byId = new Map(videos.map((v) => [v.id, v]))
  const index: VideoIndex = {}
  const toLesson = (v: any): GameLesson => {
    index[v.id] = { type: v.video_type, youtubeUrl: v.youtube_url, storagePath: v.storage_path }
    const quiz = questionsByVideo.get(v.id)
    const lesson: GameLesson = {
      id: v.id,
      title: v.title,
      description: v.description ?? null,
      status: done.has(v.id) ? 'done' : 'locked',
      video: {
        type: v.video_type,
        url: v.video_type === 'youtube' && v.youtube_url ? youtubeEmbedUrl(v.youtube_url) : null,
        duration: v.duration ?? null,
      },
    }
    if (quiz?.length) {
      lesson.quiz = quiz
      lesson.passMark = Math.max(1, Math.ceil((quiz.length * (passScore.get(v.id) ?? 67)) / 100))
    }
    return lesson
  }

  const units: GameUnit[] = []
  const placed = new Set<string>()
  for (const p of playlists) {
    const subs = ((linksRes.data ?? []) as any[])
      .filter((l) => l.playlist_id === p.id && byId.has(l.video_id) && !placed.has(l.video_id))
      .map((l) => {
        placed.add(l.video_id)
        return toLesson(byId.get(l.video_id))
      })
    if (subs.length) units.push({ title: p.name, meta: '', subs })
  }
  const loose = videos.filter((v) => !placed.has(v.id)).map(toLesson)
  if (loose.length) units.push({ title: units.length ? 'More lessons' : 'Lessons', meta: '', subs: loose })

  // One path: everything done stays done, the first lesson left is up next, the rest wait their turn
  let activeSet = false
  for (const u of units) {
    u.meta = `${u.subs.length} lesson${u.subs.length === 1 ? '' : 's'}`
    for (const s of u.subs) {
      if (s.status === 'done') continue
      s.status = activeSet ? 'locked' : 'active'
      activeSet = true
    }
  }
  return { units, videos: index }
}

/** Every lesson the rep has been paid XP for; the standard levels are granted under their titles */
async function loadDoneLessons(userId: string): Promise<string[]> {
  const { data } = await supabase.from('xp_events').select('source_id').eq('user_id', userId).eq('reason', 'lesson_complete')
  return ((data ?? []) as any[]).map((r) => r.source_id).filter(Boolean)
}

/** Company reps ranked by total XP, with their saved looks */
async function loadLeaders(companyId: string, me: { id: string; name: string; xp: number; streak: number }): Promise<GameLeader[]> {
  const [board, xpRes] = await Promise.all([
    getCompanyLeaderboard(companyId),
    supabase.from('user_xp_totals').select('user_id, total_xp').eq('company_id', companyId),
  ])
  const xpBy = new Map(((xpRes.data ?? []) as any[]).map((r) => [r.user_id, r.total_xp as number]))
  const ids = Array.from(new Set([...board.map((b) => b.user_id), ...xpBy.keys()]))
  const looks = await avatarService.getLooks(ids).catch(() => ({} as Record<string, Partial<RepLook>>))

  const leaders: GameLeader[] = []
  const seen = new Set<string>()
  for (const b of board) {
    if (b.user_id === me.id || seen.has(b.user_id)) continue
    seen.add(b.user_id)
    leaders.push({
      name: b.display_name || (b.email ? b.email.split('@')[0] : 'Rep'),
      streak: b.current_streak ?? 0,
      xp: xpBy.get(b.user_id) ?? 0,
      look: looks[b.user_id] ?? null,
    })
  }
  // The top reps, and always the rep themselves (the page needs their row even when they're far down)
  const top = leaders.sort((a, b) => b.xp - a.xp).slice(0, 29)
  return [...top, { name: me.name, streak: me.streak, xp: me.xp, you: true }]
}

async function loadNotif(userId: string): Promise<GameBoot['notif']> {
  const [perm, prefs] = await Promise.all([
    Notifications.getPermissionsAsync().catch(() => null),
    getNotificationPreferences(userId).catch(() => null),
  ])
  return {
    push: perm?.status === 'granted',
    company: prefs?.company_alerts ?? true,
    platform: prefs?.updates ?? true,
    chat: prefs?.chats ?? true,
    streak: prefs?.streak_reminders ?? false,
  }
}

export async function buildGameBoot(args: {
  userId: string
  email: string | null
  profile: UserProfile | null
  company: Company | null
  theme: TenantTheme
  features: TenantFeatures
  totalXp: number
  streakDays: number
  look: Partial<RepLook> | null
  media: string | null
  build: string
}): Promise<{ boot: GameBoot; videos: VideoIndex }> {
  const { userId, email, profile, company, theme, features } = args
  const name = profile?.display_name || profile?.full_name || (email ? email.split('@')[0] : 'Rep')
  const ace = isAceCompany(company)
  const gear = gearBrand(theme)
  const meRow: GameLeader = { name, streak: args.streakDays, xp: args.totalXp, you: true }

  const [lessons, leaders, doneLessons, notif, vault] = await Promise.all([
    // Ace's training videos are Marshall's: they play from his page in the Vault even while the street runs the standard levels
    company && (features.companyLessons || ace) ? loadLessons(company.id, userId).catch(() => ({ units: [], videos: {} })) : Promise.resolve({ units: [], videos: {} }),
    company
      ? loadLeaders(company.id, { id: userId, name, xp: args.totalXp, streak: args.streakDays }).catch(() => [meRow])
      : Promise.resolve([meRow]),
    loadDoneLessons(userId).catch(() => [] as string[]),
    loadNotif(userId),
    loadVault().catch(() => null),
  ])

  return {
    videos: lessons.videos,
    boot: {
      me: {
        id: userId,
        name,
        email,
        xp: args.totalXp,
        streakDays: args.streakDays,
        roleLabel: ROLE_LABELS[profile?.role ?? 'user'] ?? 'Rep',
        role: PAGE_ROLES[profile?.role ?? 'user'] ?? 'rep',
        level: profile?.level === 'vet' ? 'vet' : 'rookie',
        companyName: company?.name ?? null,
        look: args.look,
      },
      features: {
        vaultUnlockXp: features.vaultUnlockXp,
        chatUnlockXp: features.chatUnlockXp,
        // Ace runs the monthly prize even if its config row predates the switch
        monthlyPrize: features.monthlyPrize || ace,
        companyLessons: !!features.companyLessons,
      },
      brand: {
        cobrand: theme.cobrand || theme.brandName,
        accent: theme.colors.accent,
        isAce: ace,
        logoUrl: theme.logoUrl,
        // Ace gear is always the gold of the Ace logo, whatever colors the company record carries
        gear: { name: gear.name, letters: gear.letters.join(''), primary: ace ? ACE_GOLD : gear.primary, dark: gear.dark },
      },
      media: args.media,
      vault,
      build: args.build,
      // Ace runs the standard levels; other companies open the street once their own lessons are in
      labOpen: ace || (!!features.companyLessons && lessons.units.length > 0),
      lessons: features.companyLessons ? lessons.units : [],
      vaultVideos: ace
        ? lessons.units.map((u) => ({ title: u.title, videos: u.subs.map((v) => ({ id: v.id, title: v.title, duration: v.video.duration })) }))
        : [],
      doneLessons,
      leaders,
      training: features.training ?? null,
      notif,
    },
  }
}
