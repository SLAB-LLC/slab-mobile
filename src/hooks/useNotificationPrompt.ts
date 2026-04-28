import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'

const LAST_SHOWN_KEY = '@slab/notification_prompt_last_shown'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * Decides whether to show the in-app notification prompt.
 *
 * Rules:
 *   - Never on web.
 *   - Never if iOS/Android has already granted permission (token registers silently elsewhere).
 *   - Never if iOS/Android has already denied AND the OS won't re-prompt (canAskAgain=false) —
 *     in that case we bail; user has to enable from system Settings.
 *   - Otherwise, show at most once per calendar day, tracked in AsyncStorage.
 *
 * The hook returns { shouldShow, dismissForToday, markAccepted } so the caller can drive UI.
 */
export function useNotificationPrompt(authReady: boolean) {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (!authReady) return
    if (Platform.OS === 'web') return

    let cancelled = false

    ;(async () => {
      try {
        const perm = await Notifications.getPermissionsAsync()

        // Already granted — never show
        if (perm.status === 'granted') {
          if (!cancelled) setShouldShow(false)
          return
        }

        // Denied + can't ask again — system dialog won't reappear; pointless to nag
        if (perm.status === 'denied' && perm.canAskAgain === false) {
          if (!cancelled) setShouldShow(false)
          return
        }

        // Show at most once per day
        const lastShown = await AsyncStorage.getItem(LAST_SHOWN_KEY)
        if (lastShown === todayKey()) {
          if (!cancelled) setShouldShow(false)
          return
        }

        if (!cancelled) setShouldShow(true)
      } catch {
        // If anything goes wrong, don't block the user
        if (!cancelled) setShouldShow(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authReady])

  /**
   * Called when the user taps "Maybe Later" — record today's date so we
   * don't ask again until tomorrow.
   */
  const dismissForToday = async () => {
    setShouldShow(false)
    try {
      await AsyncStorage.setItem(LAST_SHOWN_KEY, todayKey())
    } catch {
      // ignore
    }
  }

  /**
   * Called after user accepts and the OS dialog has been answered (granted or not).
   * If granted, hide forever. If not, treat like dismissForToday.
   */
  const markAccepted = async () => {
    setShouldShow(false)
    try {
      await AsyncStorage.setItem(LAST_SHOWN_KEY, todayKey())
    } catch {
      // ignore
    }
  }

  return { shouldShow, dismissForToday, markAccepted }
}
