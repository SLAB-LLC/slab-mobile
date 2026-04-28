import React, { useState, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  SafeAreaView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { TOS_SECTIONS, TOS_LAST_UPDATED } from '../../data/termsOfService'
import { recordTosAcceptance } from '../../services/tos.service'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/tokens'

interface TosAcceptanceModalProps {
  visible: boolean
  onAccepted: () => void
}

const SCROLL_THRESHOLD = 32 // px from bottom before "scrolled to end" registers

export default function TosAcceptanceModal({ visible, onAccepted }: TosAcceptanceModalProps) {
  const { user, signOut } = useAuth()
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height
    if (distanceFromBottom < SCROLL_THRESHOLD) {
      setScrolledToEnd(true)
    }
  }

  const handleAccept = async () => {
    if (!user?.id || accepting) return
    setAccepting(true)
    try {
      await recordTosAcceptance(user.id)
      onAccepted()
    } catch (e: any) {
      Alert.alert(
        'Could not record acceptance',
        'Please check your internet connection and try again.',
        [{ text: 'OK' }]
      )
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = () => {
    Alert.alert(
      'Decline Terms?',
      'You must accept the Terms of Service to use SLAB Voice. Declining will sign you out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut().catch(() => {})
          },
        },
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {}}
      statusBarTranslucent
    >
      <LinearGradient
        colors={['#000033', '#001199', '#0a1a5f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>📋</Text>
            <Text style={styles.title}>Terms of Service</Text>
            <Text style={styles.subtitle}>SLAB Voice</Text>
            <Text style={styles.lastUpdated}>Updated: {TOS_LAST_UPDATED}</Text>
          </View>

          {/* Intro banner */}
          <View style={styles.introBanner}>
            <Text style={styles.introText}>
              Please read and accept these Terms before using SLAB Voice.
              Scroll to the bottom to enable the Accept button.
            </Text>
          </View>

          {/* Scrollable terms */}
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={120}
            showsVerticalScrollIndicator
          >
            {TOS_SECTIONS.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
            ))}
            <Text style={styles.endHint}>— End of Terms —</Text>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actions}>
            {!scrolledToEnd && (
              <Text style={styles.scrollHint}>
                ↓ Scroll to the bottom to continue
              </Text>
            )}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={handleDecline}
                disabled={accepting}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.acceptBtn,
                  (!scrolledToEnd || accepting) && styles.acceptBtnDisabled,
                ]}
                onPress={handleAccept}
                disabled={!scrolledToEnd || accepting}
              >
                {accepting ? (
                  <ActivityIndicator color={colors.midnightBlue} />
                ) : (
                  <Text style={styles.acceptBtnText}>I Agree</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerIcon: {
    fontSize: 38,
    marginBottom: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitle: {
    color: colors.successGold,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastUpdated: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  introBanner: {
    backgroundColor: 'rgba(243, 156, 18, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.3)',
    padding: 12,
    marginBottom: 12,
  },
  introText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    backgroundColor: 'rgba(0, 17, 85, 0.7)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  sectionTitle: {
    color: colors.successGold,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 20,
  },
  endHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  actions: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  scrollHint: {
    color: colors.successGold,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.successGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.successGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  acceptBtnDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  acceptBtnText: {
    color: colors.midnightBlue,
    fontSize: 16,
    fontWeight: '800',
  },
})
