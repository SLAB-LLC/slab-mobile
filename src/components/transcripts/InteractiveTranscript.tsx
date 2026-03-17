import React, { useState, useEffect, useMemo, memo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native'
import { colors, spacing, typography, borderRadius } from '../../theme/tokens'
import Card from '../common/Card'
import { Word, PiiMatch } from '../../types'

interface InteractiveTranscriptProps {
  words: Word[]
  piiMatches?: PiiMatch[]
  currentTimeRef: { current: number }
  onWordPress?: (word: Word) => void
  salesRepSpeaker?: string
}

// Web-matching speaker colors
const SPEAKER_1_COLOR = '#1a1a1a' // charcoal
const SPEAKER_2_COLOR = '#f39c12' // success-gold
const SPEAKER_3_COLOR = '#9B59B6'
const SPEAKER_4_COLOR = '#27AE60'

const SWAPPED_COLORS: Record<string, string> = {
  A: SPEAKER_2_COLOR,
  B: SPEAKER_1_COLOR,
  C: SPEAKER_3_COLOR,
  D: SPEAKER_4_COLOR,
}

const DEFAULT_COLORS: Record<string, string> = {
  A: SPEAKER_1_COLOR,
  B: SPEAKER_2_COLOR,
  C: SPEAKER_3_COLOR,
  D: SPEAKER_4_COLOR,
}

const HIGHLIGHT_BG = 'rgba(243, 156, 18, 0.3)' // gold at 30%

function formatPageTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Binary search to find the word at current playback time
function findCurrentWordIndex(words: Word[], time: number): number {
  if (words.length === 0 || time < words[0].start) return -1
  let lo = 0
  let hi = words.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    if (time < words[mid].start) {
      hi = mid - 1
    } else if (time > words[mid].end) {
      lo = mid + 1
    } else {
      return mid
    }
  }
  return -1
}

interface GroupedLine {
  speaker: string
  words: Word[]
  startTime: number
}

const PAGE_DURATION = 120 // 2 minutes per page

const InteractiveTranscript = memo(function InteractiveTranscript({
  words,
  piiMatches = [],
  currentTimeRef,
  onWordPress,
  salesRepSpeaker = 'A',
}: InteractiveTranscriptProps) {
  const [colorsSwapped, setColorsSwapped] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [currentPage, setCurrentPage] = useState(0)

  const speakerColors = colorsSwapped ? SWAPPED_COLORS : DEFAULT_COLORS

  // Build a set for fast PII lookup
  const piiRanges = useMemo(() => piiMatches, [piiMatches])

  const isWordRedacted = useCallback(
    (word: Word): boolean =>
      piiRanges.some((m) => word.start >= m.start && word.end <= m.end),
    [piiRanges]
  )

  // Pre-build word → index map so lookup is O(1) instead of O(n) per word
  const wordIndexMap = useMemo(() => {
    const map = new Map<Word, number>()
    words.forEach((w, i) => map.set(w, i))
    return map
  }, [words])

  // Group words into lines by speaker changes and pauses
  const groupedLines = useMemo<GroupedLine[]>(() => {
    if (words.length === 0) return []
    const lines: GroupedLine[] = []
    let currentSpeaker = words[0].speaker || 'A'
    let currentLine: Word[] = []
    let lineStartTime = words[0].start

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const speaker = word.speaker || 'A'

      const shouldBreak =
        speaker !== currentSpeaker ||
        (i > 0 && word.start - words[i - 1].end > 2)

      if (shouldBreak && currentLine.length > 0) {
        lines.push({ speaker: currentSpeaker, words: currentLine, startTime: lineStartTime })
        currentLine = []
        currentSpeaker = speaker
        lineStartTime = word.start
      }

      currentLine.push(word)
    }

    if (currentLine.length > 0) {
      lines.push({ speaker: currentSpeaker, words: currentLine, startTime: lineStartTime })
    }

    return lines
  }, [words])

  // Paginate groupedLines into 2-minute time windows
  const pages = useMemo(() => {
    if (groupedLines.length === 0) return []
    const result: GroupedLine[][] = []
    let page: GroupedLine[] = []
    let pageStart = groupedLines[0].startTime

    for (const line of groupedLines) {
      if (line.startTime >= pageStart + PAGE_DURATION && page.length > 0) {
        result.push(page)
        page = []
        pageStart = line.startTime
      }
      page.push(line)
    }
    if (page.length > 0) result.push(page)
    return result
  }, [groupedLines])

  // Internal interval reads from ref — parent never needs to re-render for time updates
  useEffect(() => {
    const interval = setInterval(() => {
      const next = findCurrentWordIndex(words, currentTimeRef.current)
      setCurrentWordIndex((prev) => (prev !== next ? next : prev))

      // Auto-advance page to follow playback
      if (next !== -1 && pages.length > 1) {
        const playingTime = words[next].start
        setCurrentPage((prev) => {
          const pagLines = pages[prev]
          if (!pagLines || pagLines.length === 0) return prev
          const pageStartTime = pagLines[0].startTime
          const pageEndTime = pagLines[pagLines.length - 1].words[pagLines[pagLines.length - 1].words.length - 1]?.end ?? pageStartTime + PAGE_DURATION
          if (playingTime >= pageStartTime && playingTime <= pageEndTime) return prev
          // Find the page containing the playing word
          for (let i = 0; i < pages.length; i++) {
            const p = pages[i]
            const pStart = p[0].startTime
            const lastLine = p[p.length - 1]
            const pEnd = lastLine.words[lastLine.words.length - 1]?.end ?? pStart + PAGE_DURATION
            if (playingTime >= pStart && playingTime <= pEnd) return i
          }
          return prev
        })
      }
    }, 250)
    return () => clearInterval(interval)
  }, [words, currentTimeRef, pages])

  const getSpeakerLabel = (speaker: string): string => {
    if (speaker === salesRepSpeaker) return 'Speaker 1'
    if (speaker === (salesRepSpeaker === 'A' ? 'B' : 'A')) return 'Speaker 2'
    return `Speaker ${speaker}`
  }

  if (words.length === 0) {
    return (
      <Card variant="default" padding="large">
        <Text style={styles.emptyText}>
          No transcript words available for interactive display
        </Text>
      </Card>
    )
  }

  const otherSpeaker = salesRepSpeaker === 'A' ? 'B' : 'A'

  return (
    <Card variant="default" padding="medium">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Interactive Transcript</Text>
          <Text style={styles.subtitle}>
            Tap any word to jump to that moment in the audio
          </Text>
        </View>

        {/* Speaker Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.speakerDot, { backgroundColor: speakerColors[salesRepSpeaker] }]} />
            <Text style={styles.legendText}>Speaker 1</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.speakerDot, { backgroundColor: speakerColors[otherSpeaker] }]} />
            <Text style={styles.legendText}>Speaker 2</Text>
          </View>
          <TouchableOpacity
            style={styles.swapButton}
            onPress={() => setColorsSwapped(!colorsSwapped)}
          >
            <Text style={styles.swapButtonText}>Swap Colors</Text>
          </TouchableOpacity>
          <View style={styles.legendItem}>
            <View style={[styles.highlightSample, { backgroundColor: HIGHLIGHT_BG }]} />
            <Text style={styles.legendText}>Playing</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Speaker detection is automated and may not be 100% accurate.
        </Text>

        {/* Transcript Body */}
        <ScrollView style={styles.transcript} nestedScrollEnabled>
          {(pages[currentPage] || []).map((line, lineIndex) => {
            const pageLines = pages[currentPage] || []
            const lineColor = speakerColors[line.speaker] || colors.textPrimary
            const lineMinute = Math.floor(line.startTime / 60)
            const prevMinute = lineIndex > 0 ? Math.floor(pageLines[lineIndex - 1].startTime / 60) : -1
            const showTimestamp = lineIndex === 0 || lineMinute > prevMinute

            return (
              <View key={lineIndex} style={styles.line}>
                {showTimestamp && (
                  <View style={styles.timestampMarker}>
                    <View style={styles.timestampLine} />
                    <Text style={styles.timestampText}>{lineMinute}:00</Text>
                    <View style={styles.timestampLine} />
                  </View>
                )}
                <Text style={[styles.lineText, { color: lineColor }]}>
                  {line.words.map((word, wordIndex) => {
                    const isRedacted = isWordRedacted(word)
                    const globalIndex = wordIndexMap.get(word) ?? -1
                    const isPlaying = globalIndex !== -1 && globalIndex === currentWordIndex

                    return (
                      <Text key={wordIndex}>
                        <Pressable
                          onPress={() => !isRedacted && onWordPress && onWordPress(word)}
                          style={({ pressed }) => [
                            {
                              backgroundColor: isPlaying
                                ? HIGHLIGHT_BG
                                : isRedacted
                                  ? 'rgba(243, 156, 18, 0.15)'
                                  : pressed
                                    ? colors.gray100
                                    : 'transparent',
                              borderRadius: 2,
                              paddingHorizontal: 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.word,
                              { color: lineColor },
                              isRedacted && styles.redactedWord,
                              isPlaying && styles.playingWord,
                            ]}
                          >
                            {isRedacted ? '[REDACTED]' : word.word}
                          </Text>
                        </Pressable>
                        <Text> </Text>
                      </Text>
                    )
                  })}
                </Text>
              </View>
            )
          })}
        </ScrollView>

        {/* Page Navigation */}
        {pages.length > 1 && (
          <View style={styles.pageNav}>
            <TouchableOpacity
              style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
              onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <Text style={[styles.pageButtonText, currentPage === 0 && styles.pageButtonTextDisabled]}>‹ Prev</Text>
            </TouchableOpacity>
            <View style={styles.pageInfo}>
              <Text style={styles.pageInfoText}>
                Page {currentPage + 1} of {pages.length}
              </Text>
              <Text style={styles.pageTimeText}>
                {formatPageTime(pages[currentPage]?.[0]?.startTime ?? 0)} – {formatPageTime(
                  (pages[currentPage + 1]?.[0]?.startTime ?? (pages[currentPage]?.[pages[currentPage].length - 1]?.words[pages[currentPage][pages[currentPage].length - 1].words.length - 1]?.end ?? 0))
                )}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.pageButton, currentPage >= pages.length - 1 && styles.pageButtonDisabled]}
              onPress={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
              disabled={currentPage >= pages.length - 1}
            >
              <Text style={[styles.pageButtonText, currentPage >= pages.length - 1 && styles.pageButtonTextDisabled]}>Next ›</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Card>
  )
})

export default InteractiveTranscript

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h4,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  speakerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  highlightSample: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  swapButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.sm,
  },
  swapButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  note: {
    ...typography.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  transcript: {
    maxHeight: 500,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  timestampMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timestampLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray300,
  },
  timestampText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    fontFamily: 'monospace',
  },
  line: {
    marginBottom: spacing.md,
  },
  lineText: {
    ...typography.body,
    lineHeight: 28,
  },
  word: {
    ...typography.body,
  },
  redactedWord: {
    color: '#f39c12',
    fontWeight: '700',
  },
  playingWord: {
    fontWeight: '700',
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  pageNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  pageButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.sm,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    ...typography.caption,
    fontWeight: '600',
    color: '#2c3e50',
  },
  pageButtonTextDisabled: {
    color: colors.textTertiary,
  },
  pageInfo: {
    alignItems: 'center',
    gap: 2,
  },
  pageInfoText: {
    ...typography.caption,
    fontWeight: '600',
    color: '#2c3e50',
  },
  pageTimeText: {
    fontSize: 10,
    color: '#f39c12',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
})
