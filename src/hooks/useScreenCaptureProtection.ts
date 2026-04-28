import { useEffect, useRef } from 'react'
import { Alert, Platform } from 'react-native'
import * as ScreenCapture from 'expo-screen-capture'
import {
  addCapturedChangeListener,
  isCurrentlyCapturing,
} from '../modules/screenRecordingDetector'

/**
 * Protects content from screen capture and pauses audio when recording is detected.
 *
 * Visual protection:
 *   Android — FLAG_SECURE: screen appears black in all screen recorders/screenshots.
 *   iOS     — Secure overlay: content appears blank during recordings (iOS 17+).
 *
 * Audio protection (iOS):
 *   Listens for UIScreen.capturedDidChangeNotification via the native
 *   ScreenRecordingDetector module. When screen recording starts, calls
 *   `onRecordingStart` so the caller can immediately pause playback.
 *
 * Screenshot alert (iOS):
 *   Shows an alert informing the user screenshots are not permitted.
 *
 * @param isActive         Enable protection while true, release when false.
 * @param onRecordingStart Called the moment screen recording is detected (iOS).
 *                         Pass your player's pause function here.
 */
export function useScreenCaptureProtection(
  isActive: boolean,
  onRecordingStart?: () => void
) {
  // Stable ref so we never need to re-subscribe when the callback identity changes
  const onRecordingStartRef = useRef(onRecordingStart)
  useEffect(() => {
    onRecordingStartRef.current = onRecordingStart
  }, [onRecordingStart])

  useEffect(() => {
    if (!isActive) return

    // Blank the screen in any capture tool
    ScreenCapture.preventScreenCaptureAsync().catch(() => {})

    // iOS: alert on screenshot attempts
    let screenshotSub: ReturnType<typeof ScreenCapture.addScreenshotListener> | null = null
    if (Platform.OS === 'ios') {
      screenshotSub = ScreenCapture.addScreenshotListener(() => {
        Alert.alert(
          'Content Protected',
          'Screenshots of this content are not permitted.',
          [{ text: 'OK' }]
        )
      })
    }

    // iOS: pause audio the moment screen recording starts (fast path via native event)
    const recordingSub = addCapturedChangeListener((event) => {
      if (event.isCaptured) {
        onRecordingStartRef.current?.()
      }
    })

    // iOS polling fallback — runs in case the native event isn't delivered.
    // 500 ms is fast enough that almost no audio leaks before pause.
    let pollInterval: ReturnType<typeof setInterval> | null = null
    if (Platform.OS === 'ios') {
      pollInterval = setInterval(async () => {
        if (await isCurrentlyCapturing()) {
          onRecordingStartRef.current?.()
        }
      }, 500)
    }

    return () => {
      screenshotSub?.remove()
      recordingSub?.remove()
      if (pollInterval) clearInterval(pollInterval)
      ScreenCapture.allowScreenCaptureAsync().catch(() => {})
    }
  }, [isActive])
}
