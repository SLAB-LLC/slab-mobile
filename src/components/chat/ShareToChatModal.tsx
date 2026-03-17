import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { colors, spacing, typography, borderRadius } from '../../theme/tokens'
import { useAuth } from '../../context/AuthContext'
import * as chatService from '../../services/chat.service'
import { ChannelWithMembers } from '../../services/chat.service'

interface ShareToChatModalProps {
  visible: boolean
  onClose: () => void
  transcriptId: string
  conversationTitle: string
  timestampStart: number
  timestampEnd: number
}

export default function ShareToChatModal({
  visible,
  onClose,
  transcriptId,
  conversationTitle,
  timestampStart,
  timestampEnd,
}: ShareToChatModalProps) {
  const { user } = useAuth()
  const [channels, setChannels] = useState<ChannelWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (visible && user?.id) {
      setLoading(true)
      chatService.getUserChannels(user.id).then((chs) => {
        setChannels(chs)
        setLoading(false)
      })
    }
  }, [visible, user?.id])

  const handleSend = async () => {
    if (!selectedChannel || !user?.id) return

    const text = message.trim() || `Check out this conversation: ${conversationTitle}`

    setSending(true)
    const success = await chatService.sendMessage(selectedChannel, user.id, text, {
      transcriptId,
      timestampStart,
      timestampEnd,
      sharedContentTitle: conversationTitle,
    })
    setSending(false)

    if (success) {
      Alert.alert('Shared', 'Conversation shared to chat successfully.')
      setMessage('')
      setSelectedChannel(null)
      onClose()
    } else {
      Alert.alert('Error', 'Failed to share. Please try again.')
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Share to Chat</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Shared content preview */}
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>{conversationTitle}</Text>
            <Text style={styles.previewTime}>
              {formatTime(timestampStart)} - {formatTime(timestampEnd)}
            </Text>
          </View>

          {/* Channel list */}
          <Text style={styles.sectionLabel}>SELECT CHANNEL</Text>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginVertical: spacing.lg }}
            />
          ) : channels.length === 0 ? (
            <Text style={styles.emptyText}>No channels available</Text>
          ) : (
            <FlatList
              data={channels}
              keyExtractor={(item) => item.id}
              style={styles.channelList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.channelItem,
                    selectedChannel === item.id && styles.channelItemSelected,
                  ]}
                  onPress={() => setSelectedChannel(item.id)}
                >
                  <Text style={styles.channelIcon}>
                    {item.channel_type === 'dm' ? '👤' : '👥'}
                  </Text>
                  <Text
                    style={[
                      styles.channelName,
                      selectedChannel === item.id && styles.channelNameSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {item.displayName}
                  </Text>
                  {selectedChannel === item.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          )}

          {/* Message input */}
          <TextInput
            style={styles.input}
            placeholder="Add a message (optional)"
            placeholderTextColor={colors.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
          />

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, !selectedChannel && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!selectedChannel || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h4,
  },
  closeBtn: {
    fontSize: 20,
    color: colors.textTertiary,
    padding: spacing.xs,
  },
  preview: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.successGold,
  },
  previewTitle: {
    ...typography.label,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  channelList: {
    maxHeight: 200,
    marginBottom: spacing.md,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  channelItemSelected: {
    backgroundColor: colors.gray100,
  },
  channelIcon: {
    fontSize: 18,
  },
  channelName: {
    ...typography.body,
    flex: 1,
  },
  channelNameSelected: {
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: colors.successGold,
    fontWeight: '700',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 60,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: colors.midnightBlue,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    ...typography.button,
    color: '#fff',
  },
})
