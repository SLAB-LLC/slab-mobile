import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Transcript } from '../../types'
import { colors, spacing, typography, borderRadius } from '../../theme/tokens'

interface TranscriptCardProps {
  transcript: Transcript
  onPress: () => void
}

export default function TranscriptCard({ transcript, onPress }: TranscriptCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {transcript.salesperson_name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.salesperson} numberOfLines={1}>
            {transcript.salesperson_name || 'Unknown'}
          </Text>
          <Text style={styles.date}>{formatDate(transcript.created_at)}</Text>
        </View>
      </View>

      <Text style={styles.filename} numberOfLines={1}>
        {transcript.original_filename}
      </Text>

      {/* Metadata badges */}
      <View style={styles.badges}>
        {transcript.transcript_data?.redacted_entities_count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              🔒 {transcript.transcript_data.redacted_entities_count} redacted
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    color: colors.textOnPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
  },
  salesperson: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  filename: {
    ...typography.bodySmall,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  badge: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    marginRight: spacing.xs,
    marginTop: spacing.xs / 2,
  },
  badgeText: {
    ...typography.caption,
    color: colors.gray700,
    fontWeight: '500',
  },
})
