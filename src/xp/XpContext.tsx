import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import { useAuth } from '../context/AuthContext'
import { useFeatures } from '../tenant'
import { grantXp, getMyXpTotals, XpReason, XpTotals } from '../services/xp.service'
import { getStreak } from '../services/streak.service'
import { isPowerHour, liveStreakDays, streakMultiplier, hourLabel } from './progress'
import XpToast, { ToastItem } from './XpToast'

const POWER_HOUR_NOTIFICATION_ID = 'slab-power-hour'

interface AwardOptions {
  /** Skip the toast (still bumps the total), for frequent grants like listening minutes */
  quiet?: boolean
}

interface XpContextType {
  totalXp: number
  monthXp: number
  weekXp: number
  streakDays: number
  /** Streak multiplier only (power hour is separate) */
  streakMult: number
  powerHourActive: boolean
  /** Ask the server for XP. Resolves to the XP actually granted (0 if none). */
  award: (reason: XpReason, sourceId: string | null, label: string, options?: AwardOptions) => Promise<number>
  /** Show a short message in the XP toast */
  toast: (text: string) => void
  refreshXp: () => Promise<void>
}

const XpContext = createContext<XpContextType | undefined>(undefined)

export function XpProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const features = useFeatures()
  const userId = user?.id ?? null

  const [totals, setTotals] = useState<XpTotals>({ total_xp: 0, month_xp: 0, week_xp: 0 })
  const [streakDays, setStreakDays] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)
  const warnedRef = useRef(false)
  const totalRef = useRef(0)
  totalRef.current = totals.total_xp

  const toast = useCallback((text: string) => {
    setToasts((prev) => [...prev, { id: ++toastId.current, text }])
  }, [])

  const refreshXp = useCallback(async () => {
    if (!userId) return
    try {
      const [t, s] = await Promise.all([getMyXpTotals(userId), getStreak(userId)])
      setTotals(t)
      setStreakDays(s ? liveStreakDays(s.current_streak, s.last_activity_date) : 0)
    } catch (err: any) {
      if (!warnedRef.current) {
        warnedRef.current = true
        console.warn('XP unavailable:', err?.message ?? err)
      }
    }
  }, [userId])

  useEffect(() => {
    setTotals({ total_xp: 0, month_xp: 0, week_xp: 0 })
    setStreakDays(0)
    refreshXp()
  }, [refreshXp])

  // Tick once a minute so power hour turns on and off on time
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  // Daily local "power hour" push, only if the rep already allows notifications
  const { enabled: phEnabled, startHour: phHour, multiplier: phMult } = features.powerHour
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      try {
        await Notifications.cancelScheduledNotificationAsync(POWER_HOUR_NOTIFICATION_ID).catch(() => {})
        if (!phEnabled || cancelled) return
        const { status } = await Notifications.getPermissionsAsync()
        if (status !== 'granted' || cancelled) return
        await Notifications.scheduleNotificationAsync({
          identifier: POWER_HOUR_NOTIFICATION_ID,
          content: {
            title: `Power hour is live ⚡`,
            body: `${phMult}x XP on everything until ${hourLabel((phHour + 1) % 24)}. Go stack it.`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: phHour,
            minute: 0,
          },
        })
      } catch (err) {
        console.warn('Could not schedule power hour:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, phEnabled, phHour, phMult])

  const award = useCallback(
    async (reason: XpReason, sourceId: string | null, label: string, options?: AwardOptions) => {
      if (!userId) return 0
      try {
        const before = totalRef.current
        const result = await grantXp(reason, sourceId)
        if (!result.granted) return 0

        setTotals((t) => ({
          total_xp: result.total,
          month_xp: t.month_xp + result.amount,
          week_xp: t.week_xp + result.amount,
        }))
        if (!options?.quiet) {
          toast(`+${result.amount} XP, ${label}${result.powerHour ? ' (power hour)' : ''}`)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
        }
        if (before < features.vaultUnlockXp && result.total >= features.vaultUnlockXp) {
          toast('The Vault is open')
        }
        if (before < features.chatUnlockXp && result.total >= features.chatUnlockXp) {
          toast('Chat unlocked')
        }
        return result.amount
      } catch (err: any) {
        if (!warnedRef.current) {
          warnedRef.current = true
          console.warn('XP grant failed:', err?.message ?? err)
        }
        return 0
      }
    },
    [userId, toast, features.vaultUnlockXp, features.chatUnlockXp]
  )

  const value: XpContextType = {
    totalXp: totals.total_xp,
    monthXp: totals.month_xp,
    weekXp: totals.week_xp,
    streakDays,
    streakMult: streakMultiplier(streakDays, features.streakTiers),
    powerHourActive: isPowerHour(features, now),
    award,
    toast,
    refreshXp,
  }

  return (
    <XpContext.Provider value={value}>
      <View style={styles.fill}>
        {children}
        {toasts.length > 0 && (
          <XpToast
            key={toasts[0].id}
            toast={toasts[0]}
            onDone={() => setToasts((prev) => prev.slice(1))}
          />
        )}
      </View>
    </XpContext.Provider>
  )
}

export function useXp() {
  const context = useContext(XpContext)
  if (!context) throw new Error('useXp must be used within an XpProvider')
  return context
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
