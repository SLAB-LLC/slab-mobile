import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import type { DailyUsageStat } from '../../services/stats.service'

interface UsageStatsProps {
  weeklyStats: DailyUsageStat[]
  monthlyStats: DailyUsageStat[]
  lifetimeTotals: { total_active_minutes: number; transcript_views: number }
  totalActivities: number
  currentStreak: number
  longestStreak: number
}

type Period = '7d' | '30d' | 'all'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const BAR_MAX_HEIGHT = 72

function buildWeekGrid(stats: DailyUsageStat[]): Array<{ label: string; minutes: number; isToday: boolean }> {
  const result: Array<{ label: string; minutes: number; isToday: boolean }> = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const found = stats.find((s) => s.date === dateStr)
    result.push({
      label: DAY_LABELS[d.getDay()],
      minutes: found?.total_active_minutes || 0,
      isToday: i === 0,
    })
  }
  return result
}

export default function UsageStats({
  weeklyStats,
  monthlyStats,
  lifetimeTotals,
  totalActivities,
  currentStreak,
  longestStreak,
}: UsageStatsProps) {
  const [period, setPeriod] = useState<Period>('7d')

  const grid = buildWeekGrid(weeklyStats)
  const maxMinutes = Math.max(...grid.map((d) => d.minutes), 1)

  const minutes7d = weeklyStats.reduce((s, d) => s + d.total_active_minutes, 0)
  const minutes30d = monthlyStats.reduce((s, d) => s + d.total_active_minutes, 0)
  const minutesAll = lifetimeTotals.total_active_minutes

  const transcripts7d = weeklyStats.reduce((s, d) => s + d.transcript_views, 0)
  const transcripts30d = monthlyStats.reduce((s, d) => s + d.transcript_views, 0)
  const transcriptsAll = lifetimeTotals.transcript_views

  const todayMinutes =
    weeklyStats.find((d) => d.date === new Date().toISOString().split('T')[0])
      ?.total_active_minutes || 0

  const PERIODS: { key: Period; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: 'all', label: 'All Time' },
  ]

  const periodMinutes = period === '7d' ? minutes7d : period === '30d' ? minutes30d : minutesAll
  const periodTranscripts = period === '7d' ? transcripts7d : period === '30d' ? transcripts30d : transcriptsAll
  const periodMinLabel = period === '7d' ? 'Min (7d)' : period === '30d' ? 'Min (30d)' : 'Min (All)'
  const periodTxLabel = period === '7d' ? 'Sessions (7d)' : period === '30d' ? 'Sessions (30d)' : 'Sessions (All)'

  const summaryStats = [
    { label: 'Min Today', value: todayMinutes.toString(), icon: '\u{23F1}' },
    { label: periodMinLabel, value: periodMinutes.toString(), icon: '\u{1F4CA}' },
    { label: periodTxLabel, value: periodTranscripts.toString(), icon: '\u{1F3A7}' },
    { label: 'Days Active', value: totalActivities.toString(), icon: '\u{1F4C5}' },
  ]

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Activity</Text>

      {/* Weekly bar chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartTop}>
          <Text style={styles.chartLabel}>Minutes Active — Last 7 Days</Text>
          {/* Period toggle */}
          <View style={styles.periodToggle}>
            {PERIODS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.periodChip, period === key && styles.periodChipActive]}
                onPress={() => setPeriod(key)}
              >
                <Text style={[styles.periodChipText, period === key && styles.periodChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.barsRow}>
          {grid.map((day, i) => {
            const barH = maxMinutes > 0 ? Math.max(3, (day.minutes / maxMinutes) * BAR_MAX_HEIGHT) : 3
            return (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { height: barH },
                      day.isToday && styles.barToday,
                      day.minutes === 0 && styles.barEmpty,
                    ]}
                  />
                </View>
                {day.minutes > 0 && (
                  <Text style={[styles.barValue, day.isToday && styles.barValueToday]}>
                    {day.minutes}
                  </Text>
                )}
                <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                  {day.label}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* Summary stat cards */}
      <View style={styles.grid}>
        {summaryStats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  chartCard: {
    backgroundColor: 'rgba(0, 17, 85, 0.6)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.15)',
    marginBottom: 10,
  },
  chartTop: {
    marginBottom: 14,
    gap: 10,
  },
  chartLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  periodToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  periodChipActive: {
    backgroundColor: '#f39c12',
    borderColor: '#f39c12',
  },
  periodChipText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
  },
  periodChipTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_MAX_HEIGHT + 36,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '60%',
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bar: {
    width: '100%',
    backgroundColor: '#f39c12',
    borderRadius: 4,
  },
  barToday: {
    backgroundColor: '#f39c12',
    shadowColor: '#f39c12',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  barEmpty: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  barValue: {
    color: 'rgba(243, 156, 18, 0.7)',
    fontSize: 9,
    marginTop: 3,
    fontWeight: '700',
  },
  barValueToday: {
    color: '#f39c12',
  },
  dayLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  dayLabelToday: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '47%',
    backgroundColor: 'rgba(0, 17, 85, 0.6)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.15)',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  statValue: {
    color: '#f39c12',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 3,
  },
})
