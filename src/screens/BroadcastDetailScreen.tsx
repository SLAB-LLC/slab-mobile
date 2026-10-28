import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av'
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'
import { Broadcast, getBroadcast } from '../services/broadcasts.service'
import { RootStackParamList } from '../types'
import { colors } from '../theme/tokens'
import { useCompanyColors } from '../hooks/useCompanyColors'

type RouteProps = RouteProp<RootStackParamList, 'BroadcastDetail'>
type AudioPlayer = ReturnType<typeof createAudioPlayer>

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  updates: { label: 'Update', icon: '✨', color: '#3b82f6' },
  company_alerts: { label: 'Company Alert', icon: '📢', color: '#f97316' },
  big_days: { label: 'Big Day', icon: '🔥', color: '#eab308' },
  manual: { label: 'Announcement', icon: '📣', color: '#a855f7' },
}

export default function BroadcastDetailScreen() {
  const { bgGradient } = useCompanyColors()
  const route = useRoute<RouteProps>()
  const navigation = useNavigation<any>()
  const { width } = useWindowDimensions()

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const b = await getBroadcast(route.params.id)
        if (!active) return
        if (!b) {
          setError('This message is no longer available.')
        } else {
          setBroadcast(b)
        }
      } catch {
        if (active) setError('Could not load this message.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
      audioPlayerRef.current?.remove()
      audioPlayerRef.current = null
    }
  }, [route.params.id])

  const toggleAudio = async () => {
    if (!broadcast?.media_url) return
    try {
      if (!audioPlayerRef.current) {
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false })
        audioPlayerRef.current = createAudioPlayer({ uri: broadcast.media_url })
      }
      const player = audioPlayerRef.current
      if (player.playing) {
        player.pause()
        setAudioPlaying(false)
      } else {
        player.play()
        setAudioPlaying(true)
      }
    } catch {
      // ignore — audio will surface its own error
    }
  }

  const meta = broadcast
    ? CATEGORY_META[broadcast.category] || CATEGORY_META.manual
    : CATEGORY_META.manual

  const mediaWidth = width - 40
  const mediaHeight = Math.round((mediaWidth * 9) / 16)

  return (
    <LinearGradient
      colors={bgGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.successGold} />
          </View>
        ) : error ? (
          <View style={styles.error}>
            <Text style={styles.errorIcon}>📭</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.errorBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.errorBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : broadcast ? (
          <>
            {/* Category badge */}
            <View style={[styles.badge, { backgroundColor: `${meta.color}20`, borderColor: `${meta.color}80` }]}>
              <Text style={styles.badgeIcon}>{meta.icon}</Text>
              <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{broadcast.title}</Text>

            {/* Date */}
            <Text style={styles.date}>
              {new Date(broadcast.created_at).toLocaleString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>

            {/* Media */}
            {broadcast.media_url && broadcast.media_type === 'image' && (
              <Image
                source={{ uri: broadcast.media_url }}
                style={[styles.image, { width: mediaWidth, height: mediaHeight }]}
                resizeMode="cover"
              />
            )}

            {broadcast.media_url && broadcast.media_type === 'gif' && (
              <Image
                source={{ uri: broadcast.media_url }}
                style={[styles.image, { width: mediaWidth, height: mediaHeight }]}
                resizeMode="cover"
              />
            )}

            {broadcast.media_url && broadcast.media_type === 'video' && (
              <Video
                source={{ uri: broadcast.media_url }}
                style={[styles.video, { width: mediaWidth, height: mediaHeight }]}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
              />
            )}

            {broadcast.media_url && broadcast.media_type === 'audio' && (
              <View style={styles.audioCard}>
                {broadcast.thumbnail_url ? (
                  <Image
                    source={{ uri: broadcast.thumbnail_url }}
                    style={styles.audioThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.audioThumb, styles.audioThumbFallback]}>
                    <Text style={styles.audioThumbIcon}>🎧</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.audioPlayBtn} onPress={toggleAudio}>
                  <Text style={styles.audioPlayBtnText}>
                    {audioPlaying ? '⏸  Pause' : '▶  Play Audio'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Body */}
            <View style={styles.bodyCard}>
              <Text style={styles.bodyText}>{broadcast.body}</Text>
            </View>

            {/* Done button */}
            <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.doneBtnText}>Got it</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 40,
  },
  loading: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  error: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  errorBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 14,
  },
  badgeIcon: {
    fontSize: 13,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 32,
  },
  date: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 18,
  },
  image: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  video: {
    borderRadius: 16,
    backgroundColor: '#000',
    marginBottom: 16,
  },
  audioCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  audioThumb: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginBottom: 14,
  },
  audioThumbFallback: {
    backgroundColor: colors.midnightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioThumbIcon: {
    fontSize: 48,
  },
  audioPlayBtn: {
    backgroundColor: colors.successGold,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    shadowColor: colors.successGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  audioPlayBtnText: {
    color: colors.midnightBlue,
    fontWeight: '800',
    fontSize: 15,
  },
  bodyCard: {
    backgroundColor: 'rgba(0, 17, 85, 0.7)',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 24,
  },
  bodyText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 23,
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.successGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.successGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  doneBtnText: {
    color: colors.midnightBlue,
    fontSize: 16,
    fontWeight: '800',
  },
})
