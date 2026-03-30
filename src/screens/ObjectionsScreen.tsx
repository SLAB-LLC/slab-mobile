import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { Conversation } from '../types'
import {
  getBigFiveMembers,
  getMemberSalespersonNames,
  BigFiveMember,
} from '../services/bigfive.service'
import { getConversationsBySalespersonNames } from '../services/conversations.service'
import * as favoritesService from '../services/favorites.service'
import * as upvotesService from '../services/upvotes.service'
import { colors, borderRadius, categoryColors, objectionColors } from '../theme/tokens'
import ConversationPlayerModal from '../components/audio/ConversationPlayerModal'
import ShareToChatModal from '../components/chat/ShareToChatModal'

type EnrichedConversation = Conversation & {
  salesperson_name: string
  transcript_date: string
  area_type?: string
  audio_path: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  sale: 'Sale', pitch: 'Pitch', interaction: 'Interaction',
}
const CATEGORY_BADGE: Record<string, { bg: string; text: string }> = {
  interaction: { bg: categoryColors.interaction.bg, text: '#1E40AF' },
  pitch: { bg: categoryColors.pitch.bg, text: '#92400E' },
  sale: { bg: categoryColors.sale.bg, text: '#065F46' },
}
const FALLBACK_OBJECTION = { bg: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.7)' }

export default function ObjectionsScreen() {
  const { user, profile } = useAuth()
  const navigation = useNavigation<any>()

  const [allConvos, setAllConvos] = useState<EnrichedConversation[]>([])
  const [members, setMembers] = useState<BigFiveMember[]>([])
  const [salespersonToMember, setSalespersonToMember] = useState<Map<string, BigFiveMember>>(new Map())
  const [loading, setLoading] = useState(true)
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set())
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>({})

  // Player modal
  const [playerVisible, setPlayerVisible] = useState(false)
  const [playerIndex, setPlayerIndex] = useState(0)

  // Share modal
  const [shareConvo, setShareConvo] = useState<EnrichedConversation | null>(null)
  const [shareVisible, setShareVisible] = useState(false)

  // Filters
  const [selectedMember, setSelectedMember] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedObjection, setSelectedObjection] = useState<string>('all')
  const [selectedArea, setSelectedArea] = useState<string>('all')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const membersData = await getBigFiveMembers()
      const activeMembers = membersData.filter((m) => m.is_active)
      setMembers(activeMembers)

      const allNames: string[] = []
      const nameMap = new Map<string, BigFiveMember>()
      for (const m of activeMembers) {
        const names = await getMemberSalespersonNames(m.id)
        names.forEach((n) => nameMap.set(n, m))
        allNames.push(...names)
      }
      setSalespersonToMember(nameMap)

      if (allNames.length === 0) { setAllConvos([]); setLoading(false); return }

      const convos = await getConversationsBySalespersonNames(allNames)
      setAllConvos(convos)

      if (user?.id) {
        const ids = convos.map((c) => c.id)
        const favIds = await favoritesService.getFavoritedConversationIds(user.id, ids)
        setFavoritedIds(favIds)
        const upIds = await upvotesService.getUserUpvotedIds(user.id, ids)
        setUpvotedIds(upIds)
        const counts = await upvotesService.getUpvoteCounts(ids)
        setUpvoteCounts(counts)
      }
    } catch (err) {
      console.error('Error fetching objections data:', err)
    } finally {
      setLoading(false)
    }
  }

  const uniqueAreas = useMemo(() => {
    const set = new Set<string>()
    allConvos.forEach((c) => { if (c.area_type) set.add(c.area_type) })
    return Array.from(set).sort()
  }, [allConvos])

  const hasMiscArea = useMemo(() => allConvos.some((c) => !c.area_type), [allConvos])

  const uniqueObjections = useMemo(() => {
    const counts = new Map<string, number>()
    allConvos.forEach((c) => { c.objections?.forEach((obj) => counts.set(obj, (counts.get(obj) || 0) + 1)) })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count }))
  }, [allConvos])

  const filtered = useMemo(() => {
    let result = allConvos.filter((c) => c.objections && c.objections.length > 0)
    if (selectedCategory !== 'all') result = result.filter((c) => c.category === selectedCategory)
    if (selectedObjection !== 'all') result = result.filter((c) => c.objections?.includes(selectedObjection))
    if (selectedMember !== 'all') {
      const member = members.find((m) => m.id === selectedMember)
      if (member) result = result.filter((c) => c.salesperson_name.toLowerCase().includes(member.name.split(' ')[0].toLowerCase()))
    }
    if (selectedArea === '__misc__') result = result.filter((c) => !c.area_type)
    else if (selectedArea !== 'all') result = result.filter((c) => c.area_type === selectedArea)
    return result
  }, [allConvos, selectedCategory, selectedObjection, selectedMember, selectedArea, members])

  const handleToggleFavorite = useCallback(async (convo: EnrichedConversation) => {
    if (!user?.id || !profile?.company_id) return
    const isFav = favoritedIds.has(convo.id)
    const next = await favoritesService.toggleFavorite(user.id, profile.company_id, convo.id, isFav)
    setFavoritedIds((prev) => {
      const s = new Set(prev)
      if (next) s.add(convo.id)
      else s.delete(convo.id)
      return s
    })
  }, [user?.id, profile?.company_id, favoritedIds])

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

  const formatObjection = (obj: string) => obj.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const renderItem = ({ item, index }: { item: EnrichedConversation; index: number }) => {
    const badge = CATEGORY_BADGE[item.category] || CATEGORY_BADGE.interaction

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setPlayerIndex(index)
          setPlayerVisible(true)
        }}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Conv #{item.conversation_number}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {CATEGORY_LABELS[item.category] || item.category}
            </Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {favoritedIds.has(item.id) && (
              <Text style={styles.favStar}>{'\u2B50'}</Text>
            )}
            <Text style={styles.playHint}>{'\u25B6'} Play</Text>
          </View>
        </View>

        <Text style={styles.salesperson}>{item.salesperson_name}</Text>

        {/* Color-coded objection chips */}
        <View style={styles.objectionRow}>
          {item.objections.map((obj, i) => {
            const c = objectionColors[obj] || FALLBACK_OBJECTION
            return (
              <View key={i} style={[styles.objectionChip, { backgroundColor: c.bg }]}>
                <Text style={[styles.objectionChipText, { color: c.text }]}>{formatObjection(obj)}</Text>
              </View>
            )
          })}
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
      <Text style={styles.title}>{'\u274C'} Objections</Text>
      <Text style={styles.subtitle}>
        {filtered.length} conversation{filtered.length !== 1 ? 's' : ''} · tap any to listen
      </Text>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['all', 'interaction', 'pitch', 'sale'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                {cat === 'all' ? 'All Types' : CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {uniqueObjections.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, selectedObjection === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedObjection('all')}
            >
              <Text style={[styles.filterChipText, selectedObjection === 'all' && styles.filterChipTextActive]}>
                All Objections
              </Text>
            </TouchableOpacity>
            {uniqueObjections.map(({ type, count }) => {
              const c = objectionColors[type] || FALLBACK_OBJECTION
              const isSelected = selectedObjection === type
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    isSelected && { backgroundColor: c.bg, borderColor: c.text, borderWidth: 1 },
                  ]}
                  onPress={() => setSelectedObjection(type)}
                >
                  <Text style={[styles.filterChipText, isSelected && { color: c.text, fontWeight: '700' }]}>
                    {formatObjection(type)} ({count})
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}

        {members.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, selectedMember === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedMember('all')}
            >
              <Text style={[styles.filterChipText, selectedMember === 'all' && styles.filterChipTextActive]}>
                All Members
              </Text>
            </TouchableOpacity>
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.filterChip, selectedMember === m.id && styles.filterChipActive]}
                onPress={() => setSelectedMember(m.id)}
              >
                <Text style={[styles.filterChipText, selectedMember === m.id && styles.filterChipTextActive]}>
                  {m.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {(uniqueAreas.length > 0 || hasMiscArea) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, selectedArea === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedArea('all')}
            >
              <Text style={[styles.filterChipText, selectedArea === 'all' && styles.filterChipTextActive]}>
                All Areas
              </Text>
            </TouchableOpacity>
            {uniqueAreas.map((area) => (
              <TouchableOpacity
                key={area}
                style={[styles.filterChip, selectedArea === area && styles.filterChipActive]}
                onPress={() => setSelectedArea(area)}
              >
                <Text style={[styles.filterChipText, selectedArea === area && styles.filterChipTextActive]}>
                  {area.charAt(0).toUpperCase() + area.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
            {hasMiscArea && (
              <TouchableOpacity
                style={[styles.filterChip, selectedArea === '__misc__' && styles.filterChipActive]}
                onPress={() => setSelectedArea('__misc__')}
              >
                <Text style={[styles.filterChipText, selectedArea === '__misc__' && styles.filterChipTextActive]}>
                  Misc
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\u274C'}</Text>
            <Text style={styles.emptyText}>No objections found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />

      {/* Spotify-style player modal — passes the currently filtered list */}
      <ConversationPlayerModal
        visible={playerVisible}
        conversations={filtered}
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
  title: { color: '#fff', fontSize: 22, fontWeight: '800', paddingHorizontal: 20, paddingTop: 4 },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, paddingHorizontal: 20, marginTop: 4 },
  filtersSection: { paddingTop: 12, gap: 6 },
  filterRow: { paddingHorizontal: 16, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)', marginRight: 6,
  },
  filterChipActive: { backgroundColor: colors.successGold },
  filterChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#000' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: 'rgba(0, 0, 18, 0.82)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardHeaderRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  favStar: { color: colors.successGold, fontSize: 13 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  playHint: { color: colors.successGold, fontSize: 12, fontWeight: '700' },
  salesperson: { color: colors.successGold, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  objectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  objectionChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  objectionChipText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 6 },
})
