import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { colors, spacing, typography, borderRadius } from '../../theme/tokens'

interface TranscriptTextProps {
  text: string
  showCopyButton?: boolean
}

export default function TranscriptText({
  text,
  showCopyButton = true,
}: TranscriptTextProps) {
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(text)
      Alert.alert('Copied', 'Transcript copied to clipboard')
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      Alert.alert('Error', 'Failed to copy transcript')
    }
  }

  // Format transcript text with proper spacing and speaker labels
  const formatTranscriptText = (rawText: string) => {
    // Split by newlines and format
    const lines = rawText.split('\n')
    return lines.map((line, index) => {
      // Check if line starts with speaker label like "[Speaker 1]:" or "Speaker 1:"
      const speakerMatch = line.match(/^(\[?Speaker \d+\]?:)(.*)/)

      if (speakerMatch) {
        return (
          <View key={index} style={styles.paragraph}>
            <Text style={styles.speakerLabel}>{speakerMatch[1]}</Text>
            <Text style={styles.text}>{speakerMatch[2].trim()}</Text>
          </View>
        )
      }

      // Regular text
      return (
        <Text key={index} style={styles.text}>
          {line}
          {'\n'}
        </Text>
      )
    })
  }

  return (
    <View style={styles.container}>
      {showCopyButton && (
        <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
          <Text style={styles.copyButtonText}>📋 Copy</Text>
        </TouchableOpacity>
      )}

      <View style={styles.textContainer}>{formatTranscriptText(text)}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  copyButton: {
    alignSelf: 'flex-end',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  copyButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  textContainer: {
    // Container for formatted text
  },
  paragraph: {
    marginBottom: spacing.sm,
  },
  speakerLabel: {
    ...typography.body,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs / 2,
  },
  text: {
    ...typography.body,
    color: colors.gray700,
    lineHeight: 24,
  },
})
