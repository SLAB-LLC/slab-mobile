import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import { StatusBar } from 'expo-status-bar'
import * as Haptics from 'expo-haptics'
import { otaStatus } from '../utils/otaUpdates'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { SOLO_COMPANY_SLUG } from '../tenant/defaults'
// The old native login, if the page can't be put in place
import LoginScreenFallback from '../screens/LoginScreen'
import { prepareLoginPage } from './files'

const HAPTICS: Record<string, () => Promise<void>> = {
  wrong: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
}


/**
 * Sign-in: the demo's opening (SLAB intro, then the CRT login) in a web view (assets/game/login.html,
 * built by tools/game/build.py). The app holds the signed-in screens back until the page has shown
 * ACCESS GRANTED, so the moment isn't cut off.
 */
export default function LoginGameScreen() {
  const { signIn, holdEntry } = useAuth()
  const webRef = useRef<WebView>(null)
  const [page, setPage] = useState<{ pageUri: string; dirUri: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    prepareLoginPage().then(setPage, () => setFailed(true))
    return () => {
      if (releaseTimer.current) clearTimeout(releaseTimer.current)
    }
  }, [])

  // The footer shows the update check as it runs
  useEffect(() => {
    if (!page) return
    const t = setInterval(() => {
      webRef.current?.injectJavaScript(`window.appSetBuild && window.appSetBuild(${JSON.stringify(otaStatus())}); true;`)
    }, 3000)
    return () => clearInterval(t)
  }, [page])

  const release = useCallback(() => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current)
    releaseTimer.current = null
    holdEntry(false)
  }, [holdEntry])

  const reply = useCallback((id: number, ok: boolean, result: unknown) => {
    const payload = JSON.stringify(result ?? null).replace(/</g, '\\u003c')
    webRef.current?.injectJavaScript(`window.__appReply && window.__appReply(${id}, ${ok}, ${payload}); true;`)
  }, [])

  const handle = useCallback(
    async (type: string, payload: any): Promise<unknown> => {
      switch (type) {
        case 'signIn': {
          holdEntry(true)
          try {
            await signIn(String(payload?.email ?? ''), String(payload?.password ?? ''))
          } catch (err) {
            holdEntry(false)
            throw err
          }
          // Never leave the rep stuck on the login if the page doesn't answer
          releaseTimer.current = setTimeout(() => holdEntry(false), 5000)
          const { data: auth } = await supabase.auth.getUser()
          const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', auth.user?.id ?? '').maybeSingle()
          if (!profile?.company_id) return { company: null }
          const { data: company } = await supabase.from('companies').select('name, slug').eq('id', profile.company_id).maybeSingle()
          return { company: company && company.slug !== SOLO_COMPANY_SLUG ? company.name : null }
        }
        case 'enter':
          release()
          return null
        case 'reset': {
          const { error } = await supabase.auth.resetPasswordForEmail(String(payload?.email ?? ''))
          if (error) throw new Error(error.message)
          return null
        }
        case 'haptic':
          HAPTICS[payload]?.().catch(() => {})
          return null
        default:
          throw new Error(`Unknown request: ${type}`)
      }
    },
    [signIn, holdEntry, release]
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

  if (failed) return <LoginScreenFallback />

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {page ? (
        <WebView
          ref={webRef}
          source={{ uri: page.pageUri }}
          originWhitelist={['*']}
          injectedJavaScriptBeforeContentLoaded={`window.SLAB_LOGIN = ${JSON.stringify({ build: otaStatus() })}; true;`}
          onMessage={onMessage}
          allowFileAccess
          allowFileAccessFromFileURLs
          allowingReadAccessToURL={page.dirUri}
          javaScriptEnabled
          bounces={false}
          scrollEnabled={false}
          overScrollMode="never"
          textZoom={100}
          hideKeyboardAccessoryView
          keyboardDisplayRequiresUserAction={false}
          style={styles.web}
          containerStyle={styles.web}
          onContentProcessDidTerminate={() => webRef.current?.reload()}
          onRenderProcessGone={() => webRef.current?.reload()}
        />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color="#ff8a2a" />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  web: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
