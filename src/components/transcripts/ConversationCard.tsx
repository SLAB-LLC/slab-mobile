import React, { memo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors, spacing, borderRadius, categoryColors, objectionColors } from '../../theme/tokens'
import { Conversation } from '../../types'

interface ConversationCardProps {
  conversation: Conversation
  onPress?: () => void
  onToggleFavorite?: (conversationId: string, isFavorited: boolean) => void
  onToggleUpvote?: (conversationId: string, isUpvoted: boolean) => void
  onShare?: (conversation: Conversation) => void
  isFavorited?: boolean
  isUpvoted?: boolean
  upvoteCount?: number
  isActive?: boolean
}

const CATEGORY_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  interaction: { bg: categoryColors.interaction.bg, text: '#1E40AF' },
  pitch: { bg: categoryColors.pitch.bg, text: '#92400E' },
  sale: { bg: categoryColors.sale.bg, text: '#065F46' },
}

const CATEGORY_LABELS: Record<string, string> = {
  sale: 'Sale',
  pitch: 'Pitch',
  interaction: 'Interaction',
}

const ConversationCard = memo(function ConversationCard({
  conversation,
  onPress,
  onToggleFavorite,
  onToggleUpvote,
  onShare,
  isFavorited = false,
  isUpvoted = false,
  upvoteCount = 0,
  isActive = false,
}: ConversationCardProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  const formatObjection = (objection: string): string =>
    objection.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const badgeStyle = CATEGORY_BADGE_STYLES[conversation.category] || CATEGORY_BADGE_STYLES.interaction

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      style={[styles.card, isActive && styles.cardActive]}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>
            Conversation #{conversation.conversation_number}
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.categoryText, { color: badgeStyle.text }]}>
              {CATEGORY_LABELS[conversation.category] || conversation.category}
            </Text>
          </View>
        </View>
      </View>

      {/* Time range */}
      <Text style={styles.timeRange}>
        {formatTime(conversation.start_time)} - {formatTime(conversation.end_time)}
      </Text>

      {/* Metadata row */}
      <View style={styles.metadata}>
        <Text style={styles.metaText}>
          {'\u23F1'} {formatDuration(conversation.duration_seconds)}
        </Text>
        <Text style={styles.metaDot}>{'\u00B7'}</Text>
        <Text style={styles.metaText}>{conversation.word_count} words</Text>
        {conversation.pii_redaction_count > 0 && (
          <>
            <Text style={styles.metaDot}>{'\u00B7'}</Text>
            <Text style={styles.metaText}>
              {conversation.pii_redaction_count} PII
            </Text>
          </>
        )}
      </View>

      {/* Objections */}
      {conversation.objections && conversation.objections.length > 0 && (
        <View style={styles.objections}>
          <View style={styles.objectionsList}>
            {conversation.objections.map((obj, index) => {
              const colorSet = objectionColors[obj] || { bg: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.7)' }
              return (
                <View
                  key={index}
                  style={[styles.objectionBadge, { backgroundColor: colorSet.bg }]}
                >
                  <Text style={[styles.objectionText, { color: colorSet.text }]}>
                    {formatObjection(obj)}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* Action buttons row: Share | Favorite | Upvote */}
      <View style={styles.actionsRow}>
        {onShare && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => {
              e.stopPropagation?.()
              onShare(conversation)
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>{'\u{1F4AC}'}</Text>
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        )}

        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => {
              e.stopPropagation?.()
              onToggleFavorite(conversation.id, isFavorited)
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>{isFavorited ? '\u2B50' : '\u2606'}</Text>
            <Text style={[styles.actionLabel, isFavorited && styles.actionLabelActive]}>
              {isFavorited ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        )}

        {onToggleUpvote && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => {
              e.stopPropagation?.()
              onToggleUpvote(conversation.id, isUpvoted)
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.actionIcon, isUpvoted && styles.upvoteActive]}>
              {'\u2B06'}
            </Text>
            <Text style={[styles.actionLabel, isUpvoted && styles.actionLabelActive]}>
              {upvoteCount > 0 ? upvoteCount : 'Upvote'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
})

export default ConversationCard

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0, 17, 85, 0.5)',
    borderRadius: 12,
    padding: 14,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardActive: {
    borderColor: colors.successGold,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeRange: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginBottom: 6,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  metaDot: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
  },
  objections: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  objectionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  objectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  objectionText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // ─── Action buttons ──────────────────────────
  actionsRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  actionIcon: {
    fontSize: 14,
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
  },
  actionLabelActive: {
    color: colors.successGold,
  },
  upvoteActive: {
    color: colors.successGold,
  },
})
