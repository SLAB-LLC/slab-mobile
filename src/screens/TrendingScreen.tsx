import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { Conversation } from '../types'
import * as upvotesService from '../services/upvotes.service'
import { colors, borderRadius, categoryColors } from '../theme/tokens'

interface TrendingItem {
  conversation: Conversation
  upvoteCount: number
  transcriptSalesperson?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  sale: 'Sale',
  pitch: 'Pitch',
  interaction: 'Interaction',
}
const CATEGORY_BADGE: Record<string, { bg: string; text: string }> = {
  interaction: { bg: categoryColors.interaction.bg, text: '#1E40AF' },
  pitch: { bg: categoryColors.pitch.bg, text: '#92400E' },
  sale: { bg: categoryColors.sale.bg, text: '#065F46' },
}

export default function TrendingScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()

  const [items, setItems] = useState<TrendingItem[]>([])
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrending()
  }, [])

  const fetchTrending = async () => {
    setLoading(true)
    try {
      const trending = await upvotesService.getTrendingConversations(50)
      setItems(trending)

      if (user?.id && trending.length > 0) {
        const ids = trending.map((t) => t.conversation.id)
        const upvoted = await upvotesService.getUserUpvotedIds(user.id, ids)
        setUpvotedIds(upvoted)
      }
    } catch (err) {
      console.error('Error fetching trending:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleUpvote = async (conversationId: string, isUpvoted: boolean) => {
    if (!user?.id) return
    const newState = await upvotesService.toggleUpvote(user.id, conversationId, isUpvoted)
    setUpvotedIds((prev) => {
      const next = new Set(prev)
      if (newState) next.add(conversationId)
      else next.delete(conversationId)
      return next
    })
    setItems((prev) =>
      prev.map((item) =>
        item.conversation.id === conversationId
          ? { ...item, upvoteCount: item.upvoteCount + (newState ? 1 : -1) }
          : item
      )
    )
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const renderItem = ({ item, index }: { item: TrendingItem; index: number }) => {
    const { conversation } = item
    const badge = CATEGORY_BADGE[conversation.category] || CATEGORY_BADGE.interaction
    const isUpvoted = upvotedIds.has(conversation.id)

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('TranscriptDetail', { id: conversation.transcript_id })}
        activeOpacity={0.7}
      >
        {/* Rank badge */}
        <View style={[styles.rankBadge, index < 3 && styles.rankBadgeTop]}>
          <Text style={[styles.rankText, index < 3 && styles.rankTextTop]}>
            #{index + 1}
          </Text>
        </View>

        <View style={styles.cardBody}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Conv #{conversation.conversation_number}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {CATEGORY_LABELS[conversation.category] || conversation.category}
              </Text>
            </View>
          </View>

          {item.transcriptSalesperson && (
            <Text style={styles.salesperson}>{item.transcriptSalesperson}</Text>
          )}

          <Text style={styles.meta}>
            {formatTime(conversation.start_time)} - {formatTime(conversation.end_time)}
            {' \u00B7 '}
            {conversation.word_count} words
          </Text>

          {/* Objections */}
          {conversation.objections && conversation.objections.length > 0 && (
            <View style={styles.objectionRow}>
              {conversation.objections.map((obj, i) => (
                <View key={i} style={styles.objectionChip}>
                  <Text style={styles.objectionChipText}>
                    {obj.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Upvote row */}
          <View style={styles.upvoteRow}>
            <TouchableOpacity
              style={[styles.upvoteBtn, isUpvoted && styles.upvoteBtnActive]}
              onPress={(e) => {
                e.stopPropagation?.()
                handleToggleUpvote(conversation.id, isUpvoted)
              }}
            >
              <Text style={[styles.upvoteArrow, isUpvoted && styles.upvoteArrowActive]}>
                {'\u2B06'}
              </Text>
              <Text style={[styles.upvoteCount, isUpvoted && styles.upvoteCountActive]}>
                {item.upvoteCount}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <LinearGradient colors={['#000033', '#001155', '#0a1a5f']} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.successGold} />
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={['#000033', '#001155', '#0a1a5f']} style={styles.container}>
      <Text style={styles.title}>{'\u{1F525}'} Trending</Text>
      <Text style={styles.subtitle}>Most upvoted conversations</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.conversation.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\u{1F525}'}</Text>
            <Text style={styles.emptyText}>No trending conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Upvote conversations from transcripts to see them here
            </Text>
          </View>
        }
      />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 17, 85, 0.6)',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  rankBadge: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rankBadgeTop: {
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
  },
  rankText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '800',
  },
  rankTextTop: {
    color: colors.successGold,
  },
  cardBody: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  salesperson: {
    color: colors.successGold,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginBottom: 6,
  },
  objectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  objectionChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  objectionChipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
  },
  upvoteRow: {
    flexDirection: 'row',
  },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  upvoteBtnActive: {
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
  },
  upvoteArrow: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  upvoteArrowActive: {
    color: colors.successGold,
  },
  upvoteCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '700',
  },
  upvoteCountActive: {
    color: colors.successGold,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    color: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
})
