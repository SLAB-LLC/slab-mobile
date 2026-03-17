import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, typography, borderRadius } from '../../theme/tokens'
import Card from '../common/Card'
import { Transcript } from '../../types'

interface RecordingInfoCardProps {
  transcript: Transcript
  formatDate: (dateString: string) => string
}

export default function RecordingInfoCard({ transcript, formatDate }: RecordingInfoCardProps) {
  const hasContext =
    transcript.actual_sales_count != null ||
    transcript.expected_customer_count != null ||
    transcript.area_type ||
    transcript.estimated_duration_hours != null ||
    transcript.upload_notes

  return (
    <Card variant="default" padding="medium">
      <Text style={styles.sectionTitle}>Recording Information</Text>

      <InfoRow label="DATE & TIME" value={formatDate(transcript.created_at)} />
      <InfoRow label="SALESPERSON" value={transcript.salesperson_name} />
      <InfoRow label="ORIGINAL FILENAME" value={transcript.original_filename} />

      {transcript.redaction_config_used && (
        <View style={styles.row}>
          <Text style={styles.label}>PII REDACTION</Text>
          <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.badgeText, { color: '#92400E' }]}>
              {transcript.redaction_config_used}
            </Text>
          </View>
        </View>
      )}

      {hasContext && (
        <>
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Recording Context</Text>

          {transcript.actual_sales_count != null && (
            <InfoRow
              label="ACTUAL SALES"
              value={`${transcript.actual_sales_count} sale${transcript.actual_sales_count !== 1 ? 's' : ''}`}
            />
          )}

          {transcript.expected_customer_count != null && (
            <InfoRow
              label="CUSTOMERS TALKED TO"
              value={`${transcript.expected_customer_count} customer${transcript.expected_customer_count !== 1 ? 's' : ''}`}
            />
          )}

          {transcript.area_type && (
            <View style={styles.row}>
              <Text style={styles.label}>AREA TYPE</Text>
              <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
                <Text style={[styles.badgeText, { color: '#1E40AF' }]}>
                  {transcript.area_type}
                </Text>
              </View>
            </View>
          )}

          {transcript.estimated_duration_hours != null && (
            <InfoRow
              label="ESTIMATED DURATION"
              value={`${transcript.estimated_duration_hours} hour${transcript.estimated_duration_hours !== 1 ? 's' : ''}`}
            />
          )}

          {transcript.upload_notes && (
            <View style={styles.row}>
              <Text style={styles.label}>UPLOAD NOTES</Text>
              <Text style={[styles.value, { fontStyle: 'italic' }]}>
                {transcript.upload_notes}
              </Text>
            </View>
          )}
        </>
      )}
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    flex: 0.4,
  },
  value: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 0.6,
    textAlign: 'right',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.md,
  },
})
