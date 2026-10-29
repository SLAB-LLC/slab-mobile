import type { TenantConfig } from './types'

/**
 * SLAB's own look and rules. Used as-is for reps with no company and for
 * companies with no `company_app_config` row, and as the base every row is
 * merged over. SLAB's colors are orange, black and white (the website's
 * orange, #F4711E).
 */
export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  theme: {
    brandName: 'SLAB',
    cobrand: null,
    logoUrl: null,
    wordmarkUrl: null,
    statusBar: 'light',
    colors: {
      background: '#000000',
      backgroundGradient: ['#000000', '#0b0b0b', '#141414'],
      surface: 'rgba(255,255,255,0.06)',
      surfaceRaised: 'rgba(255,255,255,0.12)',
      accent: '#F4711E',
      accentSoft: 'rgba(244,113,30,0.15)',
      accentLine: 'rgba(244,113,30,0.25)',
      onAccent: '#000000',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.55)',
      header: '#000000',
      tabBar: '#000000',
      danger: '#EF4444',
      success: '#10B981',
    },
    gear: { name: null, letters: null, primary: null, dark: '#1b1b20' },
    coach: { name: 'Marshall', avatarUrl: null },
    appStyle: 'game',
  },
  features: {
    street: true,
    vault: true,
    vaultUnlockXp: 500,
    chatUnlockXp: 0,
    aiCoach: true,
    rides: true,
    bossFights: true,
    bookTests: true,
    rookieVet: true,
    monthlyPrize: false,
    companyLessons: false,
    powerHour: { enabled: true, startHour: 20, multiplier: 2 },
    streakTiers: [
      { days: 0, mult: 1 },
      { days: 5, mult: 1.25 },
      { days: 15, mult: 1.5 },
      { days: 30, mult: 2 },
    ],
    // Keep in sync with the fallbacks in slabtech sql/xp-engine-migration.sql
    xp: {
      lesson: 15,
      askCoach: 8,
      askCoachDailyCap: 40,
      book: 50,
      bossFirstWin: 40,
      bossRematch: 10,
      vaultPerMinute: 5,
      vaultDailyCap: 300,
      libraryFirstOpen: 5,
    },
  },
  labels: {
    tabs: {
      lab: 'The Lab',
      vault: 'The Vault',
      chat: 'Chat',
      leaderboard: 'Leaderboard',
      library: 'Library',
    },
  },
}

/**
 * Every account needs a company, so reps who aren't with one live in SLAB's own house company.
 * The app treats that company as no company at all: solo mode, SLAB colors, company features locked.
 */
export const SOLO_COMPANY_SLUG = 'slab-internal'
