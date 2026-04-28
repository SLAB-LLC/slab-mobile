import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'

type AudioPlayer = ReturnType<typeof createAudioPlayer>
import { supabase } from '../../utils/supabase'
import { colors, objectionColors } from '../../theme/tokens'
import { BigFiveMember } from '../../services/bigfive.service'
import { Conversation } from '../../types'
import { useStreakTracker } from '../../hooks/useStreakTracker'
import { useScreenCaptureProtection } from '../../hooks/useScreenCaptureProtection'

type EnrichedConversation = Conversation & {
  salesperson_name: string
  transcript_date: string
  area_type?: string
  audio_path: string | null
}

interface ConversationPlayerModalProps {
  visible: boolean
  conversations: EnrichedConversation[]
  initialIndex: number
  salespersonToMember: Map<string, BigFiveMember>
  favoritedIds: Set<string>
  upvotedIds?: Set<string>
  upvoteCounts?: Record<string, number>
  onToggleFavorite: (convo: EnrichedConversation) => void
  onToggleUpvote?: (convo: EnrichedConversation) => void
  onShare: (convo: EnrichedConversation) => void
  onClose: () => void
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const COVER_SIZE = SCREEN_WIDTH - 96
const FALLBACK_OBJECTION = { bg: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.7)' }

const CATEGORY_LABELS: Record<string, string> = {
  sale: 'Sale', pitch: 'Pitch', interaction: 'Interaction',
}
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  sale: { bg: '#D1FAE5', text: '#065F46' },
  pitch: { bg: '#FEF3C7', text: '#92400E' },
  interaction: { bg: '#DBEAFE', text: '#1E40AF' },
}

function formatRelTime(absoluteSecs: number, startTime: number): string {
  const rel = Math.max(0, absoluteSecs - startTime)
  const m = Math.floor(rel / 60)
  const s = Math.floor(rel % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatObjection(obj: string) {
  return obj.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function ConversationPlayerModal({
  visible,
  conversations,
  initialIndex,
  salespersonToMember,
  favoritedIds,
  upvotedIds = new Set(),
  upvoteCounts = {},
  onToggleFavorite,
  onToggleUpvote,
  onShare,
  onClose,
}: ConversationPlayerModalProps) {
  const { trackAudioTime, onPause } = useStreakTracker()
  useScreenCaptureProtection(visible, () => playerRef.current?.pause())

  const playerRef = useRef<AudioPlayer | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadTrigger, setLoadTrigger] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)  // seconds
  const [progressBarWidth, setProgressBarWidth] = useState(1)

  // Stable refs
  const currentIndexRef = useRef(0)
  const conversationsRef = useRef(conversations)
  const endTimeRef = useRef(0)

  // Load management
  const loadIdRef = useRef(0)
  const urlCacheRef = useRef<Map<string, string>>(new Map())
  const currentPathRef = useRef<string | null>(null)

  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
  useEffect(() => { conversationsRef.current = conversations }, [conversations])

  // Create player in useEffect
  useEffect(() => {
    try {
      playerRef.current = createAudioPlayer(null)
      setPlayerReady(true)
    } catch (e) {
      console.error('Failed to create audio player:', e)
    }
    return () => {
      playerRef.current?.remove()
      playerRef.current = null
    }
  }, [])

  const convo = conversations[currentIndex] ?? null
  const member = convo ? salespersonToMember.get(convo.salesperson_name) ?? null : null
  const coverUrl = member?.background_picture_url || member?.profile_picture_url || null
  const isFav = convo ? favoritedIds.has(convo.id) : false
  const isUpvoted = convo ? upvotedIds.has(convo.id) : false
  const upvoteCount = convo ? (upvoteCounts[convo.id] || 0) : 0
  const duration = convo ? convo.end_time - convo.start_time : 1
  const progress = convo
    ? Math.min(1, Math.max(0, (position - convo.start_time) / duration))
    : 0

  // Sync index when modal opens; clean up when it closes
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex)
      setLoadTrigger(t => t + 1)
    } else {
      playerRef.current?.pause()
      ++loadIdRef.current
      setIsLoading(false)
      setIsPlaying(false)
    }
  }, [visible, initialIndex])

  // Load audio
  useEffect(() => {
    if (!visible || !playerReady || loadTrigger === 0) return
    const c = conversations[currentIndex]
    if (!c?.audio_path) return
    loadAudio(c.audio_path, c.start_time, c.end_time)
  }, [currentIndex, loadTrigger, playerReady])

  // Position polling + auto-advance
  useEffect(() => {
    if (!playerReady) return
    const interval = setInterval(() => {
      const player = playerRef.current
      if (!player) return

      setIsPlaying(player.playing)

      if (!player.playing) {
        onPause()
        return
      }
      trackAudioTime()
      const t = player.currentTime
      setPosition(t)
      if (t >= endTimeRef.current) {
        const next = currentIndexRef.current + 1
        if (next < conversationsRef.current.length) {
          setCurrentIndex(next)
        } else {
          player.pause()
        }
      }
    }, 500)
    return () => clearInterval(interval)
  }, [playerReady, trackAudioTime, onPause])

  const loadAudio = async (path: string, startTime: number, endTime: number) => {
    const player = playerRef.current
    if (!player) return

    const loadId = ++loadIdRef.current
    endTimeRef.current = endTime

    // Fast path: same file already loaded
    if (currentPathRef.current === path && player.duration > 0) {
      await player.seekTo(startTime)
      setPosition(startTime)
      if (!player.playing) player.play()
      return
    }

    setIsLoading(true)

    try {
      // Ensure audio plays even when device is in silent mode
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true })

      let signedUrl = urlCacheRef.current.get(path)
      if (!signedUrl) {
        const { data, error } = await supabase.storage
          .from('call-recordings')
          .createSignedUrl(path, 3600)
        if (loadId !== loadIdRef.current) return
        if (error || !data) throw new Error('Failed to get audio URL')
        signedUrl = data.signedUrl
        urlCacheRef.current.set(path, signedUrl)
      } else if (loadId !== loadIdRef.current) {
        return
      }

      currentPathRef.current = path
      player.replace({ uri: signedUrl })

      // Wait for the player to finish loading
      let attempts = 0
      while (!player.isLoaded && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 200))
        attempts++
      }
      if (loadId !== loadIdRef.current) return
      if (!player.isLoaded) throw new Error('Audio load timeout')

      await player.seekTo(startTime)
      setPosition(startTime)
      player.play()
      setIsLoading(false)
    } catch (e) {
      if (loadId !== loadIdRef.current) return
      console.error('ConversationPlayerModal: audio load error', e)
      setIsLoading(false)
    }
  }

  const togglePlay = () => {
    const player = playerRef.current
    if (!player || isLoading) return
    if (player.playing) {
      player.pause()
    } else if (convo?.audio_path) {
      if (currentPathRef.current && player.duration > 0) {
        player.play()
      } else {
        loadAudio(convo.audio_path, convo.start_time, convo.end_time)
      }
    }
  }

  const skip = async (seconds: number) => {
    const player = playerRef.current
    if (!convo || !player) return
    const newPos = Math.max(convo.start_time, Math.min(convo.end_time - 0.5, player.currentTime + seconds))
    await player.seekTo(newPos)
    setPosition(newPos)
  }

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }

  const goNext = () => {
    if (currentIndex < conversations.length - 1) setCurrentIndex((i) => i + 1)
  }

  const handleScrubPress = async (evt: any) => {
    const player = playerRef.current
    if (!convo || progressBarWidth === 0 || !player) return
    const pct = Math.max(0, Math.min(1, evt.nativeEvent.locationX / progressBarWidth))
    const newPos = convo.start_time + pct * duration
    await player.seekTo(newPos)
    setPosition(newPos)
  }

  if (!convo) return null

  const catStyle = CATEGORY_COLORS[convo.category] || CATEGORY_COLORS.interaction

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={StyleSheet.absoluteFillObject}
            blurRadius={24}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000033' }]} />
        )}
        <View style={[StyleSheet.absoluteFillObject, styles.scrim]} />

        <SafeAreaView style={styles.safeArea}>
          {/* ── Top bar ── */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.topCenter}>
              <Text style={styles.topLabel}>CONVERSATIONS</Text>
              <Text style={styles.topCounter}>
                {currentIndex + 1} of {conversations.length}
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* ── Album art ── */}
          <View style={styles.coverWrap}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Text style={styles.coverFallbackText}>
                  {member?.name?.charAt(0) ?? '?'}
                </Text>
              </View>
            )}
          </View>

          {/* ── Track info ── */}
          <View style={styles.trackInfo}>
            <View style={styles.trackTitleRow}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                Conv #{convo.conversation_number}
              </Text>
              <View style={[styles.catBadge, { backgroundColor: catStyle.bg }]}>
                <Text style={[styles.catBadgeText, { color: catStyle.text }]}>
                  {CATEGORY_LABELS[convo.category] || convo.category}
                </Text>
              </View>
            </View>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {convo.salesperson_name}
              {convo.area_type ? `  ·  ${convo.area_type}` : ''}
            </Text>

            <View style={styles.chipsRow}>
              {convo.objections?.map((obj, i) => {
                const c = objectionColors[obj] || FALLBACK_OBJECTION
                return (
                  <View key={i} style={[styles.chip, { backgroundColor: c.bg }]}>
                    <Text style={[styles.chipText, { color: c.text }]}>
                      {formatObjection(obj)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>

          {/* ── Scrubber ── */}
          <View style={styles.scrubberSection}>
            <TouchableOpacity
              style={styles.scrubberTrackWrap}
              onPress={handleScrubPress}
              onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
              activeOpacity={0.9}
            >
              <View style={styles.scrubberTrack}>
                <View style={[styles.scrubberFill, { width: `${progress * 100}%` }]} />
                <View style={[styles.scrubberThumb, { left: `${progress * 100}%` }]} />
              </View>
            </TouchableOpacity>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatRelTime(position, convo.start_time)}</Text>
              <Text style={styles.timeText}>{formatRelTime(convo.end_time, convo.start_time)}</Text>
            </View>
          </View>

          {/* ── Playback controls ── */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlBtn, currentIndex === 0 && styles.controlBtnDisabled]}
              onPress={goPrev}
              disabled={currentIndex === 0}
            >
              <View style={styles.triLeft} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={() => skip(-15)}>
              <View style={styles.skipStack}>
                <Text style={styles.skipNum}>15</Text>
                <Text style={styles.skipArrow}>{'\u21BA'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.playBtn} onPress={togglePlay} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.midnightBlue} />
              ) : isPlaying ? (
                <View style={styles.pauseShape}>
                  <View style={styles.pauseBar} />
                  <View style={styles.pauseBar} />
                </View>
              ) : (
                <View style={styles.triPlay} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={() => skip(15)}>
              <View style={styles.skipStack}>
                <Text style={styles.skipNum}>15</Text>
                <Text style={styles.skipArrow}>{'\u21BB'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlBtn,
                currentIndex >= conversations.length - 1 && styles.controlBtnDisabled,
              ]}
              onPress={goNext}
              disabled={currentIndex >= conversations.length - 1}
            >
              <View style={styles.triRight} />
            </TouchableOpacity>
          </View>

          {/* ── Favorite + Upvote + Share ── */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onToggleFavorite(convo)}
            >
              <Text style={[styles.actionIcon, isFav && styles.actionIconActive]}>
                {isFav ? '\u2B50' : '\u2606'}
              </Text>
              <Text style={[styles.actionLabel, isFav && styles.actionLabelActive]}>
                {isFav ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>

            {onToggleUpvote && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onToggleUpvote(convo)}
              >
                <Text style={[styles.actionIcon, isUpvoted && styles.actionIconActive]}>
                  {isUpvoted ? '\u25B2' : '\u25B3'}
                </Text>
                <Text style={[styles.actionLabel, isUpvoted && styles.actionLabelActive]}>
                  {upvoteCount > 0 ? `${upvoteCount}` : 'Upvote'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onShare(convo)}
            >
              <Text style={styles.actionIcon}>{'\u{1F4AC}'}</Text>
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrim: {
    backgroundColor: 'rgba(0, 0, 15, 0.78)',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginBottom: 24,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  topCenter: {
    alignItems: 'center',
  },
  topLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  topCounter: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    marginTop: 2,
  },
  coverWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  coverFallback: {
    backgroundColor: '#001155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFallbackText: {
    color: colors.successGold,
    fontSize: 80,
    fontWeight: '900',
  },
  trackInfo: {
    marginBottom: 20,
  },
  trackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    flexShrink: 1,
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrubberSection: {
    marginBottom: 24,
  },
  scrubberTrackWrap: {
    paddingVertical: 10,
  },
  scrubberTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'visible',
    position: 'relative',
  },
  scrubberFill: {
    height: '100%',
    backgroundColor: colors.successGold,
    borderRadius: 2,
  },
  scrubberThumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    marginLeft: -7,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 24,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnDisabled: {
    opacity: 0.3,
  },
  triLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderRightWidth: 15,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#fff',
  },
  triRight: {
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 15,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
  skipStack: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  skipNum: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  skipArrow: {
    color: '#fff',
    fontSize: 19,
    lineHeight: 20,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.successGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  triPlay: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 20,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.midnightBlue,
    marginLeft: 4,
  },
  pauseShape: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  pauseBar: {
    width: 5,
    height: 22,
    backgroundColor: colors.midnightBlue,
    borderRadius: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.6)',
  },
  actionIconActive: {
    color: colors.successGold,
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
  actionLabelActive: {
    color: colors.successGold,
  },
})
