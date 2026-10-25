import { Platform } from 'react-native'
import { supabase } from '../utils/supabase'

let currentSessionId: string | null = null
let startingPromise: Promise<string | null> | null = null
let audioPlaying = false
let currentRoute = 'Home'

// Read by the app-wide heartbeat so each ping says what the user is doing and where
export function setAudioPlaying(playing: boolean) {
  audioPlaying = playing
}

export function isAudioPlaying(): boolean {
  return audioPlaying
}

export function setCurrentRoute(name: string | undefined) {
  if (name) currentRoute = name
}

export function getCurrentRoute(): string {
  return currentRoute
}

export function getSessionId(): string | null {
  return currentSessionId
}

/**
 * Create a real user_sessions row via the start_user_session RPC and cache the UUID.
 * Safe to call repeatedly — concurrent callers share the same in-flight promise,
 * and if a session is already active we just return it.
 */
export async function startSession(userId: string): Promise<string | null> {
  if (currentSessionId) return currentSessionId
  if (startingPromise) return startingPromise

  startingPromise = (async () => {
    try {
      const { data, error } = await supabase.rpc('start_user_session', {
        p_user_id: userId,
        p_ip_address: null,
        p_user_agent: `SLAB-mobile/${Platform.OS}`,
      })
      if (error) {
        console.warn('start_user_session failed:', error.message)
        return null
      }
      currentSessionId = data as string
      return currentSessionId
    } finally {
      startingPromise = null
    }
  })()

  return startingPromise
}

export async function endSession(): Promise<void> {
  const sessionId = currentSessionId
  currentSessionId = null
  if (!sessionId) return
  try {
    const { error } = await supabase.rpc('end_user_session', {
      p_session_id: sessionId,
    })
    if (error) console.warn('end_user_session failed:', error.message)
  } catch (err) {
    console.warn('end_user_session threw:', err)
  }
}
