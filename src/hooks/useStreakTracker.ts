import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import * as streakService from '../services/streak.service'

const STREAK_THRESHOLD_SECONDS = 120 // 2 minutes of listening → log streak
const HEARTBEAT_INTERVAL_MS = 60_000 // fire heartbeat every 60s while playing

/**
 * Tracks cumulative audio listening time and:
 *  1. Logs a streak activity once the user has listened for 2+ continuous minutes.
 *  2. Fires a heartbeat every 60s (updates daily_usage_stats so the minutes chart reflects mobile listening).
 * Also supports manual triggers for transcript views and training playlists.
 */
export function useStreakTracker(transcriptId?: string) {
  const { user, profile } = useAuth()
  const cumulativeTimeRef = useRef(0)
  const lastTickRef = useRef<number | null>(null)
  const streakLoggedRef = useRef(false)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const userId = user?.id
  const companyId = profile?.company_id

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }, [])

  const startHeartbeat = useCallback(() => {
    // No-op if already running or no auth
    if (heartbeatIntervalRef.current || !userId || !companyId) return
    heartbeatIntervalRef.current = setInterval(() => {
      streakService.recordHeartbeat(userId, companyId, 'audio_playing', '/mobile/audio')
    }, HEARTBEAT_INTERVAL_MS)
  }, [userId, companyId])

  // Call this every time the audio player reports time while playing (e.g. every 250ms)
  const trackAudioTime = useCallback(() => {
    if (!userId || !companyId) return

    // Ensure heartbeat is running
    startHeartbeat()

    const now = Date.now()
    if (lastTickRef.current !== null && !streakLoggedRef.current) {
      const delta = (now - lastTickRef.current) / 1000
      // Only count if delta is reasonable (< 2s to avoid big jumps from pausing/seeking)
      if (delta > 0 && delta < 2) {
        cumulativeTimeRef.current += delta
      }
      if (cumulativeTimeRef.current >= STREAK_THRESHOLD_SECONDS) {
        streakLoggedRef.current = true
        streakService.logStreakActivity(userId, companyId, transcriptId, 'audio_listen')
        streakService.logActivityEvent(userId, companyId, {
          event_type: 'audio_complete',
          event_data: { listened_seconds: Math.round(cumulativeTimeRef.current) },
          transcript_id: transcriptId,
        })
      }
    }
    lastTickRef.current = now
  }, [userId, companyId, transcriptId, startHeartbeat])

  // Call when audio pauses to stop accumulating time and pause the heartbeat
  const onPause = useCallback(() => {
    lastTickRef.current = null
    stopHeartbeat()
  }, [stopHeartbeat])

  // Manual trigger for transcript view activity
  const logTranscriptView = useCallback(() => {
    if (!userId || !companyId) return
    streakService.logStreakActivity(userId, companyId, transcriptId, 'transcript_view')
    streakService.logActivityEvent(userId, companyId, {
      event_type: 'transcript_view',
      transcript_id: transcriptId,
    })
  }, [userId, companyId, transcriptId])

  // Manual trigger for training playlist activity
  const logTrainingActivity = useCallback(() => {
    if (!userId || !companyId) return
    streakService.logStreakActivity(userId, companyId, undefined, 'training_view')
    streakService.logActivityEvent(userId, companyId, {
      event_type: 'page_view',
      event_data: { page: 'training' },
    })
  }, [userId, companyId])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cumulativeTimeRef.current = 0
      lastTickRef.current = null
      stopHeartbeat()
    }
  }, [stopHeartbeat])

  return { trackAudioTime, onPause, logTranscriptView, logTrainingActivity }
}
