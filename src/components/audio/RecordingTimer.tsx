import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, typography } from '../../theme/tokens'

interface RecordingTimerProps {
  isRecording: boolean
  onTick?: (seconds: number) => void
}

export default function RecordingTimer({
  isRecording,
  onTick,
}: RecordingTimerProps) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setSeconds((prev) => {
          const newValue = prev + 1
          onTick?.(newValue)
          return newValue
        })
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setSeconds(0)
    }
  }, [isRecording])

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isRecording && seconds === 0) {
    return null
  }

  return (
    <View style={styles.container}>
      <View style={styles.indicator}>
        <View style={styles.recordingDot} />
        <Text style={styles.recordingText}>REC</Text>
      </View>
      <Text style={styles.time}>{formatTime(seconds)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginRight: spacing.xs,
  },
  recordingText: {
    ...typography.caption,
    fontWeight: 'bold',
    color: colors.error,
  },
  time: {
    ...typography.h2,
    fontFamily: 'monospace',
    color: colors.textPrimary,
  },
})
