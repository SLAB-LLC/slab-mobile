import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'

type AudioPlayer = ReturnType<typeof createAudioPlayer>
import { supabase } from '../../utils/supabase'
import { colors } from '../../theme/tokens'

interface MiniConversationPlayerProps {
  audioPath: string
  bucketName?: string
  startTime: number
  endTime: number
}

export default function MiniConversationPlayer({
  audioPath,
  bucketName = 'call-recordings',
  startTime,
  endTime,
}: MiniConversationPlayerProps) {
  const playerRef = useRef<AudioPlayer | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(startTime)
  const [error, setError] = useState<string | null>(null)
  const duration = endTime - startTime

  // Create player in useEffect
  useEffect(() => {
    try {
      playerRef.current = createAudioPlayer(null)
      setPlayerReady(true)
    } catch (e) {
      console.error('Failed to create audio player:', e)
      setError('Audio player not available')
      setIsLoading(false)
    }
    return () => {
      playerRef.current?.remove()
      playerRef.current = null
    }
  }, [])

  // Load audio once player is ready
  useEffect(() => {
    if (!playerReady) return
    let cancelled = false
    const load = async () => {
      try {
        // Ensure audio plays even when device is in silent mode
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true })

        const { data, error: urlErr } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(audioPath, 3600)
        if (urlErr || !data || cancelled) return

        playerRef.current?.replace({ uri: data.signedUrl })

        // Wait for the player to finish loading
        let attempts = 0
        while (!playerRef.current?.isLoaded && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 200))
          attempts++
        }
        if (cancelled) return

        await playerRef.current?.seekTo(startTime)
        setLoaded(true)
      } catch {
        if (!cancelled) setError('Could not load audio')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [playerReady, audioPath])

  // Poll position and enforce end boundary
  useEffect(() => {
    if (!playerReady) return
    const interval = setInterval(() => {
      const player = playerRef.current
      if (!player) return

      setIsPlaying(player.playing)

      if (player.playing) {
        const t = player.currentTime
        setPosition(t)
        if (t >= endTime) {
          player.pause()
          player.seekTo(startTime).then(() => setPosition(startTime))
        }
      }
    }, 500)
    return () => clearInterval(interval)
  }, [playerReady, startTime, endTime])

  const togglePlay = async () => {
    const player = playerRef.current
    if (!player || !loaded) return
    if (player.playing) {
      player.pause()
    } else {
      if (player.currentTime >= endTime) await player.seekTo(startTime)
      player.play()
    }
  }

  const formatTime = (secs: number) => {
    const rel = Math.max(0, secs - startTime)
    const m = Math.floor(rel / 60)
    const s = Math.floor(rel % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const progress = duration > 0
    ? Math.min(1, Math.max(0, (position - startTime) / duration))
    : 0

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Play/Pause */}
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

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(endTime)}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 17, 85, 0.8)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.25)',
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.successGold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  triPlay: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.midnightBlue,
    marginLeft: 2,
  },
  pauseShape: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  pauseBar: {
    width: 3.5,
    height: 14,
    backgroundColor: colors.midnightBlue,
    borderRadius: 1.5,
  },
  progressWrap: {
    flex: 1,
    gap: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.successGold,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
  },
})
