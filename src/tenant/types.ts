/**
 * Tenant (per-company) app configuration.
 *
 * Every company that uses SLAB gets one row in `company_app_config`. The app
 * deep-merges that row over DEFAULT_TENANT_CONFIG, so a company only stores
 * what differs from SLAB's own look and rules.
 */

export type AppStyle = 'game' | 'simple'

export interface TenantColors {
  /** Screen background (flat) */
  background: string
  /** Screen background gradient stops, top to bottom */
  backgroundGradient: [string, string, string]
  /** Cards and sheets on top of the background */
  surface: string
  /** Raised surfaces (pressed cards, inputs) */
  surfaceRaised: string
  /** Brand accent: active tab, XP, buttons */
  accent: string
  /** Translucent accent for fills behind accent text */
  accentSoft: string
  /** Hairline borders in the accent color */
  accentLine: string
  /** Text drawn on top of the accent color */
  onAccent: string
  text: string
  textMuted: string
  header: string
  tabBar: string
  danger: string
  success: string
}

export interface TenantTheme {
  /** Name shown in the app, e.g. "SLAB" */
  brandName: string
  /** Optional co-brand line, e.g. "SLAB x ACE" */
  cobrand: string | null
  logoUrl: string | null
  wordmarkUrl: string | null
  /** Status bar content over the header */
  statusBar: 'light' | 'dark'
  colors: TenantColors
  /**
   * How reps' pixel gear is branded. Nulls fall back to the brand name, its
   * first letters and the accent color.
   */
  gear: {
    /** Word in gear names, e.g. "Ace" in "Ace hoodie" */
    name: string | null
    /** Up to 4 letters printed across the back of tees, hoodies and varsities */
    letters: string | null
    /** Logo/trim color */
    primary: string | null
    /** Dark base color of branded gear */
    dark: string
  }
  /** The AI/hype coach reps chat with */
  coach: { name: string; avatarUrl: string | null }
  /** Default app style for reps of this company; reps may switch */
  appStyle: AppStyle
}

export interface StreakTier {
  days: number
  mult: number
}

export interface TenantFeatures {
  street: boolean
  vault: boolean
  vaultUnlockXp: number
  chatUnlockXp: number
  aiCoach: boolean
  rides: boolean
  bossFights: boolean
  bookTests: boolean
  rookieVet: boolean
  monthlyPrize: boolean
  powerHour: { enabled: boolean; startHour: number; multiplier: number }
  streakTiers: StreakTier[]
  xp: {
    lesson: number
    askCoach: number
    askCoachDailyCap: number
    book: number
    bossFirstWin: number
    bossRematch: number
    vaultPerMinute: number
    vaultDailyCap: number
    libraryFirstOpen: number
  }
}

export type TabKey = 'lab' | 'vault' | 'chat' | 'leaderboard' | 'library'

export interface TenantLabels {
  tabs: Record<TabKey, string>
}

export interface TenantConfig {
  theme: TenantTheme
  features: TenantFeatures
  labels: TenantLabels
}

/** Any subset of a config, as stored in the database */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export type TenantConfigOverride = DeepPartial<TenantConfig>

/** Row shape of the `company_app_config` table */
export interface CompanyAppConfigRow {
  company_id: string
  theme: DeepPartial<TenantTheme> | null
  features: DeepPartial<TenantFeatures> | null
  labels: DeepPartial<TenantLabels> | null
  updated_at: string
}
