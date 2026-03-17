import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { colors, spacing, typography, borderRadius, categoryColors, objectionColors } from '../../theme/tokens'
import { Conversation } from '../../types'

interface ConversationFiltersProps {
  conversations: Conversation[]
  selectedCategory: string
  selectedObjection: string
  onCategoryChange: (category: string) => void
  onObjectionChange: (objection: string) => void
}

export default function ConversationFilters({
  conversations,
  selectedCategory,
  selectedObjection,
  onCategoryChange,
  onObjectionChange,
}: ConversationFiltersProps) {
  const counts = {
    all: conversations.length,
    interaction: conversations.filter((c) => c.category === 'interaction').length,
    pitch: conversations.filter((c) => c.category === 'pitch').length,
    sale: conversations.filter((c) => c.category === 'sale').length,
  }

  // Gather unique objections with counts
  const objectionCounts: Record<string, number> = {}
  conversations.forEach((c) => {
    (c.objections || []).forEach((obj) => {
      objectionCounts[obj] = (objectionCounts[obj] || 0) + 1
    })
  })
  const hasObjections = Object.keys(objectionCounts).length > 0

  const categoryChips = [
    { key: 'all', label: `All (${counts.all})`, activeBg: colors.midnightBlue, activeText: '#fff', bg: colors.gray100, text: colors.gray700 },
    { key: 'interaction', label: `Interactions (${counts.interaction})`, activeBg: categoryColors.interaction.active, activeText: '#fff', bg: categoryColors.interaction.bg, text: '#1E3A5F' },
    { key: 'pitch', label: `Pitches (${counts.pitch})`, activeBg: categoryColors.pitch.active, activeText: '#fff', bg: categoryColors.pitch.bg, text: '#78350F' },
    { key: 'sale', label: `Sales (${counts.sale})`, activeBg: categoryColors.sale.active, activeText: '#fff', bg: categoryColors.sale.bg, text: '#064E3B' },
  ]

  const formatObjectionLabel = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <View style={styles.container}>
      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {categoryChips.map((chip) => {
          const isActive = selectedCategory === chip.key
          return (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.chip,
                { backgroundColor: isActive ? chip.activeBg : chip.bg },
              ]}
              onPress={() => onCategoryChange(chip.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: isActive ? chip.activeText : chip.text }]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Objection chips */}
      {hasObjections && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor:
                  selectedObjection === 'all' ? colors.midnightBlue : colors.gray100,
              },
            ]}
            onPress={() => onObjectionChange('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                { color: selectedObjection === 'all' ? '#fff' : colors.gray700 },
              ]}
            >
              All Objections
            </Text>
          </TouchableOpacity>

          {Object.entries(objectionCounts).map(([objection, count]) => {
            const isActive = selectedObjection === objection
            const colorSet = objectionColors[objection] || { bg: colors.gray100, text: colors.gray700 }
            return (
              <TouchableOpacity
                key={objection}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? colorSet.text : colorSet.bg,
                  },
                ]}
                onPress={() => onObjectionChange(objection)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isActive ? '#fff' : colorSet.text },
                  ]}
                >
                  {formatObjectionLabel(objection)} ({count})
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  chipRow: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
})
