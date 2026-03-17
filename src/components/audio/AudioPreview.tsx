import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { Audio } from 'expo-av'
import { colors, spacing, typography, borderRadius } from '../../theme/tokens'
import Button from '../common/Button'

interface AudioPreviewProps {
  uri: string
  duration: number
  onReRecord: () => void
  onUpload: () => void
  onCancel: () => void
}

export default function AudioPreview({
  uri,
  duration,
  onReRecord,
  onUpload,
  onCancel,
}: AudioPreviewProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)

  useEffect(() => {
    return () => {
      // Cleanup sound on unmount
      if (sound) {
        sound.unloadAsync()
      }
    }
  }, [sound])

  const handlePlayPause = async () => {
    try {
      if (!sound) {
        // Load and play sound
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        )
        setSound(newSound)
        setIsPlaying(true)
      } else {
        const status = await sound.getStatusAsync()
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync()
            setIsPlaying(false)
          } else {
            await sound.playAsync()
            setIsPlaying(true)
          }
        }
      }
    } catch (error) {
      console.error('Error playing sound:', error)
      Alert.alert('Error', 'Failed to play audio')
    }
  }

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis)
      setIsPlaying(status.isPlaying)

      // Reset when finished
      if (status.didJustFinish) {
        setIsPlaying(false)
        setPosition(0)
      }
    }
  }

  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? position / (duration * 1000) : 0

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Preview Recording</Text>

      {/* Playback Controls */}
      <View style={styles.player}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          {isPlaying ? (
            <View style={styles.pauseShape}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          ) : (
            <View style={styles.triPlay} />
          )}
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          {/* Time Display */}
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {formatDuration(position)}
            </Text>
            <Text style={styles.timeText}>
              {formatDuration(duration * 1000)}
            </Text>
          </View>
        </View>
      </View>

      {/* File Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Duration:</Text>
        <Text style={styles.infoValue}>{formatDuration(duration * 1000)}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Re-record"
          onPress={onReRecord}
          variant="outline"
          size="medium"
        />
        <View style={styles.spacer} />
        <Button
          title="Upload"
          onPress={onUpload}
          variant="primary"
          size="medium"
        />
      </View>

      <Button
        title="Cancel"
        onPress={onCancel}
        variant="outline"
        size="small"
        fullWidth
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  triPlay: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 17,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.gray200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  timeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.gray200,
    marginBottom: spacing.lg,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  spacer: {
    width: spacing.sm,
  },
})
