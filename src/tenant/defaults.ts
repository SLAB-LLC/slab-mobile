import type { TenantConfig } from './types'

/**
 * SLAB's own look and rules. Used as-is for companies with no
 * `company_app_config` row, and as the base every row is merged over.
 * Colors match the app's original navy and gold so existing companies see
 * no change until they are configured.
 */
export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  theme: {
    brandName: 'SLAB',
    cobrand: null,
    logoUrl: null,
    wordmarkUrl: null,
    statusBar: 'light',
    colors: {
      background: '#000033',
      backgroundGradient: ['#000033', '#001155', '#0a1a5f'],
      surface: 'rgba(255,255,255,0.06)',
      surfaceRaised: 'rgba(255,255,255,0.12)',
      accent: '#f39c12',
      accentSoft: 'rgba(243,156,18,0.15)',
      accentLine: 'rgba(243,156,18,0.2)',
      onAccent: '#000000',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.5)',
      header: '#0a1a5f',
      tabBar: '#0a1a5f',
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
