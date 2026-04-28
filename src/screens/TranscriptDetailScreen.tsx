import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Share,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import * as transcriptsService from '../services/transcripts.service'
import * as conversationsService from '../services/conversations.service'
import * as favoritesService from '../services/favorites.service'
import * as upvotesService from '../services/upvotes.service'
import { RootStackParamList, Conversation } from '../types'
import AdvancedAudioPlayer, {
  AdvancedAudioPlayerRef,
} from '../components/audio/AdvancedAudioPlayer'
import InteractiveTranscript from '../components/transcripts/InteractiveTranscript'
import ConversationCard from '../components/transcripts/ConversationCard'
import ConversationFilters from '../components/transcripts/ConversationFilters'
import { colors, spacing, borderRadius } from '../theme/tokens'
import { useStreakTracker } from '../hooks/useStreakTracker'
import { useScreenCaptureProtection } from '../hooks/useScreenCaptureProtection'
import ShareToChatModal from '../components/chat/ShareToChatModal'

type TranscriptDetailRouteProp = RouteProp<RootStackParamList, 'TranscriptDetail'>

const CATEGORY_MAP: Record<string, string> = {
  interactions: 'interaction',
  pitches: 'pitch',
  sales: 'sale',
}

export default function TranscriptDetailScreen() {
  const route = useRoute<TranscriptDetailRouteProp>()
  const navigation = useNavigation()
  const { id } = route.params
  const { user, profile } = useAuth()

  const audioPlayerRef = useRef<AdvancedAudioPlayerRef>(null)
  const { trackAudioTime, onPause, logTranscriptView } = useStreakTracker(id)
  useScreenCaptureProtection(true, () => audioPlayerRef.current?.pause())

  const [transcript, setTranscript] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentTimeRef = useRef(0)
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'interactions' | 'pitches' | 'sales'
  >('all')
  const [selectedObjection, setSelectedObjection] = useState('all')
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set())
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>({})
  const [shareModalVisible, setShareModalVisible] = useState(false)
  const [shareConversation, setShareConversation] = useState<Conversation | null>(null)
  const [transcriptExpanded, setTranscriptExpanded] = useState(false)

  useEffect(() => {
    fetchTranscript()
    fetchConversations()
    logTranscriptView()
  }, [id])

  // Fetch favorites and upvotes when conversations load
  useEffect(() => {
    if (conversations.length > 0 && user?.id) {
      const ids = conversations.map((c) => c.id)
      favoritesService.getFavoritedConversationIds(user.id, ids).then(setFavoritedIds)
      upvotesService.getUserUpvotedIds(user.id, ids).then(setUpvotedIds)
      upvotesService.getUpvoteCounts(ids).then(setUpvoteCounts)
    }
  }, [conversations, user?.id])

  const fetchTranscript = async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true)
      else setLoading(true)

      const data = await transcriptsService.getTranscriptById(id)
      if (!data) {
        setError('Transcript not found or access denied')
        setTranscript(null)
      } else {
        setTranscript(data)
        setError(null)
      }
    } catch (err) {
      console.error('Error fetching transcript:', err)
      setError('Failed to load transcript')
    } finally {
      if (isRefreshing) setRefreshing(false)
      else setLoading(false)
    }
  }

  const fetchConversations = async () => {
    try {
      const convos = await conversationsService.getConversationsByTranscriptId(id)
      setConversations(convos)
    } catch (err) {
      console.error('Error fetching conversations:', err)
    }
  }

  const handleRefresh = () => {
    fetchTranscript(true)
    fetchConversations()
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const handleShare = async () => {
    if (!transcript) return
    const data = transcript.transcript_redacted || transcript.transcript_data
    const text = data?.text || 'No transcript text available'
    const shareText = `Transcript - ${transcript.salesperson_name}\n\nDate: ${formatDate(
      transcript.created_at
    )}\nFile: ${transcript.original_filename}\n\n${text}`
    try {
      await Share.share({
        message: shareText,
        title: `Transcript - ${transcript.salesperson_name}`,
      })
    } catch (err) {
      console.error('Error sharing:', err)
    }
  }

  const handleTimeUpdate = (time: number) => {
    currentTimeRef.current = time
    trackAudioTime()
  }

  const handlePlayingChange = (playing: boolean) => {
    if (!playing) onPause()
  }

  const handleWordPress = async (word: any) => {
    if (audioPlayerRef.current && word.start !== undefined) {
      await audioPlayerRef.current.seekToTime(word.start)
    }
  }

  const handleConversationPress = useCallback(async (conversation: Conversation) => {
    if (audioPlayerRef.current) {
      const idx = conversations.findIndex((c) => c.id === conversation.id)
      if (idx !== -1) await audioPlayerRef.current.seekToConversation(idx)
    }
  }, [conversations])

  const handleShareToChat = useCallback((conversation: Conversation) => {
    setShareConversation(conversation)
    setShareModalVisible(true)
  }, [])

  const handleToggleFavorite = useCallback(async (conversationId: string, isFavorited: boolean) => {
    if (!user?.id || !profile?.company_id) return
    const newState = await favoritesService.toggleFavorite(
      user.id,
      profile.company_id,
      conversationId,
      isFavorited
    )
    setFavoritedIds((prev) => {
      const next = new Set(prev)
      if (newState) next.add(conversationId)
      else next.delete(conversationId)
      return next
    })
  }, [user?.id, profile?.company_id])

  const handleToggleUpvote = useCallback(async (conversationId: string, isUpvoted: boolean) => {
    if (!user?.id) return
    const newState = await upvotesService.toggleUpvote(user.id, conversationId, isUpvoted)
    setUpvotedIds((prev) => {
      const next = new Set(prev)
      if (newState) next.add(conversationId)
      else next.delete(conversationId)
      return next
    })
    setUpvoteCounts((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] || 0) + (newState ? 1 : -1),
    }))
  }, [user?.id])

  // Derived data
  const transcriptData = transcript?.transcript_redacted || transcript?.transcript_data
  const transcriptText = transcriptData?.text
  const words = transcriptData?.words || []
  const piiMatches = transcriptData?.pii_matches || []
  const audioPath =
    transcriptData?.redacted_file_storage_path || transcript?.file_storage_path
  const hasAudio = Boolean(audioPath)
  const hasWords = words.length > 0
  const hasConversations = conversations.length > 0

  const conversationCounts = {
    total: conversations.length,
    interactions: conversations.filter((c) => c.category === 'interaction').length,
    pitches: conversations.filter((c) => c.category === 'pitch').length,
    sales: conversations.filter((c) => c.category === 'sale').length,
  }

  // Filter conversations by category and objection
  const filteredConversations = useMemo(() => {
    let filtered = conversations
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((c) => c.category === CATEGORY_MAP[selectedCategory])
    }
    if (selectedObjection !== 'all') {
      filtered = filtered.filter(
        (c) => c.objections && c.objections.includes(selectedObjection)
      )
    }
    return filtered
  }, [conversations, selectedCategory, selectedObjection])

  // Handle category change from filters component (uses singular keys)
  const handleFilterCategoryChange = (category: string) => {
    const filterToStatsMap: Record<string, string> = {
      all: 'all',
      interaction: 'interactions',
      pitch: 'pitches',
      sale: 'sales',
    }
    setSelectedCategory(
      (filterToStatsMap[category] || 'all') as typeof selectedCategory
    )
  }

  if (loading) {
    return (
      <LinearGradient colors={['#000033', '#001155', '#0a1a5f']} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.successGold} />
      </LinearGradient>
    )
  }

  if (error || !transcript) {
    return (
      <LinearGradient colors={['#000033', '#001155', '#0a1a5f']} style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Transcript not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchTranscript()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </LinearGradient>
    )
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          hasAudio && { paddingBottom: 200 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.successGold}
          />
        }
      >
        {/* Dark header with stats */}
        <LinearGradient colors={['#000033', '#001155']} style={styles.header}>
          {/* Back + Share row */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backIcon}>{'\u2190'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareBtnIcon}>{'\u{1F4E4}'}</Text>
            </TouchableOpacity>
          </View>

          {/* Salesperson + date */}
          <Text style={styles.headerName}>{transcript.salesperson_name}</Text>
          <View style={styles.headerMeta}>
            {transcript.area_type && (
              <View style={styles.areaBadge}>
                <Text style={styles.areaBadgeText}>{transcript.area_type}</Text>
              </View>
            )}
            <Text style={styles.headerDate}>{formatDate(transcript.created_at)}</Text>
          </View>

          {/* Stats row: interactions | pitches | sales */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={[styles.statBox, selectedCategory === 'interactions' && styles.statBoxActive]}
              onPress={() => setSelectedCategory(selectedCategory === 'interactions' ? 'all' : 'interactions')}
            >
              <Text style={styles.statNumber}>{conversationCounts.interactions}</Text>
              <Text style={styles.statLabel}>Interactions</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={[styles.statBox, selectedCategory === 'pitches' && styles.statBoxActive]}
              onPress={() => setSelectedCategory(selectedCategory === 'pitches' ? 'all' : 'pitches')}
            >
              <Text style={styles.statNumber}>{conversationCounts.pitches}</Text>
              <Text style={styles.statLabel}>Pitches</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={[styles.statBox, selectedCategory === 'sales' && styles.statBoxActive]}
              onPress={() => setSelectedCategory(selectedCategory === 'sales' ? 'all' : 'sales')}
            >
              <Text style={[styles.statNumber, { color: '#10B981' }]}>{conversationCounts.sales}</Text>
              <Text style={styles.statLabel}>Sales</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Interactive Transcript — collapsed by default to avoid rendering thousands of Pressables */}
        {hasWords && (
          <View style={styles.section}>
            {transcriptExpanded ? (
              <InteractiveTranscript
                words={words}
                piiMatches={piiMatches}
                currentTimeRef={currentTimeRef}
                onWordPress={handleWordPress}
                salesRepSpeaker="A"
              />
            ) : (
              <TouchableOpacity
                style={styles.expandTranscriptBtn}
                onPress={() => setTranscriptExpanded(true)}
              >
                <Text style={styles.expandTranscriptTitle}>Interactive Transcript</Text>
                <Text style={styles.expandTranscriptHint}>
                  Tap to load {words.length.toLocaleString()} words · tap any word to jump to that moment
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Fallback: Simple text */}
        {!hasWords && transcriptText && (
          <View style={styles.section}>
            <View style={styles.textCard}>
              <Text style={styles.sectionTitle}>Transcript</Text>
              <Text style={styles.simpleTranscript}>{transcriptText}</Text>
            </View>
          </View>
        )}

        {/* Filters */}
        {hasConversations && (
          <View style={styles.section}>
            <ConversationFilters
              conversations={conversations}
              selectedCategory={
                selectedCategory === 'all'
                  ? 'all'
                  : CATEGORY_MAP[selectedCategory] || 'all'
              }
              selectedObjection={selectedObjection}
              onCategoryChange={handleFilterCategoryChange}
              onObjectionChange={setSelectedObjection}
            />
          </View>
        )}

        {/* Conversation List */}
        {hasConversations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {filteredConversations.length} Conversation
              {filteredConversations.length !== 1 ? 's' : ''}
            </Text>
            {filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                onPress={() => handleConversationPress(conversation)}
                isFavorited={favoritedIds.has(conversation.id)}
                onToggleFavorite={handleToggleFavorite}
                isUpvoted={upvotedIds.has(conversation.id)}
                upvoteCount={upvoteCounts[conversation.id] || 0}
                onToggleUpvote={handleToggleUpvote}
                onShare={handleShareToChat}
              />
            ))}
          </View>
        )}

        {/* Empty / Processing state */}
        {!hasWords && !transcriptText && (
          <View style={styles.processingSection}>
            <ActivityIndicator
              size="large"
              color={colors.successGold}
              style={{ marginBottom: spacing.md }}
            />
            <Text style={styles.processingText}>Transcription in progress...</Text>
            <Text style={styles.processingSubtext}>Pull to refresh to check status</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Audio Player */}
      {hasAudio && (
        <View style={styles.floatingPlayer}>
          <AdvancedAudioPlayer
            ref={audioPlayerRef}
            audioPath={audioPath}
            bucketName="call-recordings"
            conversations={conversations}
            words={words}
            onTimeUpdate={handleTimeUpdate}
            onPlayingChange={handlePlayingChange}
          />
        </View>
      )}

      {/* Share to Chat Modal */}
      {shareConversation && (
        <ShareToChatModal
          visible={shareModalVisible}
          onClose={() => {
            setShareModalVisible(false)
            setShareConversation(null)
          }}
          transcriptId={id}
          conversationTitle={`${transcript.salesperson_name} - Conversation #${shareConversation.conversation_number}`}
          timestampStart={shareConversation.start_time}
          timestampEnd={shareConversation.end_time}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },

  // ─── Header ───────────────────────────────────
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnIcon: {
    fontSize: 16,
  },
  headerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  areaBadge: {
    backgroundColor: 'rgba(243, 156, 18, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  areaBadgeText: {
    color: '#f39c12',
    fontSize: 12,
    fontWeight: '600',
  },
  headerDate: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 17, 85, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statBoxActive: {
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
  },
  statNumber: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // ─── Expand transcript button ────────────────
  expandTranscriptBtn: {
    backgroundColor: 'rgba(0, 17, 85, 0.5)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.25)',
    alignItems: 'center',
    gap: 6,
  },
  expandTranscriptTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  expandTranscriptHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
  },

  // ─── Sections ─────────────────────────────────
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  // ─── Text fallback ────────────────────────────
  textCard: {
    backgroundColor: 'rgba(0, 17, 85, 0.5)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  simpleTranscript: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 24,
  },

  // ─── Processing state ─────────────────────────
  processingSection: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  processingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
  },
  processingSubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // ─── Error ────────────────────────────────────
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.successGold,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },

  // ─── Floating player ─────────────────────────
  floatingPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
})
