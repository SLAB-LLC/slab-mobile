import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes'
import * as Haptics from 'expo-haptics'
import { otaStatus } from '../utils/otaUpdates'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import { useTenant, useTenantTheme, useFeatures } from '../tenant'
import { useXp } from '../xp'
import { useMyLook, normalizeLook, useSpriteEngine } from '../avatar'
import type { RepLook } from '../avatar'
import { supabase } from '../utils/supabase'
import { grantXp } from '../services/xp.service'
import { markVideoComplete } from '../services/training.service'
import { askCoachWithClips, isCoachConnected } from '../services/coach.service'
import { loadVaultDay, loadVaultLines } from './vault'
import { startListening, stopListening } from './voice'
import { buildGameBoot, isAceCompany, VideoIndex, youtubeEmbedUrl } from './boot'
import { prepareGameFiles } from './files'
import * as owner from './owner'
import * as notifs from '../services/notifications.service'
import { applyAppIcon, companyIconName } from '../utils/appIcon'
import { useLaunchCurtain } from '../launch/LaunchCurtain'

/** Optional remote home for the Vault audio (ending in /); by default it plays from the copy in the app */
const MEDIA_URL = process.env.EXPO_PUBLIC_VAULT_MEDIA_URL || null

const HAPTICS: Record<string, () => Promise<void>> = {
  tap: () => Haptics.selectionAsync(),
  right: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  wrong: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  hit: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  big: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
}

/** The page's notification switches -> notification_preferences columns */
const NOTIF_COLUMNS: Record<string, keyof notifs.NotificationPreferences> = {
  company: 'company_alerts',
  platform: 'updates',
  chat: 'chats',
  streak: 'streak_reminders',
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The game: the Ace x SLAB demo running in a web view (assets/game/game.html, built from the demo by
 * tools/game/build.py), started with the rep's real data and answering its requests natively:
 * XP grants, lesson videos, Ask Marshall, saving the rep, settings.
 */
export default function GameScreen() {
  const navigation = useNavigation<any>()
  const { user, profile, company, signOut, refreshProfile } = useAuth()
  const theme = useTenantTheme()
  const features = useFeatures()
  const { ready: tenantReady } = useTenant()
  const { totalXp, streakDays, xpLoaded, refreshXp } = useXp()
  const { look, hasLook, saveLook } = useMyLook()
  const engine = useSpriteEngine()

  const insets = useSafeAreaInsets()
  const webRef = useRef<WebView>(null)
  const videosRef = useRef<VideoIndex>({})
  const [pageUri, setPageUri] = useState<string | null>(null)
  const [dirUri, setDirUri] = useState<string | null>(null)
  const [bootScript, setBootScript] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const curtain = useLaunchCurtain()

  // The page and the Vault pack ship inside the app (and with each over-the-air update)
  useEffect(() => {
    prepareGameFiles()
      .then(({ pageUri: page, dirUri: dir }) => {
        setDirUri(dir)
        setPageUri(page)
      })
      .catch((err) => setFailed(String(err?.message || err)))
  }, [])

  // Start data, built once per sign-in (and per company a SLAB admin switches to) after XP and the
  // rep's look are known
  const ready = !!user?.id && xpLoaded && hasLook !== null && tenantReady
  const bootFor = useRef<string | null>(null)
  const bootKey = `${user?.id}:${company?.id ?? 'none'}`
  useEffect(() => {
    if (!ready || !user?.id || bootFor.current === bootKey) return
    bootFor.current = bootKey
    buildGameBoot({
      userId: user.id,
      email: user.email ?? null,
      profile,
      company,
      theme,
      features,
      totalXp,
      streakDays,
      look: hasLook ? look : null,
      media: MEDIA_URL,
      build: otaStatus(),
    })
      .then(({ boot, videos }) => {
        videosRef.current = videos
        // </script> can't appear inside the injected JSON, so escape "<"
        setBootScript(`window.SLAB_APP = ${JSON.stringify({ ...boot, nativeCurtain: true }).replace(/</g, '\\u003c')}; true;`)
      })
      .catch((err) => setFailed(String(err?.message || err)))
  }, [ready, bootKey])

  // SLAB × the company stays up while the page is built and loads (on launch, after signing in, and when
  // a SLAB admin switches company); the page says when it has painted ('ready') and the curtain parts.
  // tools/game/bridge.js skips the page's own opening when APP.nativeCurtain is set.
  const readyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (bootScript || failed) return
    if (readyTimer.current) clearTimeout(readyTimer.current)
    readyTimer.current = null
    curtain.hold()
  }, [bootScript, failed])
  useEffect(() => {
    if (failed) curtain.release()
  }, [failed])
  useEffect(() => () => { if (readyTimer.current) clearTimeout(readyTimer.current) }, [])
  const pageReady = useCallback(() => {
    if (readyTimer.current) clearTimeout(readyTimer.current)
    readyTimer.current = null
    // Once the curtain starts parting the page carries on (the owner's "Where to?", onboarding)
    curtain.release(() => webRef.current?.injectJavaScript('window.__appCurtainOpen && window.__appCurtainOpen(); true;'))
  }, [curtain])

  // Leaving the game screen turns the chat mic off
  useEffect(() => () => stopListening(), [])

  // The home screen icon follows the company (Ace gets the gold Ace logo)
  useEffect(() => {
    if (tenantReady) applyAppIcon(companyIconName(company, features))
  }, [tenantReady, company?.id])

  // Keep the build line under Sign out current while update checks run
  useEffect(() => {
    if (!bootScript) return
    const t = setInterval(() => {
      webRef.current?.injectJavaScript(`window.APP_BUILD = ${JSON.stringify(otaStatus())}; true;`)
    }, 4000)
    return () => clearInterval(t)
  }, [bootScript])

  const reply = useCallback((id: number, ok: boolean, result: unknown) => {
    const payload = JSON.stringify(result ?? null).replace(/</g, '\\u003c')
    webRef.current?.injectJavaScript(`window.__appReply && window.__appReply(${id}, ${ok}, ${payload}); true;`)
  }, [])

  const handle = useCallback(
    async (type: string, payload: any): Promise<unknown> => {
      switch (type) {
        case 'grant': {
          const reason = payload?.reason
          const sourceId: string | null = payload?.sourceId ?? null
          if (reason === 'lesson_complete' && user?.id && sourceId && UUID.test(sourceId)) {
            // Keeps the web dashboard's completion stats in step
            markVideoComplete(sourceId, user.id).catch(() => {})
          }
          const g = await grantXp(reason, sourceId)
          refreshXp().catch(() => {})
          return g
        }
        case 'videoUrl': {
          const v = videosRef.current[payload?.id]
          if (!v) throw new Error('Unknown lesson')
          if (v.type === 'youtube') return v.youtubeUrl ? youtubeEmbedUrl(v.youtubeUrl) : null
          const { data, error } = await supabase.storage.from('training-videos').createSignedUrl(v.storagePath || '', 3600)
          if (error || !data?.signedUrl) throw new Error('Video could not load')
          return data.signedUrl
        }
        case 'coach': {
          const answer = await askCoachWithClips(payload?.messages ?? [], {
            coachName: theme.coach.name,
            userId: user?.id ?? '',
            userName: profile?.display_name || profile?.full_name || null,
            companyId: company?.id ?? null,
            companyName: company?.name ?? null,
          })
          return { ...answer, connected: isCoachConnected() }
        }
        case 'listen':
          return startListening((type, data) => {
            webRef.current?.injectJavaScript(`window.__appEvent && window.__appEvent(${JSON.stringify(type)}, ${JSON.stringify(data).replace(/</g, '\\u003c')}); true;`)
          })
        case 'listenStop':
          stopListening()
          return null
        case 'vaultLines':
          // A day the Vault index sent without transcripts, as the rep opens it
          return loadVaultLines(Array.isArray(payload?.prefixes) ? payload.prefixes.map(String).slice(0, 50) : [])
        case 'vaultDay':
          // A door the coach linked to that isn't among the featured days
          return loadVaultDay(String(payload?.prefix ?? ''), isAceCompany(company))
        case 'xpDays': {
          // XP per day since a date, for the holiday streak and XP goals (tools/game/seasons.js)
          const since = /^\d{4}-\d{2}-\d{2}$/.test(String(payload?.since)) ? String(payload.since) : new Date().toISOString().slice(0, 10)
          const { data, error } = await supabase.from('xp_events').select('local_date, amount')
            .eq('user_id', user?.id ?? '').gte('local_date', since).limit(5000)
          if (error) throw error
          return (data ?? []).map((r: any) => ({ d: r.local_date, xp: r.amount }))
        }
        case 'saveLook':
          await saveLook(normalizeLook(engine, payload?.look as Partial<RepLook>))
          return null
        case 'password': {
          const { error } = await supabase.auth.updateUser({ password: String(payload?.password ?? '') })
          if (error) throw new Error(error.message)
          return null
        }
        case 'navigate':
          if (typeof payload === 'string') navigation.navigate(payload)
          return null
        case 'signOut':
          await signOut()
          return null
        case 'haptic':
          HAPTICS[payload]?.().catch(() => {})
          return null
        case 'ready':
          pageReady()
          return null
        case 'log':
          console.warn('[game]', payload?.where, payload?.msg, payload?.at)
          return null
        case 'roster':
          return owner.loadRoster()
        case 'manageRep':
          return owner.manageRep(payload)
        case 'saveTeam':
          return owner.saveTeam(payload)
        case 'invite':
          return owner.inviteRep({ ...payload, companyName: company?.name ?? null })
        case 'notify':
          return owner.notify(payload)
        case 'sentList':
          return owner.sentList()
        case 'saveTraining':
          if (!company?.id) throw new Error('Your account has no company')
          return owner.saveTraining(company.id, payload)
        case 'companies': {
          const { data, error } = await supabase.rpc('admin_companies')
          if (error) throw new Error(error.message)
          return data ?? []
        }
        case 'switchCompany': {
          if ((payload?.id ?? null) === (company?.id ?? null)) return null
          const { error } = await supabase.rpc('admin_switch_company', { p_company_id: payload?.id ?? null })
          if (error) throw new Error(error.message)
          // The page reloads with the new company's look, features and data
          setBootScript(null)
          await refreshProfile()
          return null
        }
        case 'ai':
          return owner.askAI(payload?.messages)
        case 'notif': {
          if (!user?.id) return null
          const id: string = payload?.id
          const on = !!payload?.on
          if (id === 'push') {
            if (!on) {
              await notifs.deactivatePushToken(user.id)
              return { on: false }
            }
            // Asks for permission the first time; if it was refused before, only iPhone Settings can turn it on
            const token = await notifs.registerPushToken(user.id)
            if (!token) throw new Error('Turn on notifications for SLAB in your iPhone Settings')
            return { on: true }
          }
          const column = NOTIF_COLUMNS[id]
          if (column) await notifs.saveNotificationPreferences(user.id, { [column]: on })
          return { on }
        }
        default:
          throw new Error(`Unknown request: ${type}`)
      }
    },
    [user?.id, profile, company, theme, engine, saveLook, signOut, navigation, refreshXp, refreshProfile, pageReady]
  )

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: { id?: number; type: string; payload: any }
      try {
        msg = JSON.parse(e.nativeEvent.data)
      } catch {
        return
      }
      handle(msg.type, msg.payload).then(
        (result) => msg.id && reply(msg.id, true, result),
        (err) => msg.id && reply(msg.id, false, String(err?.message || err))
      )
    },
    [handle, reply]
  )

  // Links out of the page (Instagram, email, phone, documents) open outside the app
  const onShouldStart = useCallback(
    (req: ShouldStartLoadRequest) => {
      const url = req.url
      if (req.isTopFrame === false) return true
      if (!pageUri || url.startsWith('file:') || url.startsWith('about:') || url.startsWith('data:') || url === pageUri) return true
      if (url.startsWith('https://www.youtube.com/embed/')) return true
      Linking.openURL(url).catch(() => {})
      return false
    },
    [pageUri]
  )

  const { colors } = theme

  if (failed) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.failTitle, { color: colors.text }]}>Couldn't load the app</Text>
        <Text style={[styles.failSub, { color: colors.textMuted }]}>{failed}</Text>
        <TouchableOpacity
          style={[styles.retry, { backgroundColor: colors.accent }]}
          onPress={() => {
            setFailed(null)
            bootFor.current = null
            setBootScript(null)
          }}
        >
          <Text style={[styles.retryText, { color: colors.onAccent }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Building the page's start data: black under the launch curtain
  if (!pageUri || !bootScript) return <View style={[styles.container, { backgroundColor: '#000' }]} />

  return (
    // The page draws edge to edge; keep it below the status bar
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <WebView
        ref={webRef}
        source={{ uri: pageUri }}
        originWhitelist={['*']}
        injectedJavaScriptBeforeContentLoaded={bootScript}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStart}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowingReadAccessToURL={dirUri ?? pageUri}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        textZoom={100}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        style={styles.web}
        containerStyle={styles.web}
        onLoadEnd={() => {
          // The page says 'ready' once it has painted; if it never does, part the curtain anyway
          if (!readyTimer.current) readyTimer.current = setTimeout(pageReady, 2500)
        }}
        onContentProcessDidTerminate={() => webRef.current?.reload()}
        onRenderProcessGone={() => webRef.current?.reload()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0c0e' },
  web: { flex: 1, backgroundColor: '#0c0c0e' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  failTitle: { fontSize: 18, fontWeight: '800' },
  failSub: { fontSize: 13, marginTop: 8, textAlign: 'center' },
  retry: { marginTop: 18, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 22 },
  retryText: { fontSize: 15, fontWeight: '700' },
})
