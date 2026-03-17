import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Audio } from 'expo-av'
import { supabase } from '../../utils/supabase'
import { colors, spacing, typography, borderRadius } from '../../theme/tokens'
import Card from '../common/Card'

interface AudioPlayerProps {
  audioPath: string
  bucketName?: string
}

export default function AudioPlayer({ audioPath, bucketName = 'call-recordings' }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup sound on unmount
      if (sound) {
        sound.unloadAsync()
      }
    }
  }, [sound])

  const loadAudio = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get signed URL from Supabase Storage
      const { data, error: urlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(audioPath, 3600) // 1 hour expiry

      if (urlError || !data) {
        throw new Error('Failed to load audio file')
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      })

      // Load the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: data.signedUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      )

      setSound(newSound)
      setIsLoading(false)
    } catch (err) {
      console.error('Error loading audio:', err)
      setError('Failed to load audio')
      setIsLoading(false)
    }
  }

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis)
      setDuration(status.durationMillis || 0)
      setIsPlaying(status.isPlaying)

      // Auto-stop when finished
      if (status.didJustFinish) {
        setIsPlaying(false)
        sound?.setPositionAsync(0)
      }
    }
  }

  const togglePlayPause = async () => {
    try {
      if (!sound) {
        await loadAudio()
        return
      }

      if (isPlaying) {
        await sound.pauseAsync()
      } else {
        await sound.playAsync()
      }
    } catch (err) {
      console.error('Error playing/pausing:', err)
      setError('Playback error')
    }
  }

  const seekToPosition = async (value: number) => {
    if (sound) {
      try {
        await sound.setPositionAsync(value)
      } catch (err) {
        console.error('Error seeking:', err)
      }
    }
  }

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  if (error) {
    return (
      <Card variant="default" padding="medium">
        <Text style={styles.errorText}>{error}</Text>
      </Card>
    )
  }

  return (
    <Card variant="default" padding="medium">
      <View style={styles.container}>
        <Text style={styles.title}>Audio Playback</Text>

        {/* Play/Pause Button */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={togglePlayPause}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : isPlaying ? (
              <View style={styles.pauseShape}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            ) : (
              <View style={styles.triPlay} />
            )}
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' },
                ]}
              />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Info Text */}
        {!sound && !isLoading && (
          <Text style={styles.infoText}>
            Tap play to load and play the redacted audio
          </Text>
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triPlay: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.white,
    marginLeft: 3,
  },
  pauseShape: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  pauseBar: {
    width: 4,
    height: 16,
    backgroundColor: colors.white,
    borderRadius: 2,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  timeText: {
    ...typography.caption,
    color: colors.textSecondary,
    minWidth: 40,
    textAlign: 'center',
  },
  infoText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
})
