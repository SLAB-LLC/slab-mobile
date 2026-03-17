import React, { useEffect, useRef } from 'react'
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native'
import { colors, spacing } from '../../theme/tokens'

interface RecordButtonProps {
  isRecording: boolean
  onPress: () => void
  disabled?: boolean
}

export default function RecordButton({
  isRecording,
  onPress,
  disabled = false,
}: RecordButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (isRecording) {
      // Pulse animation while recording
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isRecording])

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.button,
          isRecording ? styles.recording : styles.idle,
          disabled && styles.disabled,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={styles.icon}>
          {isRecording ? '⏹️' : '🎙️'}
        </Text>
      </Animated.View>
      <Text style={styles.label}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  idle: {
    backgroundColor: colors.primary,
  },
  recording: {
    backgroundColor: colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 48,
  },
  label: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
})
