import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  SafeAreaView,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'

const BULLETS = [
  'Exclusive sales strategies',
  'Mentality and Mindset',
  'Book recommendations + study plan',
  'Personal coaching',
  'Golden Door summer routine (Diet, exercise, etc.)',
  'Everything else that goes into not just making a couple more sales, but being the top 1%',
]

export default function SecretsScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation()
  const { memberId } = route.params
  const { profile } = useAuth()

  const [name, setName] = useState(profile?.full_name || '')
  const [email, setEmail] = useState(profile?.email || '')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Glitch animation
  const glitchX = useRef(new Animated.Value(0)).current
  const glitchOpacity = useRef(new Animated.Value(1)).current
  const glitchX2 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const runGlitch = () => {
      Animated.sequence([
        // Snap right
        Animated.parallel([
          Animated.timing(glitchX, { toValue: 4, duration: 40, useNativeDriver: true }),
          Animated.timing(glitchX2, { toValue: -3, duration: 40, useNativeDriver: true }),
          Animated.timing(glitchOpacity, { toValue: 0.6, duration: 40, useNativeDriver: true }),
        ]),
        // Snap left
        Animated.parallel([
          Animated.timing(glitchX, { toValue: -5, duration: 40, useNativeDriver: true }),
          Animated.timing(glitchX2, { toValue: 4, duration: 40, useNativeDriver: true }),
          Animated.timing(glitchOpacity, { toValue: 1, duration: 40, useNativeDriver: true }),
        ]),
        // Snap slightly right
        Animated.parallel([
          Animated.timing(glitchX, { toValue: 2, duration: 30, useNativeDriver: true }),
          Animated.timing(glitchX2, { toValue: -2, duration: 30, useNativeDriver: true }),
        ]),
        // Return to center
        Animated.parallel([
          Animated.timing(glitchX, { toValue: 0, duration: 50, useNativeDriver: true }),
          Animated.timing(glitchX2, { toValue: 0, duration: 50, useNativeDriver: true }),
          Animated.timing(glitchOpacity, { toValue: 1, duration: 50, useNativeDriver: true }),
        ]),
        // Hold steady before next glitch
        Animated.delay(900 + Math.random() * 800),
      ]).start(({ finished }) => {
        if (finished) runGlitch()
      })
    }

    const timeout = setTimeout(runGlitch, 800)
    return () => clearTimeout(timeout)
  }, [])

  const handleReserve = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Error', 'Name and email are required.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('course_reservations').insert({
        member_id: memberId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      })

      if (error) throw error
      setSubmitted(true)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reserve spot.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Custom header — solid black, matches the page */}
      <SafeAreaView style={styles.headerSafe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backChevron}>{'‹'}</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Glitchy title */}
          <View style={styles.titleSection}>
            {/* Red ghost layer */}
            <Animated.Text
              style={[styles.titleGlitch, { transform: [{ translateX: glitchX2 }] }]}
            >
              INDUSTRY SECRETS
            </Animated.Text>
            {/* Cyan ghost layer */}
            <Animated.Text
              style={[styles.titleGlitch2, { transform: [{ translateX: glitchX }] }]}
            >
              INDUSTRY SECRETS
            </Animated.Text>
            {/* Main white text */}
            <Animated.Text style={[styles.titleMain, { opacity: glitchOpacity }]}>
              INDUSTRY SECRETS
            </Animated.Text>
          </View>

          {/* COMING SOON — animated glitch */}
          <View style={styles.comingSoonWrap}>
            <Animated.Text
              style={[
                styles.comingSoonGhost,
                { transform: [{ translateX: glitchX }] },
              ]}
            >
              COMING SOON
            </Animated.Text>
            <Animated.Text
              style={[
                styles.comingSoon,
                { opacity: glitchOpacity, transform: [{ translateX: glitchX2 }] },
              ]}
            >
              COMING SOON
            </Animated.Text>
          </View>

          {/* Description */}
          <Text style={styles.descriptionLead}>
            Exclusive courses from the Big Five — unlock the strategies they use to dominate
            the field every single day.
          </Text>

          <View style={styles.bulletCard}>
            <Text style={styles.bulletHeading}>What you get:</Text>
            {BULLETS.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>{'—'}</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          {submitted ? (
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>{'\u2705'}</Text>
              <Text style={styles.successText}>You're on the list!</Text>
              <Text style={styles.successSubtext}>
                We'll notify you when Industry Secrets launches.
              </Text>
            </View>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Reserve Your Spot</Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Phone (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={[styles.reserveBtn, submitting && { opacity: 0.6 }]}
                onPress={handleReserve}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.reserveBtnText}>
                  {submitting ? 'Reserving...' : 'Reserve Your Spot'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerSafe: {
    backgroundColor: '#000',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 2,
  },
  backChevron: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
  },
  backLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '400',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
    alignItems: 'center',
  },

  // ── Title ────────────────────────────────────────
  titleSection: {
    marginBottom: 12,
    alignItems: 'center',
  },
  titleGlitch: {
    position: 'absolute',
    fontSize: 42,
    fontWeight: '900',
    color: 'rgba(255, 0, 0, 0.55)',
    letterSpacing: 4,
    textAlign: 'center',
  },
  titleGlitch2: {
    position: 'absolute',
    fontSize: 42,
    fontWeight: '900',
    color: 'rgba(0, 255, 255, 0.35)',
    letterSpacing: 4,
    textAlign: 'center',
  },
  titleMain: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 255, 255, 0.4)',
    textShadowOffset: { width: -2, height: 0 },
    textShadowRadius: 6,
  },

  // ── Coming Soon ──────────────────────────────────
  comingSoonWrap: {
    marginBottom: 28,
    alignItems: 'center',
  },
  comingSoonGhost: {
    position: 'absolute',
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255, 0, 80, 0.7)',
    letterSpacing: 6,
  },
  comingSoon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff0000',
    letterSpacing: 6,
  },

  // ── Description ──────────────────────────────────
  descriptionLead: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  bulletCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,0,0,0.15)',
    marginBottom: 28,
  },
  bulletHeading: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  bulletDot: {
    color: '#ff3333',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  bulletText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },

  // ── Form ─────────────────────────────────────────
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.2)',
  },
  formTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  reserveBtn: {
    backgroundColor: '#ff0000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  reserveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Success ──────────────────────────────────────
  successCard: {
    width: '100%',
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.2)',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  successText: {
    color: '#00ff88',
    fontSize: 22,
    fontWeight: '800',
  },
  successSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
})
