import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { TOS_SECTIONS, TOS_LAST_UPDATED } from '../data/termsOfService'
import { useCompanyColors } from '../hooks/useCompanyColors'

const LAST_UPDATED = TOS_LAST_UPDATED
const SECTIONS = TOS_SECTIONS

export default function TermsOfServiceScreen() {
  const { bgGradient } = useCompanyColors()
  return (
    <LinearGradient
      colors={bgGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>📋</Text>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.subtitle}>SLAB Voice</Text>
          <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>
        </View>

        {/* Intro */}
        <View style={styles.introBanner}>
          <Text style={styles.introText}>
            Please read these Terms carefully before using SLAB Voice. They govern your use of our app and services.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} SLAB Training. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#f39c12',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  lastUpdated: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  introBanner: {
    backgroundColor: 'rgba(243, 156, 18, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.3)',
    padding: 16,
    marginBottom: 20,
  },
  introText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'rgba(0, 17, 85, 0.7)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  sectionTitle: {
    color: '#f39c12',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    marginTop: 12,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
  },
})
