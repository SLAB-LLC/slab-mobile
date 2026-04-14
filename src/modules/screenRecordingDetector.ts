/**
 * JS interface to the ScreenRecordingDetector native module (iOS only).
 *
 * On iOS, the module listens for UIScreen.capturedDidChangeNotification and
 * emits an `onCapturedChange` event with `{ isCaptured: boolean }`.
 *
 * On Android, FLAG_SECURE (set by expo-screen-capture) is the primary
 * protection — this module is not loaded on that platform.
 *
 * Note: In Expo SDK 52+, requireNativeModule returns an object that is itself
 * an EventEmitter — no EventEmitter wrapper is needed.
 */

import { Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo-modules-core'

type CapturedChangeEvent = {
  isCaptured: boolean
}

type EventSubscription = {
  remove: () => void
}

// Shape of the native module as returned by requireOptionalNativeModule
type ScreenRecordingDetectorModule = {
  isCaptured: () => Promise<boolean>
  addListener: (
    eventName: string,
    listener: (event: CapturedChangeEvent) => void
  ) => EventSubscription
}

// Only load on iOS — the module doesn't exist on Android
const nativeModule: ScreenRecordingDetectorModule | null =
  Platform.OS === 'ios'
    ? (requireOptionalNativeModule('ScreenRecordingDetector') as ScreenRecordingDetectorModule | null)
    : null

/**
 * Subscribe to screen recording state changes.
 * Returns null when the native module is unavailable (non-iOS or Expo Go).
 */
export function addCapturedChangeListener(
  listener: (event: CapturedChangeEvent) => void
): EventSubscription | null {
  return nativeModule?.addListener('onCapturedChange', listener) ?? null
}

/**
 * One-shot check: is the screen currently being captured?
 */
export async function isCurrentlyCapturing(): Promise<boolean> {
  if (!nativeModule) return false
  try {
    return await nativeModule.isCaptured()
  } catch {
    return false
  }
}
