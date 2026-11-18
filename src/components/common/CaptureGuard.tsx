import React, { useEffect, useMemo, useState } from 'react'
import { Alert, AppState, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import * as ScreenCapture from 'expo-screen-capture'
import { useAuth } from '../../context/AuthContext'
import { useFeatures } from '../../tenant'
import { addCapturedChangeListener, isCurrentlyCapturing } from '../../modules/screenRecordingDetector'

const KEY = 'slab-capture-guard'

/**
 * Screenshot / screen-recording protection for prospect logins: on for one person with
 * user_profiles.capture_protected, or for a whole company with features.captureProtection
 * (slabtech sql/capture-protection.sql). SLAB super admins never get it.
 *
 * - Android: FLAG_SECURE, so screenshots and recordings come out black (also the app switcher)
 * - iOS: expo-screen-capture's secure layer, so screenshots and recordings come out blank;
 *   while the screen is being recorded or mirrored the app is also covered in black
 * - both: the app is covered when it goes to the background (app switcher snapshot), and a
 *   faint watermark with the viewer's email is tiled over every screen, so a photo of the
 *   phone taken with another camera still says whose login it was
 */
export function CaptureGuard({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth()
  const features = useFeatures()
  const on =
    !!user &&
    profile?.role !== 'super_admin' &&
    (!!profile?.capture_protected || features.captureProtection === true)

  const [captured, setCaptured] = useState(false)
  const [away, setAway] = useState(false)

  useEffect(() => {
    if (!on) return
    ScreenCapture.preventScreenCaptureAsync(KEY).catch(() => {})

    const shot =
      Platform.OS === 'ios'
        ? ScreenCapture.addScreenshotListener(() =>
            Alert.alert('Content protected', 'Screenshots of SLAB are turned off for this login.')
          )
        : null
    const rec = addCapturedChangeListener((e) => setCaptured(e.isCaptured))
    isCurrentlyCapturing().then(setCaptured)
    const poll = Platform.OS === 'ios' ? setInterval(() => isCurrentlyCapturing().then(setCaptured), 1000) : null
    const app = AppState.addEventListener('change', (s) => setAway(s !== 'active'))

    return () => {
      shot?.remove()
      rec?.remove()
      if (poll) clearInterval(poll)
      app.remove()
      setCaptured(false)
      setAway(false)
      ScreenCapture.allowScreenCaptureAsync(KEY).catch(() => {})
    }
  }, [on])

  return (
    <View style={styles.fill}>
      {children}
      {on && <Watermark label={`${user?.email ?? ''} · SLAB CONFIDENTIAL`} />}
      {on && (captured || away) && (
        <View style={[StyleSheet.absoluteFill, styles.cover]}>
          <Text style={styles.coverText}>
            {captured ? 'Screen recording is turned off for this login.' : 'SLAB'}
          </Text>
        </View>
      )}
    </View>
  )
}

function Watermark({ label }: { label: string }) {
  const { width, height } = useWindowDimensions()
  const rows = useMemo(() => Array.from({ length: Math.ceil((height * 1.6) / 110) }), [height])
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.markWrap]}>
      <View style={{ width: width * 1.8, transform: [{ rotate: '-28deg' }] }}>
        {rows.map((_, i) => (
          <Text key={i} numberOfLines={1} style={[styles.mark, { marginLeft: (i % 2) * 90 }]}>
            {`${label}     ${label}     ${label}`}
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  markWrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', zIndex: 9998, elevation: 9998 },
  mark: { color: 'rgba(160,160,160,0.16)', fontSize: 13, fontWeight: '700', lineHeight: 110 },
  cover: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', zIndex: 9999, elevation: 9999, padding: 32 },
  coverText: { color: '#d4af37', fontSize: 16, fontWeight: '700', textAlign: 'center' },
})
