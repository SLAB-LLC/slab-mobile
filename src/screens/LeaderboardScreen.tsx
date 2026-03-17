import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../context/AuthContext'
import { getCompanyLeaderboard, LeaderboardEntry } from '../services/stats.service'
import { colors } from '../theme/tokens'

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']
const PODIUM_ORDER = [1, 0, 2] // render 2nd, 1st, 3rd left-to-right

function Avatar({
  entry,
  size,
  borderColor,
}: {
  entry: LeaderboardEntry
  size: number
  borderColor: string
}) {
  const initials = (entry.display_name || entry.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor,
        overflow: 'hidden',
        backgroundColor: '#1a1a4e',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {entry.profile_picture_url ? (
        <Image
          source={{ uri: entry.profile_picture_url }}
          style={{ width: size, height: size }}
        />
      ) : (
        <Text style={{ color: '#fff', fontSize: size * 0.33, fontWeight: '700' }}>
          {initials}
        </Text>
      )}
    </View>
  )
}

function PodiumCard({
  entry,
  rank,
  isFirst,
}: {
  entry: LeaderboardEntry
  rank: number
  isFirst: boolean
}) {
  const medalColor = MEDAL_COLORS[rank - 1]
  const avatarSize = isFirst ? 72 : 58

  return (
    <View style={[podiumStyles.card, isFirst && podiumStyles.cardFirst]}>
      {/* Rank badge */}
      <View style={[podiumStyles.rankBadge, { backgroundColor: medalColor }]}>
        <Text style={podiumStyles.rankBadgeText}>{rank}</Text>
      </View>

      {isFirst && <Text style={podiumStyles.crown}>👑</Text>}

      <Avatar entry={entry} size={avatarSize} borderColor={medalColor} />

      <Text style={[podiumStyles.name, isFirst && podiumStyles.nameFirst]} numberOfLines={1}>
        {entry.display_name || entry.email}
      </Text>

      <Text style={[podiumStyles.streak, { color: medalColor }]}>
        {entry.current_streak}
      </Text>
      <Text style={podiumStyles.days}>days</Text>
    </View>
  )
}

const podiumStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  cardFirst: {
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderColor: 'rgba(255,215,0,0.35)',
    paddingVertical: 18,
    marginTop: -10,
  },
  rankBadge: {
    position: 'absolute',
    top: -10,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  crown: {
    fontSize: 22,
    marginBottom: 4,
  },
  name: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  nameFirst: {
    fontSize: 15,
  },
  streak: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  days: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
})

export default function LeaderboardScreen() {
  const { user, company } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLeaderboard = async () => {
    if (!company?.id) return
    try {
      const data = await getCompanyLeaderboard(company.id)
      setEntries(data)
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchLeaderboard() }, [company?.id])

  const onRefresh = () => { setRefreshing(true); fetchLeaderboard() }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  if (loading) {
    return (
      <LinearGradient colors={['#000033', '#001199', '#0a1a5f']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.successGold} />
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={['#000033', '#001199', '#0a1a5f']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.successGold} />
        }
      >
        <Text style={styles.title}>
          {'\u{1F525}'} Streak Leaderboard
        </Text>
        <Text style={styles.subtitle}>Top performers ranked by current streak</Text>

        {/* ── Podium top 3 ── */}
        {top3.length >= 1 && (
          <View style={styles.podiumRow}>
            {PODIUM_ORDER.map((idx) => {
              const entry = top3[idx]
              if (!entry) return <View key={idx} style={{ flex: 1 }} />
              return (
                <PodiumCard
                  key={entry.user_id}
                  entry={entry}
                  rank={idx + 1}
                  isFirst={idx === 0}
                />
              )
            })}
          </View>
        )}

        {/* ── All participants ── */}
        {entries.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>All Participants</Text>
            {entries.map((item, index) => {
              const rank = item.company_rank || index + 1
              const isCurrentUser = item.user_id === user?.id
              const initials = (item.display_name || item.email || '?')
                .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

              return (
                <View
                  key={item.user_id}
                  style={[styles.row, isCurrentUser && styles.rowCurrent]}
                >
                  <Text style={styles.rowRank}>#{rank}</Text>

                  {/* Avatar */}
                  <View style={styles.rowAvatar}>
                    {item.profile_picture_url ? (
                      <Image source={{ uri: item.profile_picture_url }} style={styles.rowAvatarImg} />
                    ) : (
                      <Text style={styles.rowAvatarText}>{initials}</Text>
                    )}
                  </View>

                  {/* Name */}
                  <View style={styles.rowNameCol}>
                    <Text style={[styles.rowName, isCurrentUser && styles.rowNameCurrent]} numberOfLines={1}>
                      {item.display_name || item.email}
                      {isCurrentUser ? ' (You)' : ''}
                    </Text>
                    <Text style={styles.rowSub}>{item.total_activities} days active</Text>
                  </View>

                  {/* Streak */}
                  <View style={styles.rowStreakCol}>
                    <Text style={styles.rowStreakNum}>{item.current_streak}</Text>
                    <Text style={styles.rowStreakLabel}>{'\u{1F525}'} Current</Text>
                  </View>

                  {/* Best */}
                  <View style={styles.rowBestCol}>
                    <Text style={styles.rowBestNum}>{item.longest_streak}</Text>
                    <Text style={styles.rowBestLabel}>Best</Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {entries.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No leaderboard data yet.</Text>
            <Text style={styles.emptySubtext}>Start listening to build your streak!</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  listSection: {
    marginHorizontal: 16,
    marginBottom: 30,
  },
  listTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,165,0,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.25)',
  },
  rowCurrent: {
    borderColor: colors.successGold,
    backgroundColor: 'rgba(243,156,18,0.18)',
  },
  rowRank: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    width: 36,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a4e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  rowAvatarImg: {
    width: 40,
    height: 40,
  },
  rowAvatarText: {
    color: colors.successGold,
    fontSize: 15,
    fontWeight: '700',
  },
  rowNameCol: { flex: 1 },
  rowName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rowNameCurrent: { color: colors.successGold },
  rowSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 1 },
  rowStreakCol: { alignItems: 'center', marginRight: 12 },
  rowStreakNum: { color: colors.successGold, fontSize: 20, fontWeight: '900' },
  rowStreakLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  rowBestCol: { alignItems: 'center' },
  rowBestNum: { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '700' },
  rowBestLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8 },
})
