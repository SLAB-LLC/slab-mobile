import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { User } from '@supabase/supabase-js'
import { supabase } from '../utils/supabase'
import { UserProfile, Company } from '../types'
import { registerPushTokenSilently, deactivatePushToken } from '../services/notifications.service'
import { startSession, endSession, isAudioPlaying } from '../services/activitySession.service'
import { recordHeartbeat } from '../services/streak.service'

const HEARTBEAT_INTERVAL_MS = 60_000

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  company: Company | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      // Sync auth email → user_profiles if it's missing (fixes "Unknown User" in chat)
      if (profileData && !profileData.email) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.email) {
          await supabase
            .from('user_profiles')
            .update({ email: authUser.email })
            .eq('id', userId)
          profileData.email = authUser.email
        }
      }

      setProfile(profileData)

      // Silently re-register push token if permission already granted
      registerPushTokenSilently(userId)

      // Fetch company if user has one
      if (profileData?.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .single()

        if (companyError) {
          console.error('Error fetching company:', companyError)
        } else {
          setCompany(companyData)
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
      setCompany(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const handleSignIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    // User and profile will be set by onAuthStateChange
    return
  }

  const handleSignOut = async () => {
    // Deactivate this device's push token before signing out
    if (user?.id) {
      deactivatePushToken(user.id).catch(() => {})
    }

    // End the activity session so usage stats aggregate correctly
    await endSession().catch(() => {})

    const { error } = await supabase.auth.signOut()
    if (error) throw error

    // Clear state (will also be cleared by onAuthStateChange)
    setUser(null)
    setProfile(null)
    setCompany(null)
  }

  // App-wide activity session: start on login, heartbeat while foregrounded, end on logout.
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const userIdRef = useRef<string | null>(null)
  const companyIdRef = useRef<string | null>(null)
  userIdRef.current = user?.id ?? null
  companyIdRef.current = profile?.company_id ?? null

  useEffect(() => {
    const clearHeartbeat = () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
    }

    const startHeartbeat = () => {
      if (heartbeatTimerRef.current) return
      heartbeatTimerRef.current = setInterval(() => {
        const uid = userIdRef.current
        const cid = companyIdRef.current
        if (uid && cid) recordHeartbeat(uid, cid, isAudioPlaying() ? 'audio_playing' : 'page_active')
      }, HEARTBEAT_INTERVAL_MS)
    }

    if (!user?.id) {
      clearHeartbeat()
      return
    }

    let cancelled = false
    startSession(user.id).then((sessionId) => {
      if (cancelled || !sessionId) return
      // Fire an immediate heartbeat so even a short session counts as activity
      if (userIdRef.current && companyIdRef.current) {
        recordHeartbeat(userIdRef.current, companyIdRef.current, 'page_active')
      }
      if (AppState.currentState === 'active') startHeartbeat()
    })

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') startHeartbeat()
      else clearHeartbeat()
    })

    return () => {
      cancelled = true
      clearHeartbeat()
      sub.remove()
    }
  }, [user?.id])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        endSession().catch(() => {})
        setProfile(null)
        setCompany(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        company,
        loading,
        signIn: handleSignIn,
        signOut: handleSignOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
