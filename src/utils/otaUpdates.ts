import { useEffect } from 'react'
import { AppState } from 'react-native'
import * as Updates from 'expo-updates'

/** What the last update check did, shown with the build code so a tester can tell why an update didn't land */
let lastStatus = 'not checked'
export function otaStatus(): string {
  const id = (Updates.updateId || 'embedded').slice(0, 8)
  const parts = [id, Updates.channel || 'no channel', Updates.runtimeVersion || 'no runtime']
  if (!Updates.isEnabled) parts.push('updates off')
  parts.push(lastStatus)
  return parts.join(' · ')
}

/**
 * Applies over-the-air updates right away: checks when the app opens and whenever it comes back to the
 * foreground, downloads, and restarts into the new version. Without this an update only lands on the
 * launch after the one that downloaded it.
 */
export function useOtaUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) {
      lastStatus = __DEV__ ? 'dev' : 'disabled'
      return
    }
    let busy = false
    const check = async () => {
      if (busy) return
      busy = true
      try {
        lastStatus = 'checking'
        const res = await Updates.checkForUpdateAsync()
        if (res.isAvailable) {
          lastStatus = 'downloading'
          const got = await Updates.fetchUpdateAsync()
          lastStatus = got.isNew ? 'restarting' : 'fetched, not new'
          if (got.isNew) await Updates.reloadAsync()
        } else {
          lastStatus = `up to date${(res as any).reason ? ` (${(res as any).reason})` : ''}`
        }
      } catch (err: any) {
        // Offline or the update server is down: keep running what's here
        lastStatus = `error: ${String(err?.message || err).slice(0, 80)}`
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
