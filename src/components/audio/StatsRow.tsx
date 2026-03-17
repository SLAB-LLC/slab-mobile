import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface StatsRowProps {
  bestDay: number
  bestSummer: number
  bestWeek: number
  retentionPercentage: number
}

export default function StatsRow({ bestDay, bestSummer, bestWeek, retentionPercentage }: StatsRowProps) {
  const stats = [
    { label: 'BD', value: bestDay.toString(), description: 'Best Day' },
    { label: 'Best Summer', value: bestSummer.toString(), description: 'Best Summer' },
    { label: 'BW', value: bestWeek.toString(), description: 'Best Week' },
    { label: 'Retention', value: `${retentionPercentage}%`, description: 'Retention' },
  ]

  return (
    <View style={styles.container}>
      {stats.map((stat, i) => (
        <View key={stat.label} style={styles.statItem}>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 17, 85, 0.7)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.2)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#f39c12',
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
})
