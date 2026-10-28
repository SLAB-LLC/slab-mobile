import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useCompanyColors } from '../hooks/useCompanyColors'

const SUPPORT_EMAIL = 'duncan@slabtraining.com'
const SUPPORT_PHONE = '2082126891'
const SUPPORT_PHONE_DISPLAY = '(208) 212-6891'

const CONTACT_OPTIONS = [
  {
    icon: '\u{1F4E7}',
    label: 'Email Us',
    value: SUPPORT_EMAIL,
    description: 'Best for detailed issues or questions.',
    action: () => {
      Linking.openURL(
        `mailto:${SUPPORT_EMAIL}?subject=SLAB%20Voice%20Support&body=Hi%20Duncan%2C%0A%0AI%20need%20help%20with%3A%0A`
      ).catch(() => Alert.alert('Error', 'Could not open email app.'))
    },
  },
  {
    icon: '\u{1F4AC}',
    label: 'Text Us',
    value: SUPPORT_PHONE_DISPLAY,
    description: 'Quick questions? Send a text.',
    action: () => {
      const url = Platform.OS === 'ios'
        ? `sms:${SUPPORT_PHONE}&body=Hi%20Duncan%2C%20I%20need%20help%20with%20SLAB%20Voice.`
        : `sms:${SUPPORT_PHONE}?body=Hi%20Duncan%2C%20I%20need%20help%20with%20SLAB%20Voice.`
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open messages app.'))
    },
  },
  {
    icon: '\u{1F4DE}',
    label: 'Call Us',
    value: SUPPORT_PHONE_DISPLAY,
    description: 'Urgent issues — call directly.',
    action: () => {
      Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
        Alert.alert('Error', 'Could not open phone app.')
      )
    },
  },
]

export default function SupportScreen() {
  const { bgGradient } = useCompanyColors()
  return (
    <LinearGradient
      colors={bgGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{'\u{1F6A8}'}</Text>
        <Text style={styles.title}>Support</Text>
        <Text style={styles.subtitle}>
          Having an issue? We're here to help. Tap any option below and we'll get back to you fast.
        </Text>
      </View>

      {/* Contact cards */}
      <View style={styles.cards}>
        {CONTACT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={styles.card}
            onPress={opt.action}
            activeOpacity={0.75}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardIcon}>{opt.icon}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{opt.label}</Text>
                <Text style={styles.cardValue}>{opt.value}</Text>
                <Text style={styles.cardDesc}>{opt.description}</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer note */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          SLAB Voice Support{'\n'}
          Typical response time: within a few hours
        </Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  cards: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 17, 85, 0.7)',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.2)',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 28,
    marginRight: 16,
    width: 36,
    textAlign: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  cardValue: {
    color: '#f39c12',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 3,
  },
  chevron: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 24,
    fontWeight: '300',
    marginLeft: 8,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
})
