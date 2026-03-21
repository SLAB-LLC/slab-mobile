import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
  Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { useCompanyColors } from '../hooks/useCompanyColors'
import * as chatService from '../services/chat.service'
import { ChatMessage } from '../services/chat.service'
import { colors } from '../theme/tokens'

export default function ChatRoomScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const { user } = useAuth()
  const { bgGradient } = useCompanyColors()
  const { channelId } = route.params

  const tabBarHeight = useBottomTabBarHeight()
  const [keyboardPad, setKeyboardPad] = useState(0)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSub = Keyboard.addListener(showEvent, (e) => {
      // Keyboard height minus tab bar (which sits below our view)
      setKeyboardPad(Math.max(0, e.endCoordinates.height - tabBarHeight))
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)
    })
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardPad(0))

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [tabBarHeight])

  useEffect(() => {
    fetchMessages()

    // Subscribe to new messages — when our own message arrives, remove the optimistic placeholder
    const unsubscribe = chatService.subscribeToChannel(channelId, (newMsg) => {
      setMessages((prev) => {
        const filtered =
          newMsg.user_id === user?.id
            ? prev.filter((m) => !m.id.startsWith('optimistic-'))
            : prev
        return [...filtered, newMsg]
      })
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    })

    return unsubscribe
  }, [channelId])

  const fetchMessages = async () => {
    setLoading(true)
    const msgs = await chatService.getChannelMessages(channelId)
    setMessages(msgs)
    setLoading(false)
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200)
  }

  const handleSend = async () => {
    if (!inputText.trim() || !user?.id) return
    const text = inputText.trim()
    setInputText('')
    setSending(true)

    // Optimistic: add the message immediately so it appears above the keyboard right away
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMsg: chatService.ChatMessage = {
      id: optimisticId,
      channel_id: channelId,
      user_id: user.id,
      message_text: text,
      transcript_id: null,
      timestamp_start: null,
      timestamp_end: null,
      shared_content_title: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)

    const success = await chatService.sendMessage(channelId, user.id, text)
    if (!success) {
      // Roll back the optimistic message and restore input
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setInputText(text)
    }
    setSending(false)
  }

  const isOwnMessage = (msg: ChatMessage) => msg.user_id === user?.id

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const own = isOwnMessage(item)
    const prevMsg = index > 0 ? messages[index - 1] : null
    const showSender = !own && (!prevMsg || prevMsg.user_id !== item.user_id)

    // Check if we should show a date separator
    const showDate =
      index === 0 ||
      new Date(item.created_at).toDateString() !==
        new Date(messages[index - 1].created_at).toDateString()

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}

        <View style={[styles.msgRow, own && styles.msgRowOwn]}>
          {!own && (
            <View style={styles.avatarWrap}>
              {showSender ? (
                item.sender_picture_url ? (
                  <Image source={{ uri: item.sender_picture_url }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>
                      {(item.sender_name ?? '?').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )
              ) : (
                <View style={styles.avatarSpacer} />
              )}
            </View>
          )}
          <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}>
            {showSender && (
              <Text style={styles.senderName}>{item.sender_name}</Text>
            )}

            {/* Shared content card — tap to open transcript */}
            {item.shared_content_title && (
              <TouchableOpacity
                style={styles.sharedCard}
                activeOpacity={0.7}
                onPress={() => {
                  if (item.transcript_id) {
                    navigation.navigate('TranscriptDetail', { id: item.transcript_id })
                  }
                }}
              >
                <View style={styles.sharedCardHeader}>
                  <Text style={styles.sharedLabel}>Shared Conversation</Text>
                  <Text style={styles.sharedPlayHint}>{'\u25B6'} Listen</Text>
                </View>
                <Text style={styles.sharedTitle}>{item.shared_content_title}</Text>
                {item.timestamp_start != null && item.timestamp_end != null && (
                  <Text style={styles.sharedTime}>
                    {Math.floor(item.timestamp_start / 60)}:{String(Math.floor(item.timestamp_start % 60)).padStart(2, '0')}
                    {' - '}
                    {Math.floor(item.timestamp_end / 60)}:{String(Math.floor(item.timestamp_end % 60)).padStart(2, '0')}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <Text style={[styles.msgText, own && styles.msgTextOwn]}>
              {item.message_text}
            </Text>
            <Text style={[styles.msgTime, own && styles.msgTimeOwn]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <LinearGradient colors={bgGradient} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.successGold} />
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={bgGradient}
      style={[styles.container, { paddingBottom: keyboardPad }]}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\u{1F4AC}'}</Text>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Send the first message!</Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.midnightBlue} />
          ) : (
            <Text style={styles.sendIcon}>{'\u2191'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  // ─── Date separator ───────────────────────────
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },

  // ─── Message bubbles ──────────────────────────
  msgRow: {
    flexDirection: 'row',
    marginBottom: 4,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  msgRowOwn: {
    justifyContent: 'flex-end',
  },

  // ─── Avatar ───────────────────────────────────
  avatarWrap: {
    width: 30,
    marginRight: 6,
    alignSelf: 'flex-end',
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(243,156,18,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.successGold,
    fontSize: 12,
    fontWeight: '800',
  },
  avatarSpacer: {
    width: 30,
    height: 30,
  },

  bubble: {
    maxWidth: '72%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleOther: {
    backgroundColor: 'rgba(0, 17, 85, 0.7)',
    borderTopLeftRadius: 4,
  },
  bubbleOwn: {
    backgroundColor: 'rgba(243, 156, 18, 0.2)',
    borderTopRightRadius: 4,
  },
  senderName: {
    color: colors.successGold,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  msgText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 21,
  },
  msgTextOwn: {
    color: '#fff',
  },
  msgTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  msgTimeOwn: {
    color: 'rgba(255,255,255,0.4)',
  },

  // ─── Shared content card ──────────────────────
  sharedCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.successGold,
  },
  sharedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sharedLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sharedPlayHint: {
    color: colors.successGold,
    fontSize: 11,
    fontWeight: '700',
  },
  sharedTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  sharedTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },

  // ─── Input bar ────────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 51, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: colors.midnightBlue,
    fontSize: 20,
    fontWeight: '800',
  },

  // ─── Empty ────────────────────────────────────
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    color: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    marginTop: 6,
  },
})
