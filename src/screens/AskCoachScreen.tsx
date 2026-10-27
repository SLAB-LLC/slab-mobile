import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../context/AuthContext'
import { useTenantTheme } from '../tenant'
import { askCoach, CoachMessage } from '../services/coach.service'

/** How many past messages are kept on the phone and sent with each question */
const HISTORY_LIMIT = 40

const historyKey = (userId: string) => `slab.coachChat.${userId}`

/**
 * Ask Marshall: one-on-one chat with the company's AI coach.
 * The coach's name and face come from the tenant theme.
 */
export default function AskCoachScreen() {
  const { user, profile, company } = useAuth()
  const theme = useTenantTheme()
  const { colors, coach } = theme

  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList<CoachMessage>>(null)

  // Restore this rep's conversation
  useEffect(() => {
    if (!user?.id) return
    AsyncStorage.getItem(historyKey(user.id))
      .then((raw) => {
        if (raw) setMessages(JSON.parse(raw))
      })
      .catch(() => {})
  }, [user?.id])

  const save = (next: CoachMessage[]) => {
    if (user?.id) {
      AsyncStorage.setItem(historyKey(user.id), JSON.stringify(next.slice(-HISTORY_LIMIT))).catch(() => {})
    }
  }

  const send = async () => {
    const text = draft.trim()
    if (!text || sending || !user?.id) return

    const withQuestion: CoachMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(withQuestion)
    setDraft('')
    setSending(true)

    try {
      const reply = await askCoach(withQuestion.slice(-HISTORY_LIMIT), {
        coachName: coach.name,
        userId: user.id,
        userName: profile?.display_name || profile?.full_name || null,
        companyId: company?.id ?? null,
        companyName: company?.name ?? null,
      })
      const next: CoachMessage[] = [...withQuestion, { role: 'assistant', content: reply }]
      setMessages(next)
      save(next)
    } catch (err) {
      console.error('Coach error:', err)
      const next: CoachMessage[] = [
        ...withQuestion,
        { role: 'assistant', content: `${coach.name} couldn't answer right now. Try again in a minute.` },
      ]
      setMessages(next)
    } finally {
      setSending(false)
    }
  }

  const coachFace = coach.avatarUrl ? (
    <Image source={{ uri: coach.avatarUrl }} style={styles.face} />
  ) : (
    <View style={[styles.face, { backgroundColor: colors.accent }]}>
      <Text style={[styles.faceInitial, { color: colors.onAccent }]}>{coach.name.charAt(0)}</Text>
    </View>
  )

  const renderMessage = ({ item }: { item: CoachMessage }) => {
    const mine = item.role === 'user'
    return (
      <View style={[styles.row, mine && styles.rowMine]}>
        {!mine && coachFace}
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: colors.accent }
              : { backgroundColor: colors.surface, borderColor: colors.accentLine, borderWidth: 1 },
          ]}
        >
          <Text style={[styles.bubbleText, { color: mine ? colors.onAccent : colors.text }]}>
            {item.content}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <View style={styles.hero}>
            <View style={styles.heroFace}>{coachFace}</View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Ask {coach.name}</Text>
            <Text style={[styles.heroSub, { color: colors.textMuted }]}>
              Objections, closes, mindset, anything from the doors.
            </Text>
          </View>
        }
        ListFooterComponent={
          sending ? (
            <View style={styles.row}>
              {coachFace}
              <ActivityIndicator color={colors.accent} style={styles.typing} />
            </View>
          ) : null
        }
      />

      <View style={[styles.composer, { borderTopColor: colors.accentLine, backgroundColor: colors.header }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceRaised }]}
          placeholder={`Ask ${coach.name}...`}
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          onPress={send}
          disabled={!draft.trim() || sending}
          style={[
            styles.send,
            { backgroundColor: colors.accent, opacity: !draft.trim() || sending ? 0.4 : 1 },
          ]}
        >
          <Text style={[styles.sendText, { color: colors.onAccent }]}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 24, gap: 10 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  heroFace: { transform: [{ scale: 1.8 }], marginBottom: 24 },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroSub: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowMine: { justifyContent: 'flex-end' },
  face: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  faceInitial: { fontSize: 15, fontWeight: '800' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  typing: { marginLeft: 8, marginBottom: 8 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
  },
  send: { height: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center' },
  sendText: { fontSize: 15, fontWeight: '700' },
})
