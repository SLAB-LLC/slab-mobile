import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

interface DayData {
  date: string          // YYYY-MM-DD
  salesCount: number
  conversationCount: number
  areaType?: string
  transcriptId?: string
}

interface SalesHeatMapProps {
  year: number
  month: number  // 0-indexed
  dayData: DayData[]
  onDayPress?: (day: DayData) => void
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getHeatColor(salesCount: number): string {
  if (salesCount === 0) return 'rgba(255,255,255,0.05)'
  if (salesCount <= 2) return 'rgba(243, 156, 18, 0.2)'
  if (salesCount <= 5) return 'rgba(243, 156, 18, 0.4)'
  if (salesCount <= 10) return 'rgba(243, 156, 18, 0.6)'
  if (salesCount <= 20) return 'rgba(243, 156, 18, 0.8)'
  return '#f39c12'
}

export default function SalesHeatMap({ year, month, dayData, onDayPress }: SalesHeatMapProps) {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startDayOfWeek = firstDayOfMonth.getDay() // 0=Sun

  const monthName = firstDayOfMonth.toLocaleString('default', { month: 'long' })

  // Build a map for quick lookup
  const dataMap = new Map<string, DayData>()
  dayData.forEach((d) => dataMap.set(d.date, d))

  // Build the calendar grid
  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = Array(startDayOfWeek).fill(null)

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  const handleDayTap = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const data = dataMap.get(dateStr)
    if (data) {
      // Toggle the preview panel; navigation happens via the "View Recordings" button
      setSelectedDay(selectedDay?.date === dateStr ? null : data)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.monthTitle}>{monthName} {year}</Text>

      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>{label}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={di} style={styles.dayCell} />
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const data = dataMap.get(dateStr)
            const salesCount = data?.salesCount || 0
            const isSelected = selectedDay?.date === dateStr

            return (
              <TouchableOpacity
                key={di}
                style={[
                  styles.dayCell,
                  { backgroundColor: getHeatColor(salesCount) },
                  isSelected && styles.dayCellSelected,
                ]}
                onPress={() => handleDayTap(day)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayText, salesCount > 10 && styles.dayTextDark]}>
                  {day}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      ))}

      {/* Expanded day preview */}
      {selectedDay && (
        <View style={styles.preview}>
          <Text style={styles.previewDate}>
            {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <View style={styles.previewStats}>
            <View style={styles.previewStat}>
              <Text style={styles.previewValue}>{selectedDay.salesCount}</Text>
              <Text style={styles.previewLabel}>Sales</Text>
            </View>
            <View style={styles.previewStat}>
              <Text style={styles.previewValue}>{selectedDay.conversationCount}</Text>
              <Text style={styles.previewLabel}>Convos</Text>
            </View>
            {selectedDay.areaType && (
              <View style={styles.previewStat}>
                <Text style={styles.previewValue}>{selectedDay.areaType}</Text>
                <Text style={styles.previewLabel}>Area</Text>
              </View>
            )}
          </View>
          {onDayPress && (
            <TouchableOpacity
              style={styles.viewRecordingsBtn}
              onPress={() => onDayPress(selectedDay)}
              activeOpacity={0.75}
            >
              <Text style={styles.viewRecordingsBtnText}>View Recordings</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Less</Text>
        {[0, 2, 5, 10, 20, 30].map((n) => (
          <View key={n} style={[styles.legendBox, { backgroundColor: getHeatColor(n) }]} />
        ))}
        <Text style={styles.legendLabel}>More</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 17, 85, 0.7)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.2)',
  },
  monthTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  dayText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  dayTextDark: {
    color: '#000',
    fontWeight: '700',
  },
  preview: {
    marginTop: 12,
    backgroundColor: 'rgba(0, 0, 51, 0.5)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.3)',
  },
  previewDate: {
    color: '#f39c12',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  previewStats: {
    flexDirection: 'row',
    gap: 16,
  },
  previewStat: {
    alignItems: 'center',
  },
  previewValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  previewLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  viewRecordingsBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.4)',
  },
  viewRecordingsBtnText: {
    color: '#f39c12',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
})
