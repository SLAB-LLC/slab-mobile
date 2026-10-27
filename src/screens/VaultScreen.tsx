import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { useTenantTheme, useLabels } from '../tenant'
import * as transcriptsService from '../services/transcripts.service'
import { Transcript } from '../types'
import TrendingScreen from './TrendingScreen'

type VaultTab = 'days' | 'reels'

interface RepSection {
  title: string
  data: Transcript[]
}

// A bare YYYY-MM-DD date is read as local noon so it never shifts a day
const formatDay = (value: string) =>
  new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

/**
 * The Vault: real door recordings.
 * Full Days lists every recorded day the rep can see, grouped by the rep who
 * knocked it. Reels shows the most upvoted conversations.
 * (Phase 6 replaces both with the demo's Days + Reels players.)
 */
export default function VaultScreen() {
  const { user } = useAuth()
  const { colors } = useTenantTheme()
  const labels = useLabels()
  const navigation = useNavigation<any>()

  const [tab, setTab] = useState<VaultTab>('days')
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDays = async () => {
    if (!user?.id) return
    try {
      setTranscripts(await transcriptsService.getTranscripts(user.id))
    } catch (err) {
      console.error('Error fetching vault days:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDays()
  }, [user?.id])

  const sections = useMemo<RepSection[]>(() => {
    const byRep = new Map<string, Transcript[]>()
    for (const t of transcripts) {
      const name = t.salesperson_name || 'Unknown rep'
      byRep.set(name, [...(byRep.get(name) ?? []), t])
    }
    return Array.from(byRep, ([title, data]) => ({ title, data })).sort((a, b) =>
      a.title.localeCompare(b.title)
    )
  }, [transcripts])

  const tabButton = (key: VaultTab, label: string) => {
    const active = tab === key
    return (
      <TouchableOpacity
        style={[
          styles.tab,
          { borderColor: colors.accentLine },
          active && { backgroundColor: colors.accent, borderColor: colors.accent },
        ]}
        onPress={() => setTab(key)}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabText, { color: active ? colors.onAccent : colors.text }]}>{label}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.accent }]}>{labels.tabs.vault.toUpperCase()}</Text>
      <View style={styles.tabs}>
        {tabButton('days', 'Full Days')}
        {tabButton('reels', 'Reels')}
      </View>

      {tab === 'reels' ? (
        <TrendingScreen />
      ) : loading ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.accent} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                fetchDays()
              }}
              tintColor={colors.accent}
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.repHeader}>
              <View style={[styles.repFace, { backgroundColor: colors.accent }]}>
                <Text style={[styles.repInitial, { color: colors.onAccent }]}>
                  {section.title.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.repName, { color: colors.text }]}>{section.title}</Text>
              <Text style={[styles.repCount, { color: colors.textMuted }]}>
                {section.data.length} day{section.data.length === 1 ? '' : 's'}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.day, { backgroundColor: colors.surface, borderColor: colors.accentLine }]}
              onPress={() => navigation.navigate('TranscriptDetail', { id: item.id })}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayDate, { color: colors.text }]}>
                {formatDay(item.recording_date || item.created_at)}
              </Text>
              {!!item.area_type && (
                <Text style={[styles.dayMeta, { color: colors.textMuted }]}>{item.area_type}</Text>
              )}
              <Text style={[styles.play, { color: colors.accent }]}>{'▶'}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.text }]}>No days in the Vault yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Recorded days show up here once they're processed.
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: 3, textAlign: 'center', marginTop: 16 },
  tabs: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 14, marginBottom: 6 },
  tab: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: '700' },
  loading: { marginTop: 48 },
  list: { padding: 16, paddingBottom: 32 },
  repHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 8 },
  repFace: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  repInitial: { fontSize: 16, fontWeight: '800' },
  repName: { flex: 1, fontSize: 17, fontWeight: '700' },
  repCount: { fontSize: 13 },
  day: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  dayDate: { flex: 1, fontSize: 15, fontWeight: '600' },
  dayMeta: { fontSize: 13 },
  play: { fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 48, paddingHorizontal: 24 },
  emptyText: { fontSize: 17, fontWeight: '700' },
  emptySub: { fontSize: 14, marginTop: 6, textAlign: 'center' },
})
