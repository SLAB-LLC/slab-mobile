import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

interface CompanyRankProps {
  rank: number
  total: number
  onPress: () => void
}

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'] // gold, silver, bronze

export default function CompanyRank({ rank, total, onPress }: CompanyRankProps) {
  const isTop3 = rank >= 1 && rank <= 3
  const medal = isTop3 ? MEDALS[rank - 1] : null

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.left}>
          {medal ? (
            <Text style={styles.medal}>{medal}</Text>
          ) : (
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>#{rank}</Text>
            </View>
          )}
          <View>
            <Text style={styles.title}>Company Rank</Text>
            <Text style={styles.subtitle}>
              #{rank} of {total} members
            </Text>
          </View>
        </View>
        <Text style={styles.arrow}>{'\u203A'}</Text>
      </View>
    </TouchableOpacity>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medal: {
    fontSize: 36,
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(243, 156, 18, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    color: '#f39c12',
    fontSize: 18,
    fontWeight: '800',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 2,
  },
  arrow: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 28,
    fontWeight: '300',
  },
})
