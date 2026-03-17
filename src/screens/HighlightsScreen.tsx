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
import { useRoute, useNavigation } from '@react-navigation/native'
import { getBigFiveMemberById, getMemberSalespersonNames, BigFiveMember } from '../services/bigfive.service'
import { supabase } from '../utils/supabase'
import { colors } from '../theme/tokens'

interface RecordingDay {
  date: string
  salesCount: number
  conversationCount: number
  areaType: string
  transcriptId: string
}

export default function HighlightsScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const { memberId } = route.params

  const [member, setMember] = useState<BigFiveMember | null>(null)
  const [recordings, setRecordings] = useState<RecordingDay[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'date' | 'sales'>('date')

  useEffect(() => {
    fetchData()
  }, [memberId])

  const fetchData = async () => {
    try {
      const [memberData, names] = await Promise.all([
        getBigFiveMemberById(memberId),
        getMemberSalespersonNames(memberId),
      ])
      setMember(memberData)

      if (names.length === 0) {
        setRecordings([])
        setLoading(false)
        return
      }

      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('id, created_at, actual_sales_count, area_type')
        .in('salesperson_name', names)
        .order('created_at', { ascending: false })

      if (!transcripts) {
        setRecordings([])
        setLoading(false)
        return
      }

      // Count conversations per transcript
      const ids = transcripts.map((t) => t.id)
      const { data: convos } = await supabase
        .from('conversations')
        .select('transcript_id')
        .in('transcript_id', ids)

      const convoCounts: Record<string, number> = {}
      convos?.forEach((c) => {
        convoCounts[c.transcript_id] = (convoCounts[c.transcript_id] || 0) + 1
      })

      setRecordings(
        transcripts.map((t) => ({
          date: t.created_at.split('T')[0],
          salesCount: t.actual_sales_count || 0,
          conversationCount: convoCounts[t.id] || 0,
          areaType: t.area_type || 'Unknown',
          transcriptId: t.id,
        }))
      )
    } catch (err) {
      console.error('Error fetching highlights:', err)
    } finally {
      setLoading(false)
    }
  }

  const sortedRecordings = [...recordings].sort((a, b) => {
    if (sortBy === 'sales') return b.salesCount - a.salesCount
    return b.date.localeCompare(a.date)
  })

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
      style={styles.container}
    >
      <Text style={styles.title}>
        {member?.name || 'Member'} — Highlights
      </Text>

      {/* Sort toggles */}
      <View style={styles.sortRow}>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'date' && styles.sortBtnActive]}
          onPress={() => setSortBy('date')}
        >
          <Text style={[styles.sortBtnText, sortBy === 'date' && styles.sortBtnTextActive]}>By Date</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'sales' && styles.sortBtnActive]}
          onPress={() => setSortBy('sales')}
        >
          <Text style={[styles.sortBtnText, sortBy === 'sales' && styles.sortBtnTextActive]}>By Sales</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedRecordings}
        keyExtractor={(item) => item.transcriptId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('TranscriptDetail', { id: item.transcriptId })}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardDate}>
                {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.cardArea}>{item.areaType}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardSales}>{item.salesCount} sales</Text>
              <Text style={styles.cardConvos}>{item.conversationCount} convos</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No recordings yet</Text>
          </View>
        }
      />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    padding: 20,
    paddingBottom: 8,
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  sortBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sortBtnActive: {
    backgroundColor: '#f39c12',
  },
  sortBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  sortBtnTextActive: {
    color: '#000',
  },
  list: { padding: 16, gap: 8 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 17, 85, 0.6)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardLeft: {},
  cardDate: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cardArea: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  cardRight: { alignItems: 'flex-end' },
  cardSales: { color: '#f39c12', fontSize: 16, fontWeight: '800' },
  cardConvos: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
})
