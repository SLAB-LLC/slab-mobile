import { useEffect } from 'react'
import { AppState } from 'react-native'
import * as Updates from 'expo-updates'

/**
 * Applies over-the-air updates right away: checks when the app opens and whenever it comes back to the
 * foreground, downloads, and restarts into the new version. Without this an update only lands on the
 * launch after the one that downloaded it.
 */
export function useOtaUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return
    let busy = false
    const check = async () => {
      if (busy) return
      busy = true
      try {
        const res = await Updates.checkForUpdateAsync()
        if (res.isAvailable) {
          await Updates.fetchUpdateAsync()
          await Updates.reloadAsync()
        }
      } catch {
        // Offline or the update server is down: keep running what's here
      } finally {
        busy = false
      }
    }
    check()
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check()
    })
    return () => sub.remove()
  }, [])
}
