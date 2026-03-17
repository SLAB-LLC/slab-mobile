import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface StreakDisplayProps {
  currentStreak: number
  longestStreak: number
  activityDays: number[] // 0-6 (Sun-Sat) for this week
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function getFireColorByWeek(streak: number) {
  const weekNumber = Math.floor(streak / 7) % 6

  const colorSchemes = [
    { color: '#ff0844', glow: 'rgba(255, 8, 68, 0.8)' },    // Week 1: Red
    { color: '#ff5733', glow: 'rgba(255, 87, 51, 0.8)' },    // Week 2: Orange
    { color: '#00d9ff', glow: 'rgba(0, 217, 255, 0.8)' },    // Week 3: Blue
    { color: '#9d4edd', glow: 'rgba(157, 78, 221, 0.8)' },   // Week 4: Purple
    { color: '#ffd700', glow: 'rgba(255, 215, 0, 0.8)' },    // Week 5: Gold
    { color: '#00ff88', glow: 'rgba(0, 255, 136, 0.8)' },    // Week 6: Green
  ]

  return colorSchemes[weekNumber]
}

export default function StreakDisplay({ currentStreak, longestStreak, activityDays }: StreakDisplayProps) {
  const fireColor = getFireColorByWeek(currentStreak)
  const today = new Date().getDay()

  return (
    <View style={styles.container}>
      {/* Streak number + fire */}
      <View style={styles.streakRow}>
        <Text style={styles.fireEmoji}>{'\u{1F525}'}</Text>
        <Text style={[styles.streakNumber, { color: fireColor.color }]}>
          {currentStreak}
        </Text>
        <Text style={styles.streakLabel}>day streak</Text>
      </View>

      {longestStreak > currentStreak && (
        <Text style={styles.longestText}>Best: {longestStreak} days</Text>
      )}

      {/* Weekly activity calendar */}
      <View style={styles.weekRow}>
        {DAY_LABELS.map((label, i) => {
          const isActive = activityDays.includes(i)
          const isToday = i === today

          return (
            <View key={i} style={styles.dayColumn}>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {label}
              </Text>
              <View
                style={[
                  styles.dayDot,
                  isActive && { backgroundColor: fireColor.color },
                  isToday && styles.dayDotToday,
                ]}
              >
                {isActive && (
                  <Text style={styles.dayFire}>{'\u{1F525}'}</Text>
                )}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 17, 85, 0.6)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.2)',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fireEmoji: {
    fontSize: 28,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: '800',
  },
  streakLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
  },
  longestText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    marginLeft: 40,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  dayLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  dayLabelToday: {
    color: '#f39c12',
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotToday: {
    borderWidth: 2,
    borderColor: '#f39c12',
  },
  dayFire: {
    fontSize: 16,
  },
})
