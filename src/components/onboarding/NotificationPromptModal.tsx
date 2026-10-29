import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { registerPushToken } from '../../services/notifications.service'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/tokens'

interface NotificationPromptModalProps {
  visible: boolean
  onDismiss: () => void
  onDone: () => void
}

const BENEFITS = [
  { icon: '🔥', title: 'Big Day Alerts', desc: 'When teammates close massive sales' },
  { icon: '💬', title: 'Chat Messages', desc: 'New messages from your team' },
  { icon: '✨', title: 'Updates', desc: 'New training content and features' },
  { icon: '🏆', title: 'Streak Reminders', desc: 'Keep your daily streak alive' },
]

export default function NotificationPromptModal({
  visible,
  onDismiss,
  onDone,
}: NotificationPromptModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleEnable = async () => {
    if (!user?.id || loading) return
    setLoading(true)
    try {
      // This shows the OS permission dialog and saves the token if granted
      await registerPushToken(user.id)
    } catch {
      // ignore — error already logged in service
    } finally {
      setLoading(false)
      onDone()
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['#141414', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Hero icon */}
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🔔</Text>
          </View>

          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.subtitle}>
            Turn on notifications so you don't miss what matters.
          </Text>

          {/* Benefits list */}
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.title} style={styles.benefit}>
                <Text style={styles.benefitIcon}>{b.icon}</Text>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.enableBtn}
            onPress={handleEnable}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.midnightBlue} />
            ) : (
              <Text style={styles.enableBtnText}>Enable Notifications</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterBtn} onPress={onDismiss} disabled={loading}>
            <Text style={styles.laterBtnText}>Maybe Later</Text>
          </TouchableOpacity>

          <Text style={styles.fineprint}>
            You can change this anytime in Settings.
          </Text>
        </LinearGradient>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 15, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(243, 156, 18, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  icon: {
    fontSize: 38,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  benefits: {
    gap: 10,
    marginBottom: 22,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  benefitIcon: {
    fontSize: 22,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  benefitDesc: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 1,
  },
  enableBtn: {
    backgroundColor: colors.successGold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: colors.successGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  enableBtnText: {
    color: colors.midnightBlue,
    fontSize: 16,
    fontWeight: '800',
  },
  laterBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  fineprint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
})
