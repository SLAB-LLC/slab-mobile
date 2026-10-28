import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTenantTheme, useLabels } from '../tenant'

/**
 * Library tab. Holds the bookshelf, book tests and the company's resource
 * catalog once phase 7 lands; for now it marks the spot.
 */
export default function LibraryScreen() {
  const { colors, brandName } = useTenantTheme()
  const labels = useLabels()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.icon}>{'\u{1F4DA}'}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{labels.tabs.library}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Books, scripts and {brandName} resources are moving in. Check back soon.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  sub: { fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 21 },
})
