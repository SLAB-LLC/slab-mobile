import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'

type AudioPlayer = ReturnType<typeof createAudioPlayer>
import { supabase } from '../../utils/supabase'
import { colors, spacing, borderRadius } from '../../theme/tokens'
import { Conversation, Word } from '../../types'

interface AdvancedAudioPlayerProps {
  audioPath: string
  bucketName?: string
  conversations?: Conversation[]
  words?: Word[]
  onTimeUpdate?: (currentTime: number) => void
  onPlayingChange?: (isPlaying: boolean) => void
}

export interface AdvancedAudioPlayerRef {
  seekToTime: (timeInSeconds: number) => Promise<void>
  seekToConversation: (conversationIndex: number) => Promise<void>
}

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2]

const AdvancedAudioPlayer = forwardRef<AdvancedAudioPlayerRef, AdvancedAudioPlayerProps>(
  (
    {
      audioPath,
      bucketName = 'call-recordings',
      conversations = [],
      words = [],
      onTimeUpdate,
      onPlayingChange,
    },
    ref
  ) => {
    const playerRef = useRef<AudioPlayer | null>(null)
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const [currentConversation, setCurrentConversation] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [progressBarWidth, setProgressBarWidth] = useState(0)
    const [position, setPosition] = useState(0)   // millis
    const [duration, setDuration] = useState(0)    // millis
    const [audioLoaded, setAudioLoaded] = useState(false)

    // Refs to avoid stale closures
    const onTimeUpdateRef = useRef(onTimeUpdate)
    const onPlayingChangeRef = useRef(onPlayingChange)
    const conversationsRef = useRef(conversations)
    const currentConversationRef = useRef(currentConversation)
    const wasPlayingRef = useRef(false)

    useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])
    useEffect(() => { onPlayingChangeRef.current = onPlayingChange }, [onPlayingChange])
    useEffect(() => { conversationsRef.current = conversations }, [conversations])
    useEffect(() => { currentConversationRef.current = currentConversation }, [currentConversation])

    // Cleanup on unmount only
    useEffect(() => {
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current)
        playerRef.current?.remove()
        playerRef.current = null
      }
    }, [])

    // Start polling — only called after audio is loaded and playing
    const startPolling = () => {
      if (pollingRef.current) return  // already running
      pollingRef.current = setInterval(() => {
        const player = playerRef.current
        if (!player) return

        const playing = player.playing
        const curTime = player.currentTime
        const dur = player.duration

        setIsPlaying(prev => prev !== playing ? playing : prev)
        setPosition(prev => {
          const newPos = curTime * 1000
          return Math.abs(prev - newPos) > 200 ? newPos : prev
        })
        setDuration(prev => {
          const newDur = dur * 1000
          return Math.abs(prev - newDur) > 100 ? newDur : prev
        })

        if (playing !== wasPlayingRef.current) {
          wasPlayingRef.current = playing
          onPlayingChangeRef.current?.(playing)
        }

        if (playing) {
          onTimeUpdateRef.current?.(curTime)
          if (conversationsRef.current.length > 0) {
            const idx = conversationsRef.current.findIndex(
              (c) => curTime >= c.start_time && curTime <= c.end_time
            )
            if (idx !== -1 && idx !== currentConversationRef.current) {
              setCurrentConversation(idx)
            }
          }
        }
      }, 500)
    }

    // Ensures the player exists — creates lazily on first use
    const ensurePlayer = (): AudioPlayer | null => {
      if (playerRef.current) return playerRef.current
      try {
        playerRef.current = createAudioPlayer(null)
        return playerRef.current
      } catch (e) {
        console.error('Failed to create audio player:', e)
        setError('Audio player not available')
        return null
      }
    }

    // Load audio — called on-demand (tap play, seek, etc.)
    const loadAudio = async (): Promise<boolean> => {
      const player = ensurePlayer()
      if (!player) return false

      try {
        setIsLoading(true)
        setError(null)

        // Ensure audio plays even when device is in silent mode
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true })

        const { data, error: urlError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(audioPath, 3600)

        if (urlError || !data) throw new Error('Failed to load audio file')

        player.replace({ uri: data.signedUrl })

        // Wait for the player to finish loading
        let attempts = 0
        while (!player.isLoaded && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 200))
          attempts++
        }
        if (!player.isLoaded) throw new Error('Audio load timeout')

        setAudioLoaded(true)
        setIsLoading(false)
        startPolling()
        return true
      } catch (err) {
        console.error('Error loading audio:', err)
        setError('Failed to load audio')
        setIsLoading(false)
        return false
      }
    }

    useImperativeHandle(ref, () => ({
      seekToTime: async (timeInSeconds: number) => {
        const player = playerRef.current
        if (player && audioLoaded) {
          await player.seekTo(timeInSeconds)
          if (!player.playing) player.play()
        } else {
          const ok = await loadAudio()
          if (ok && playerRef.current) {
            await playerRef.current.seekTo(timeInSeconds)
            playerRef.current.play()
          }
        }
      },
      seekToConversation: async (conversationIndex: number) => {
        if (conversationIndex >= 0 && conversationIndex < conversations.length) {
          const conv = conversations[conversationIndex]
          const player = playerRef.current
          if (player && audioLoaded) {
            await player.seekTo(conv.start_time)
            if (!player.playing) player.play()
          } else {
            const ok = await loadAudio()
            if (ok && playerRef.current) {
              await playerRef.current.seekTo(conv.start_time)
              playerRef.current.play()
            }
          }
          setCurrentConversation(conversationIndex)
        }
      },
    }))

    const togglePlayPause = async () => {
      if (isLoading) return
      const player = playerRef.current
      if (player && audioLoaded) {
        if (player.playing) player.pause()
        else player.play()
      } else {
        // First tap — create player, load audio, and play
        const ok = await loadAudio()
        if (ok) playerRef.current?.play()
      }
    }

    const skip = async (seconds: number) => {
      const player = playerRef.current
      if (!player || !audioLoaded) return
      const newPos = Math.max(0, Math.min(player.currentTime + seconds, player.duration))
      await player.seekTo(newPos)
    }

    const changeSpeed = (speed: number) => {
      setPlaybackSpeed(speed)
      playerRef.current?.setPlaybackRate(speed)
    }

    const goToConversation = async (index: number) => {
      if (index < 0 || index >= conversations.length) return
      const conv = conversations[index]
      setCurrentConversation(index)
      const player = playerRef.current
      if (player && audioLoaded) {
        await player.seekTo(conv.start_time)
        if (!player.playing) player.play()
      } else {
        const ok = await loadAudio()
        if (ok && playerRef.current) {
          await playerRef.current.seekTo(conv.start_time)
          playerRef.current.play()
        }
      }
    }

    const handleProgressBarTouch = async (evt: any) => {
      const player = playerRef.current
      if (!player || !audioLoaded || !player.duration || progressBarWidth === 0) return
      const { locationX } = evt.nativeEvent
      const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth))
      await player.seekTo(percentage * player.duration)
    }

    const formatTime = (millis: number) => {
      const totalSeconds = Math.floor(millis / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return `${minutes}:${String(seconds).padStart(2, '0')}`
    }

    if (error) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )
    }

    return (
      <View style={styles.container}>
        {/* Scrubber bar on TOP of footer */}
        <TouchableOpacity
          style={styles.progressContainer}
          onPress={handleProgressBarTouch}
          onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
          activeOpacity={0.9}
        >
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' },
              ]}
            />
            {/* Scrubber thumb */}
            {duration > 0 && (
              <View
                style={[
                  styles.scrubberThumb,
                  { left: `${(position / duration) * 100}%` },
                ]}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Time row */}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          {conversations.length > 0 && (
            <Text style={styles.convText}>
              Conv {currentConversation + 1}/{conversations.length}
            </Text>
          )}
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Main controls */}
        <View style={styles.controlsRow}>
          {conversations.length > 0 && (
            <TouchableOpacity
              style={[
                styles.controlBtn,
                currentConversation <= 0 && styles.controlBtnDisabled,
              ]}
              onPress={() => goToConversation(currentConversation - 1)}
              disabled={currentConversation <= 0}
            >
              <Text style={styles.controlIcon}>{'\u23EE'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => skip(-15)}
            disabled={!audioLoaded}
          >
            <Text style={styles.skipText}>15</Text>
            <Text style={styles.skipArrow}>{'\u21BA'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playBtn}
            onPress={togglePlayPause}
            disabled={isLoading}
          >
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

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => skip(15)}
            disabled={!audioLoaded}
          >
            <Text style={styles.skipText}>15</Text>
            <Text style={styles.skipArrow}>{'\u21BB'}</Text>
          </TouchableOpacity>

          {conversations.length > 0 && (
            <TouchableOpacity
              style={[
                styles.controlBtn,
                currentConversation >= conversations.length - 1 && styles.controlBtnDisabled,
              ]}
              onPress={() => goToConversation(currentConversation + 1)}
              disabled={currentConversation >= conversations.length - 1}
            >
              <Text style={styles.controlIcon}>{'\u23ED'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Speed controls */}
        <View style={styles.speedRow}>
          {PLAYBACK_SPEEDS.map((speed) => (
            <TouchableOpacity
              key={speed}
              style={[
                styles.speedChip,
                playbackSpeed === speed && styles.speedChipActive,
              ]}
              onPress={() => changeSpeed(speed)}
            >
              <Text
                style={[
                  styles.speedChipText,
                  playbackSpeed === speed && styles.speedChipTextActive,
                ]}
              >
                {speed}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!audioLoaded && !isLoading && (
          <Text style={styles.hintText}>Tap play to load audio</Text>
        )}
      </View>
    )
  }
)

AdvancedAudioPlayer.displayName = 'AdvancedAudioPlayer'

export default AdvancedAudioPlayer

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.midnightBlue,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },

  // ─── Scrubber (top of footer) ─────────────────
  progressContainer: {
    paddingVertical: 10,
    marginBottom: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
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
    backgroundColor: colors.successGold,
    marginLeft: -7,
    shadowColor: colors.successGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },

  // ─── Time row ─────────────────────────────────
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: colors.successGold,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  convText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },

  // ─── Controls ─────────────────────────────────
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 8,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnDisabled: {
    opacity: 0.3,
  },
  controlIcon: {
    color: '#fff',
    fontSize: 18,
  },
  skipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    position: 'absolute',
    top: 8,
  },
  skipArrow: {
    color: '#fff',
    fontSize: 20,
    marginTop: 4,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successGold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.successGold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  triPlay: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 17,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.midnightBlue,
    marginLeft: 3,
  },
  pauseShape: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  pauseBar: {
    width: 5,
    height: 20,
    backgroundColor: colors.midnightBlue,
    borderRadius: 2,
  },

  // ─── Speed ────────────────────────────────────
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  speedChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    minWidth: 44,
    alignItems: 'center',
  },
  speedChipActive: {
    backgroundColor: colors.successGold,
  },
  speedChipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  speedChipTextActive: {
    color: colors.midnightBlue,
  },
  hintText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
})
