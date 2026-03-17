import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { supabase } from '../utils/supabase'

export interface NotificationPreferences {
  company_alerts: boolean
  updates: boolean
  big_days: boolean
  chats: boolean
  streak_reminders: boolean
}

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/**
 * Request notification permission and register the push token.
 * Shows the system permission dialog if not yet granted.
 * Returns the token string, or null if denied / not on a device.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null

    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return null

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      'your-eas-project-id'

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    const token = tokenData.data

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'SLAB Voice',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f39c12',
      })
    }

    await savePushToken(userId, token)
    return token
  } catch (err) {
    console.error('Error registering push token:', err)
    return null
  }
}

/**
 * Silently re-register the push token if permission is already granted.
 * Used on app launch — doesn't show the permission dialog.
 */
export async function registerPushTokenSilently(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return

    const { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') return

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      'your-eas-project-id'

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    await savePushToken(userId, tokenData.data)
  } catch {
    // Silently ignore — user may be on simulator or permission not granted yet
  }
}

/**
 * Upsert the push token into Supabase.
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web'

  await supabase.from('user_push_tokens').upsert(
    { user_id: userId, token, platform, is_active: true, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,token' }
  )
}

/**
 * Mark this device's push token inactive on logout.
 */
export async function deactivatePushToken(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      'your-eas-project-id'

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    await supabase
      .from('user_push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('token', tokenData.data)
  } catch {
    // Ignore — token may not be registered
  }
}

/**
 * Fetch notification preferences for a user.
 * Returns sensible defaults if no row exists yet.
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  return {
    company_alerts: data?.company_alerts ?? true,
    updates: data?.updates ?? true,
    big_days: data?.big_days ?? true,
    chats: data?.chats ?? true,
    streak_reminders: data?.streak_reminders ?? false,
  }
}

/**
 * Save (upsert) notification preferences for a user.
 */
export async function saveNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<void> {
  await supabase.from('notification_preferences').upsert(
    { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
}

/**
 * Send push notifications to a list of Expo push tokens.
 * Batches into groups of 100 (Expo limit per request).
 */
export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const valid = tokens.filter(
    (t) => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')
  )
  if (valid.length === 0) return

  for (let i = 0; i < valid.length; i += 100) {
    const batch = valid.slice(i, i + 100)
    const messages = batch.map((to) => ({
      to,
      sound: 'default',
      title,
      body,
      data: data || {},
    }))

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      })
    } catch (err) {
      console.error('Error calling Expo Push API:', err)
    }
  }
}

/**
 * Get active push tokens for all members of a chat channel,
 * filtered to those who have chat notifications enabled.
 * Excludes the sender.
 */
export async function getChannelMemberTokens(
  channelId: string,
  excludeUserId: string
): Promise<string[]> {
  try {
    // Get other channel members
    const { data: members, error: memberErr } = await supabase
      .from('channel_members')
      .select('user_id')
      .eq('channel_id', channelId)
      .eq('is_active', true)
      .neq('user_id', excludeUserId)

    if (memberErr || !members?.length) return []

    const userIds = members.map((m) => m.user_id)

    // Filter to those who have chat notifications enabled (default = enabled if no row)
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, chats')
      .in('user_id', userIds)

    const prefMap = new Map<string, boolean>()
    prefs?.forEach((p) => prefMap.set(p.user_id, p.chats))

    // Include users with chats=true or no preference row (default true)
    const enabledUserIds = userIds.filter((id) => prefMap.get(id) !== false)

    if (enabledUserIds.length === 0) return []

    // Get their active push tokens
    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('token')
      .in('user_id', enabledUserIds)
      .eq('is_active', true)

    return tokens?.map((t) => t.token) ?? []
  } catch (err) {
    console.error('Error fetching channel member tokens:', err)
    return []
  }
}
