import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const LAST_UPDATED = 'March 17, 2026'

interface Section {
  title: string
  body: string
}

const SECTIONS: Section[] = [
  {
    title: '1. Acceptance of Terms',
    body:
      'By downloading, installing, or using SLAB Voice ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App. These Terms constitute a legally binding agreement between you and SLAB Training.',
  },
  {
    title: '2. Description of Service',
    body:
      'SLAB Voice is an AI-powered sales call transcription and analytics platform. The App enables authorized users to record sales conversations, generate transcripts with automatic PII redaction, access training videos, and collaborate with their team through leaderboards, messaging, and performance insights.',
  },
  {
    title: '3. Eligibility & Account Access',
    body:
      'Access to the App is granted exclusively to authorized employees and representatives of companies that have an active SLAB Training subscription. You must be at least 18 years old to use the App. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.',
  },
  {
    title: '4. Recording Consent & Legal Compliance',
    body:
      'IMPORTANT: Recording laws vary by jurisdiction. Before recording any conversation, you are solely responsible for obtaining all legally required consents from all parties. Many jurisdictions require the consent of all parties to a conversation before it may be recorded ("all-party consent" or "two-party consent" laws). By using the recording feature, you represent and warrant that you have obtained all required consents and are in full compliance with applicable federal, state, and local recording laws. SLAB Training assumes no liability for your failure to comply with recording laws.',
  },
  {
    title: '5. Data & Privacy',
    body:
      'The App processes audio recordings, transcripts, and associated metadata on behalf of your employer (the subscribing company). Personal information collected or generated through the App is subject to the SLAB Training Privacy Policy. PII redaction is performed automatically as a convenience feature; it does not guarantee the complete removal of all personal data from transcripts. You should not upload recordings that contain sensitive information beyond what is necessary for your legitimate sales activities.',
  },
  {
    title: '6. Acceptable Use',
    body:
      'You agree not to: (a) use the App for any unlawful purpose or in violation of any applicable laws; (b) record individuals without their legally required consent; (c) share your account credentials with any third party; (d) attempt to reverse-engineer, decompile, or tamper with the App; (e) upload malicious content or attempt to circumvent security measures; or (f) use the App to harass, defame, or harm any individual.',
  },
  {
    title: '7. Intellectual Property',
    body:
      'All content, features, and functionality of the App—including software, design, text, graphics, and logos—are owned by SLAB Training and are protected by applicable intellectual property laws. Your use of the App does not grant you any ownership rights. Transcripts and recordings generated through your use remain the property of the subscribing company.',
  },
  {
    title: '8. Disclaimers',
    body:
      'THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. SLAB TRAINING DOES NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES. AI-GENERATED TRANSCRIPTS MAY CONTAIN INACCURACIES; THEY ARE PROVIDED FOR INFORMATIONAL PURPOSES ONLY AND SHOULD NOT BE RELIED UPON AS VERBATIM RECORDS.',
  },
  {
    title: '9. Limitation of Liability',
    body:
      'TO THE FULLEST EXTENT PERMITTED BY LAW, SLAB TRAINING SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATING TO YOUR USE OF THE APP, INCLUDING BUT NOT LIMITED TO DAMAGES ARISING FROM UNAUTHORIZED RECORDINGS, DATA BREACHES, OR TRANSCRIPT INACCURACIES.',
  },
  {
    title: '10. Termination',
    body:
      'SLAB Training may suspend or terminate your access to the App at any time, with or without notice, for conduct that violates these Terms or is otherwise harmful to other users, SLAB Training, or third parties. Upon termination, your right to use the App ceases immediately.',
  },
  {
    title: '11. Changes to Terms',
    body:
      'SLAB Training reserves the right to modify these Terms at any time. Updated Terms will be made available within the App. Your continued use of the App after changes are posted constitutes your acceptance of the revised Terms.',
  },
  {
    title: '12. Governing Law',
    body:
      'These Terms are governed by the laws of the State of Idaho, United States, without regard to its conflict-of-law provisions. Any disputes arising under these Terms shall be resolved exclusively in the state or federal courts located in Idaho.',
  },
  {
    title: '13. Contact',
    body:
      'If you have questions about these Terms, please contact us at:\n\nSLAB Training\nduncan@slabtraining.com\n(208) 212-6891',
  },
]

export default function TermsOfServiceScreen() {
  return (
    <LinearGradient
      colors={['#000033', '#001199', '#0a1a5f']}
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
