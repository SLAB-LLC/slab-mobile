import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../context/AuthContext'
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  registerPushToken,
  deactivatePushToken,
  NotificationPreferences,
} from '../services/notifications.service'
import * as Notifications from 'expo-notifications'
import { useCompanyColors } from '../hooks/useCompanyColors'

interface ToggleItem {
  key: keyof NotificationPreferences
  label: string
  description: string
  icon: string
  requiresMaster?: boolean
}

const TOGGLES: ToggleItem[] = [
  {
    key: 'company_alerts',
    label: 'Company Alerts',
    description: 'Important announcements from your company admin.',
    icon: '\u{1F4E2}',
  },
  {
    key: 'updates',
    label: 'Platform Updates',
    description: 'New features, improvements, and news from SLAB.',
    icon: '\u{2728}',
  },
  {
    key: 'big_days',
    label: 'Big Days',
    description: 'Get notified when a Big Five member throws down a massive sales day.',
    icon: '\u{1F525}',
  },
  {
    key: 'chats',
    label: 'Chat Messages',
    description: 'New messages in your company chat.',
    icon: '\u{1F4AC}',
  },
  {
    key: 'streak_reminders',
    label: 'Streak Reminders',
    description: "Daily nudge to keep your streak alive if you haven't listened yet.",
    icon: '\u{23F0}',
  },
]

export default function NotificationSettingsScreen() {
  const { bgGradient } = useCompanyColors()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<keyof NotificationPreferences | null>(null)
  const [masterEnabled, setMasterEnabled] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    company_alerts: true,
    updates: true,
    big_days: true,
    chats: true,
    streak_reminders: false,
  })

  useEffect(() => {
    if (!user?.id) return
    loadPrefs()
  }, [user?.id])

  const loadPrefs = async () => {
    if (!user?.id) return
    try {
      const saved = await getNotificationPreferences(user.id)
      setPrefs(saved)

      // Check if system permission is granted to set master toggle
      const { status } = await Notifications.getPermissionsAsync()
      setMasterEnabled(status === 'granted')
    } catch (err) {
      console.error('Error loading notification prefs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMasterToggle = async (value: boolean) => {
    if (!user?.id) return

    if (value) {
      // Request permission
      const token = await registerPushToken(user.id)
      if (token) {
        setMasterEnabled(true)
      } else {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications for SLAB Voice in your device settings.',
          [{ text: 'OK' }]
        )
      }
    } else {
      Alert.alert(
        'Disable Notifications',
        'This will deactivate push notifications on this device. You can re-enable them anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await deactivatePushToken(user.id)
              setMasterEnabled(false)
            },
          },
        ]
      )
    }
  }

  const handleToggle = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      if (!user?.id) return
      setPrefs((prev) => ({ ...prev, [key]: value }))
      setSaving(key)
      try {
        await saveNotificationPreferences(user.id, { [key]: value })
      } catch (err) {
        // Revert on failure
        setPrefs((prev) => ({ ...prev, [key]: !value }))
        Alert.alert('Error', 'Failed to save preference. Please try again.')
      } finally {
        setSaving(null)
      }
    },
    [user?.id]
  )

  if (loading) {
    return (
      <LinearGradient colors={bgGradient} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f39c12" />
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={bgGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          Control what you get notified about. All notifications require push to be enabled.
        </Text>

        {/* Master toggle */}
        <View style={styles.masterCard}>
          <View style={styles.masterLeft}>
            <Text style={styles.masterIcon}>
              {masterEnabled ? '\u{1F514}' : '\u{1F515}'}
            </Text>
            <View style={styles.masterText}>
              <Text style={styles.masterLabel}>Push Notifications</Text>
              <Text style={styles.masterDesc}>
                {masterEnabled
                  ? 'Notifications are active on this device.'
                  : 'Enable to start receiving notifications.'}
              </Text>
            </View>
          </View>
          <Switch
            value={masterEnabled}
            onValueChange={handleMasterToggle}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#f39c12' }}
            thumbColor="#ffffff"
            ios_backgroundColor="rgba(255,255,255,0.2)"
          />
        </View>

        {/* Category toggles */}
        <Text style={styles.sectionLabel}>Categories</Text>
        <View style={styles.card}>
          {TOGGLES.map((item, index) => (
            <View key={item.key}>
              <View style={[styles.row, !masterEnabled && styles.rowDisabled]}>
                <Text style={styles.rowIcon}>{item.icon}</Text>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowDesc}>{item.description}</Text>
                </View>
                {saving === item.key ? (
                  <ActivityIndicator size="small" color="#f39c12" />
                ) : (
                  <Switch
                    value={prefs[item.key]}
                    onValueChange={(v) => handleToggle(item.key, v)}
                    disabled={!masterEnabled}
                    trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#f39c12' }}
                    thumbColor="#ffffff"
                    ios_backgroundColor="rgba(255,255,255,0.2)"
                  />
                )}
              </View>
              {index < TOGGLES.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>

        {/* Info note */}
        <Text style={styles.note}>
          {Platform.OS === 'ios'
            ? 'To fully disable notifications, go to Settings → SLAB Voice → Notifications.'
            : 'To fully disable notifications, go to Settings → Apps → SLAB Voice → Notifications.'}
        </Text>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(243, 156, 18, 0.12)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(243, 156, 18, 0.35)',
    marginBottom: 24,
  },
  masterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  masterIcon: {
    fontSize: 26,
    marginRight: 14,
  },
  masterText: {
    flex: 1,
  },
  masterLabel: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  masterDesc: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginTop: 2,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'rgba(0, 17, 85, 0.7)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowIcon: {
    fontSize: 22,
    marginRight: 14,
    width: 28,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  rowDesc: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 60,
  },
  note: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
})
