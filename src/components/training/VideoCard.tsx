import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { TrainingVideo } from '../../types'
import { colors, spacing, typography, borderRadius } from '../../theme/tokens'

interface VideoCardProps {
  video: TrainingVideo
  onPress: () => void
  isCompleted?: boolean
}

export default function VideoCard({
  video,
  onPress,
  isCompleted = false,
}: VideoCardProps) {
  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return null

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Thumbnail */}
      {video.thumbnail_url ? (
        <Image
          source={{ uri: video.thumbnail_url }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholderThumbnail}>
          <Text style={styles.placeholderIcon}>🎥</Text>
        </View>
      )}

      {/* Duration badge */}
      {video.duration && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
        </View>
      )}

      {/* Completion badge */}
      {isCompleted && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>✓</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>

        {video.description && (
          <Text style={styles.description} numberOfLines={2}>
            {video.description}
          </Text>
        )}

        {/* Video type indicator */}
        <View style={styles.footer}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>
              {video.video_type === 'youtube' ? '▶️ YouTube' : '📹 Uploaded'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: colors.gray200,
  },
  placeholderThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  durationBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  durationText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    color: colors.textOnPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: spacing.md,
  },
  title: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  typeText: {
    ...typography.caption,
    color: colors.gray700,
    fontWeight: '500',
  },
})
