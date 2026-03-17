import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { MemberRecording } from '../../services/bigfive.service'

interface AllRecordingsSectionProps {
  recordings: MemberRecording[]
  onPress: (transcriptId: string) => void
}

type SortKey = 'newest' | 'oldest' | 'most_sales' | 'area'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'most_sales', label: 'Most Sales' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'area', label: 'Area A–Z' },
]

const AREA_COLORS: Record<string, string> = {
  residential: '#3b82f6',
  commercial: '#8b5cf6',
  retail: '#10b981',
  apartment: '#f59e0b',
  rural: '#6b7280',
}

function areaColor(area: string | null): string {
  if (!area) return '#4b5563'
  return AREA_COLORS[area.toLowerCase()] || '#4b5563'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PAGE_SIZE = 5

export default function AllRecordingsSection({
  recordings,
  onPress,
}: AllRecordingsSectionProps) {
  const [sort, setSort] = useState<SortKey>('newest')
  const [areaFilter, setAreaFilter] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  // Unique area types from data
  const areas = useMemo(() => {
    const set = new Set<string>()
    recordings.forEach((r) => { if (r.area_type) set.add(r.area_type) })
    return Array.from(set).sort()
  }, [recordings])

  const hasMiscArea = useMemo(() => recordings.some((r) => !r.area_type), [recordings])

  const sorted = useMemo(() => {
    setPage(0)
    let list: typeof recordings
    if (areaFilter === '__misc__') list = recordings.filter((r) => !r.area_type)
    else if (areaFilter) list = recordings.filter((r) => r.area_type === areaFilter)
    else list = [...recordings]

    switch (sort) {
      case 'newest':
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'most_sales':
        list.sort((a, b) => b.actual_sales_count - a.actual_sales_count)
        break
      case 'area':
        list.sort((a, b) => (a.area_type || '').localeCompare(b.area_type || ''))
        break
    }
    return list
  }, [recordings, sort, areaFilter])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const displayed = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (recordings.length === 0) return null

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.title}>All Recordings</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </Text>
        </View>
      </View>

      {/* Sort chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setSort(opt.key)}
            style={[styles.chip, sort === opt.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, sort === opt.key && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Area filter chips */}
      {(areas.length > 0 || hasMiscArea) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          <TouchableOpacity
            onPress={() => setAreaFilter(null)}
            style={[styles.areaChip, areaFilter === null && styles.areaChipActive]}
          >
            <Text style={[styles.areaChipText, areaFilter === null && styles.areaChipTextActive]}>
              All Areas
            </Text>
          </TouchableOpacity>
          {areas.map((area) => (
            <TouchableOpacity
              key={area}
              onPress={() => setAreaFilter(areaFilter === area ? null : area)}
              style={[
                styles.areaChip,
                areaFilter === area && { backgroundColor: areaColor(area), borderColor: areaColor(area) },
              ]}
            >
              <Text
                style={[
                  styles.areaChipText,
                  areaFilter === area && styles.areaChipTextActive,
                ]}
              >
                {area.charAt(0).toUpperCase() + area.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          {hasMiscArea && (
            <TouchableOpacity
              onPress={() => setAreaFilter(areaFilter === '__misc__' ? null : '__misc__')}
              style={[styles.areaChip, areaFilter === '__misc__' && styles.areaChipActive]}
            >
              <Text style={[styles.areaChipText, areaFilter === '__misc__' && styles.areaChipTextActive]}>
                Misc
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Recording cards */}
      <View style={styles.list}>
        {displayed.map((rec) => (
          <TouchableOpacity
            key={rec.id}
            style={styles.card}
            onPress={() => onPress(rec.id)}
            activeOpacity={0.75}
          >
            {/* Left: date + area */}
            <View style={styles.cardLeft}>
              <Text style={styles.cardDate}>{formatDate(rec.created_at)}</Text>
              <View style={styles.cardMeta}>
                {rec.area_type ? (
                  <View style={[styles.areaBadge, { backgroundColor: areaColor(rec.area_type) + '33', borderColor: areaColor(rec.area_type) + '66' }]}>
                    <Text style={[styles.areaBadgeText, { color: areaColor(rec.area_type) }]}>
                      {rec.area_type.charAt(0).toUpperCase() + rec.area_type.slice(1)}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.areaBadge, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)' }]}>
                    <Text style={[styles.areaBadgeText, { color: 'rgba(255,255,255,0.35)' }]}>
                      Misc
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Right: stats + play icon */}
            <View style={styles.cardRight}>
              <View style={styles.stat}>
                <Text style={styles.statIcon}>{'✅'}</Text>
                <Text style={styles.statValue}>{rec.actual_sales_count}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statIcon}>{'💬'}</Text>
                <Text style={styles.statValue}>{rec.conversation_count}</Text>
              </View>
              <Text style={styles.playIcon}>{'›'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
            onPress={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <Text style={[styles.pageBtnText, page === 0 && styles.pageBtnTextDisabled]}>
              {'‹'} Prev
            </Text>
          </TouchableOpacity>
          <Text style={styles.pageIndicator}>
            {page + 1} / {totalPages}
          </Text>
          <TouchableOpacity
            style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled]}
            onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <Text style={[styles.pageBtnText, page >= totalPages - 1 && styles.pageBtnTextDisabled]}>
              Next {'›'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(243, 156, 18, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    color: '#f39c12',
    fontSize: 12,
    fontWeight: '700',
  },
  chipScroll: {
    marginBottom: 8,
  },
  chipRow: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipActive: {
    backgroundColor: '#f39c12',
    borderColor: '#f39c12',
  },
  chipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  areaChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  areaChipActive: {
    backgroundColor: 'rgba(243,156,18,0.2)',
    borderColor: '#f39c12',
  },
  areaChipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  areaChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 17, 85, 0.55)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardLeft: {
    flex: 1,
    gap: 6,
  },
  cardDate: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  areaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  areaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 13,
  },
  statValue: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    minWidth: 20,
  },
  playIcon: {
    color: '#f39c12',
    fontSize: 24,
    fontWeight: '300',
    marginLeft: 4,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  pageBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.35)',
  },
  pageBtnDisabled: {
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pageBtnText: {
    color: '#f39c12',
    fontSize: 13,
    fontWeight: '700',
  },
  pageBtnTextDisabled: {
    color: 'rgba(255,255,255,0.2)',
  },
  pageIndicator: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
})
