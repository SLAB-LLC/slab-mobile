import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors, spacing, typography, borderRadius } from '../../theme/tokens'
import Card from '../common/Card'

interface ConversationStatsProps {
  total: number
  interactions: number
  pitches: number
  sales: number
  selectedCategory?: 'all' | 'interactions' | 'pitches' | 'sales'
  onCategorySelect?: (category: 'all' | 'interactions' | 'pitches' | 'sales') => void
}

const STAT_ITEMS = [
  { key: 'all', label: 'TOTAL', countColor: colors.gray900 },
  { key: 'interactions', label: 'INTERACTIONS', countColor: '#2563EB' },
  { key: 'pitches', label: 'PITCHES', countColor: '#D97706' },
  { key: 'sales', label: 'SALES', countColor: '#059669' },
] as const

export default function ConversationStats({
  total,
  interactions,
  pitches,
  sales,
  selectedCategory = 'all',
  onCategorySelect,
}: ConversationStatsProps) {
  const counts: Record<string, number> = { all: total, interactions, pitches, sales }

  return (
    <Card variant="default" padding="medium">
      <Text style={styles.title}>Conversations</Text>
      <View style={styles.grid}>
        {STAT_ITEMS.map((item) => {
          const isSelected = selectedCategory === item.key
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.cell,
                isSelected && [styles.cellSelected, { borderColor: item.countColor }],
              ]}
              onPress={() =>
                onCategorySelect &&
                onCategorySelect(item.key as typeof selectedCategory)
              }
              activeOpacity={0.7}
            >
              <Text style={styles.cellLabel}>{item.label}</Text>
              <Text style={[styles.cellCount, { color: item.countColor }]}>
                {counts[item.key]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  title: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  cellSelected: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cellCount: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
})
