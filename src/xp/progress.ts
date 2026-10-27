import type { StreakTier, TenantFeatures } from '../tenant'

/** Multiplier for a streak length, from the company's streak tiers */
export function streakMultiplier(days: number, tiers: StreakTier[]): number {
  return tiers.reduce((mult, t) => (days >= t.days ? Math.max(mult, t.mult) : mult), 1)
}

/** True while the company's power hour is running on this phone's clock */
export function isPowerHour(features: TenantFeatures, now: Date = new Date()): boolean {
  return features.powerHour.enabled && now.getHours() === features.powerHour.startHour
}

/** "8 PM" style label for an hour of the day */
export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`
}

/**
 * A streak whose last active day is before yesterday is broken, even if the
 * stored count hasn't been reset yet.
 */
export function liveStreakDays(current: number, lastActivityDate: string | null, now: Date = new Date()): number {
  if (!lastActivityDate) return 0
  const [y, m, d] = lastActivityDate.split('-').map(Number)
  const last = new Date(y, m - 1, d)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysSince = Math.round((today.getTime() - last.getTime()) / 86_400_000)
  return daysSince <= 1 ? current : 0
}
