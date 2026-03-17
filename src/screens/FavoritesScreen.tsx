import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { Conversation } from '../types'
import * as favoritesService from '../services/favorites.service'
import * as upvotesService from '../services/upvotes.service'
import { getBigFiveMembers, getMemberSalespersonNames, BigFiveMember } from '../services/bigfive.service'
import { colors, borderRadius, categoryColors, objectionColors } from '../theme/tokens'
import ConversationPlayerModal from '../components/audio/ConversationPlayerModal'
import ShareToChatModal from '../components/chat/ShareToChatModal'

type EnrichedConversation = Conversation & {
  salesperson_name: string
  transcript_date: string
  area_type?: string
  audio_path: string | null
}

interface FavoriteItem {
  conversation: Conversation
  note: string | null
  favoritedAt: string
  transcriptSalesperson?: string
  audio_path: string | null
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

const FALLBACK_OBJECTION = { bg: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.7)' }

export default function FavoritesScreen() {
  const navigation = useNavigation<any>()
  const { user, profile } = useAuth()

  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [salespersonToMember, setSalespersonToMember] = useState<Map<string, BigFiveMember>>(new Map())
  const [loading, setLoading] = useState(true)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  // Upvotes
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set())
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>({})

  // Player modal
  const [playerVisible, setPlayerVisible] = useState(false)
  const [playerIndex, setPlayerIndex] = useState(0)

  // Share modal
  const [shareConvo, setShareConvo] = useState<EnrichedConversation | null>(null)
  const [shareVisible, setShareVisible] = useState(false)

  useEffect(() => {
    fetchData()
  }, [user?.id])

  const fetchData = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      // Load Big Five members to build salespersonToMember map
      const membersData = await getBigFiveMembers()
      const activeMembers = membersData.filter((m) => m.is_active)
      const nameMap = new Map<string, BigFiveMember>()
      for (const m of activeMembers) {
        const names = await getMemberSalespersonNames(m.id)
        names.forEach((n) => nameMap.set(n, m))
      }
      setSalespersonToMember(nameMap)

      const data = await favoritesService.getUserFavorites(user.id)
      setFavorites(data)

      // Fetch upvote data
      const convoIds = data.map((f) => f.conversation.id)
      if (convoIds.length > 0) {
        const upIds = await upvotesService.getUserUpvotedIds(user.id, convoIds)
        setUpvotedIds(upIds)
        const counts = await upvotesService.getUpvoteCounts(convoIds)
        setUpvoteCounts(counts)
      }
    } catch (err) {
      console.error('Error fetching favorites data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Convert FavoriteItem[] to EnrichedConversation[] for the player modal
  const enrichedConversations: EnrichedConversation[] = favorites.map((f) => ({
    ...(f.conversation as Conversation),
    salesperson_name: f.transcriptSalesperson || '',
    transcript_date: f.favoritedAt?.split('T')[0] || '',
    area_type: undefined,
    audio_path: f.audio_path,
  }))

  const handleRemoveFavorite = async (conversationId: string) => {
    if (!user?.id || !profile?.company_id) return
    await favoritesService.toggleFavorite(user.id, profile.company_id, conversationId, true)
    setFavorites((prev) => prev.filter((f) => f.conversation.id !== conversationId))
  }

  const handleToggleFavorite = useCallback(async (convo: EnrichedConversation) => {
    if (!user?.id || !profile?.company_id) return
    // All items here are favorited — toggling removes them
    await favoritesService.toggleFavorite(user.id, profile.company_id, convo.id, true)
    setFavorites((prev) => prev.filter((f) => f.conversation.id !== convo.id))
  }, [user?.id, profile?.company_id])

  const handleToggleUpvote = useCallback(async (convo: EnrichedConversation) => {
    if (!user?.id) return
    const isUp = upvotedIds.has(convo.id)
    const next = await upvotesService.toggleUpvote(user.id, convo.id, isUp)
    setUpvotedIds((prev) => {
      const s = new Set(prev)
      if (next) s.add(convo.id)
      else s.delete(convo.id)
      return s
    })
    setUpvoteCounts((prev) => ({
      ...prev,
      [convo.id]: (prev[convo.id] || 0) + (next ? 1 : -1),
    }))
  }, [user?.id, upvotedIds])

  const handleShare = useCallback((convo: EnrichedConversation) => {
    setShareConvo(convo)
    setShareVisible(true)
  }, [])

  const handleSaveNote = async (conversationId: string) => {
    if (!user?.id) return
    const success = await favoritesService.updateFavoriteNote(user.id, conversationId, noteText)
    if (success) {
      setFavorites((prev) =>
        prev.map((f) =>
          f.conversation.id === conversationId ? { ...f, note: noteText || null } : f
        )
      )
      setEditingNote(null)
      setNoteText('')
    } else {
      Alert.alert('Error', 'Failed to save note.')
    }
  }

  const startEditNote = (item: FavoriteItem) => {
    setEditingNote(item.conversation.id)
    setNoteText(item.note || '')
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const formatObjection = (obj: string) =>
    obj.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const renderItem = ({ item, index }: { item: FavoriteItem; index: number }) => {
    const { conversation } = item
    const badge = CATEGORY_BADGE[conversation.category] || CATEGORY_BADGE.interaction
    const isEditing = editingNote === conversation.id

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setPlayerIndex(index)
          setPlayerVisible(true)
        }}
        activeOpacity={0.75}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>Conv #{conversation.conversation_number}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {CATEGORY_LABELS[conversation.category] || conversation.category}
              </Text>
            </View>
          </View>
          <View style={styles.cardHeaderRight}>
            <Text style={styles.playHint}>{'\u25B6'} Play</Text>
            <TouchableOpacity
              onPress={() => handleRemoveFavorite(conversation.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.removeIcon}>{'\u2B50'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Salesperson + time */}
        {item.transcriptSalesperson && (
          <Text style={styles.salesperson}>{item.transcriptSalesperson}</Text>
        )}
        <Text style={styles.timeRange}>
          {formatTime(conversation.start_time)} - {formatTime(conversation.end_time)}
          {' \u00B7 '}
          {Math.floor(conversation.duration_seconds / 60)}m {Math.floor(conversation.duration_seconds % 60)}s
        </Text>

        {/* Objections */}
        {conversation.objections && conversation.objections.length > 0 && (
          <View style={styles.objectionRow}>
            {conversation.objections.map((obj, i) => {
              const c = objectionColors[obj] || FALLBACK_OBJECTION
              return (
                <View key={i} style={[styles.objectionChip, { backgroundColor: c.bg }]}>
                  <Text style={[styles.objectionChipText, { color: c.text }]}>
                    {formatObjection(obj)}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Note */}
        {isEditing ? (
          <View style={styles.noteEditor}>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add a note..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              autoFocus
            />
            <View style={styles.noteActions}>
              <TouchableOpacity
                style={styles.noteBtn}
                onPress={() => handleSaveNote(conversation.id)}
              >
                <Text style={styles.noteBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.noteBtnCancel}
                onPress={() => { setEditingNote(null); setNoteText('') }}
              >
                <Text style={styles.noteBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.noteSection}
            onPress={(e) => { e.stopPropagation?.(); startEditNote(item) }}
          >
            <Text style={styles.noteIcon}>{'\u{1F4DD}'}</Text>
            <Text style={item.note ? styles.noteText : styles.notePlaceholder}>
              {item.note || 'Tap to add a note'}
            </Text>
          </TouchableOpacity>
        )}
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

  // Build a favorited IDs set — all items here are favorited
  const favoritedIds = new Set(favorites.map((f) => f.conversation.id))

  return (
    <LinearGradient colors={['#000033', '#001155', '#0a1a5f']} style={styles.container}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>{'‹'}</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>{'\u2B50'} Favorites</Text>
      <Text style={styles.subtitle}>{favorites.length} saved conversation{favorites.length !== 1 ? 's' : ''} · tap any to listen</Text>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.conversation.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\u2606'}</Text>
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptySubtext}>
              Star conversations from any transcript to save them here
            </Text>
          </View>
        }
      />

      <ConversationPlayerModal
        visible={playerVisible}
        conversations={enrichedConversations}
        initialIndex={playerIndex}
        salespersonToMember={salespersonToMember}
        favoritedIds={favoritedIds}
        upvotedIds={upvotedIds}
        upvoteCounts={upvoteCounts}
        onToggleFavorite={handleToggleFavorite}
        onToggleUpvote={handleToggleUpvote}
        onShare={handleShare}
        onClose={() => setPlayerVisible(false)}
      />

      {shareConvo && (
        <ShareToChatModal
          visible={shareVisible}
          onClose={() => { setShareVisible(false); setShareConvo(null) }}
          transcriptId={shareConvo.transcript_id}
          conversationTitle={`${shareConvo.salesperson_name} – Conv #${shareConvo.conversation_number}`}
          timestampStart={shareConvo.start_time}
          timestampEnd={shareConvo.end_time}
        />
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  backArrow: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
  backLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
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
    backgroundColor: 'rgba(0, 17, 85, 0.6)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  playHint: { color: colors.successGold, fontSize: 12, fontWeight: '700' },
  removeIcon: { fontSize: 16 },
  salesperson: {
    color: colors.successGold,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeRange: {
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  objectionChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  noteIcon: { fontSize: 14 },
  noteText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    flex: 1,
  },
  notePlaceholder: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    fontStyle: 'italic',
    flex: 1,
  },
  noteEditor: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  noteBtn: {
    backgroundColor: colors.successGold,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  noteBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  noteBtnCancel: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  noteBtnCancelText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
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
