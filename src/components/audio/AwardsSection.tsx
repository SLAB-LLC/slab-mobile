import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { BigFiveAward } from '../../services/bigfive.service'

interface AwardsSectionProps {
  awards: BigFiveAward[]
}

export default function AwardsSection({ awards }: AwardsSectionProps) {
  if (awards.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Awards</Text>
      {awards.map((award) => (
        <View key={award.id} style={styles.awardRow}>
          <Text style={styles.trophy}>{'\u{1F3C6}'}</Text>
          <View style={styles.awardInfo}>
            <Text style={styles.awardTitle}>{award.title}</Text>
            <Text style={styles.awardYear}>{award.year}</Text>
          </View>
        </View>
      ))}
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
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  awardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  trophy: {
    fontSize: 24,
  },
  awardInfo: {
    flex: 1,
  },
  awardTitle: {
    color: '#f39c12',
    fontSize: 15,
    fontWeight: '600',
  },
  awardYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
})
