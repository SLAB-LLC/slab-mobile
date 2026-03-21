import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { useCompanyColors } from '../hooks/useCompanyColors'
import * as chatService from '../services/chat.service'
import { ChannelWithMembers, CompanyUser } from '../services/chat.service'
import { colors } from '../theme/tokens'

type ComposeMode = 'dm' | 'group'

export default function ChannelListScreen() {
  const { user, profile } = useAuth()
  const { bgGradient } = useCompanyColors()
  const navigation = useNavigation<any>()

  const [channels, setChannels] = useState<ChannelWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Compose modal
  const [composeVisible, setComposeVisible] = useState(false)
  const [composeMode, setComposeMode] = useState<ComposeMode>('dm')
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [starting, setStarting] = useState(false)

  // Group-specific state
  const [selectedUsers, setSelectedUsers] = useState<CompanyUser[]>([])
  const [groupName, setGroupName] = useState('')

  useEffect(() => { fetchChannels() }, [user?.id])

  const fetchChannels = async () => {
    if (!user?.id) return
    try {
      const data = await chatService.getUserChannels(user.id)
      setChannels(data)
    } catch (err) {
      console.error('Error fetching channels:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => { setRefreshing(true); fetchChannels() }

  const openCompose = async () => {
    if (!user?.id || !profile?.company_id) return
    setComposeMode('dm')
    setSelectedUsers([])
    setGroupName('')
    setSearch('')
    setComposeVisible(true)
    setUsersLoading(true)
    try {
      const users = await chatService.getCompanyUsers(user.id, profile.company_id)
      setCompanyUsers(users)
    } catch (err) {
      console.error('Error fetching company users:', err)
    } finally {
      setUsersLoading(false)
    }
  }

  const closeCompose = () => {
    setComposeVisible(false)
    setSelectedUsers([])
    setGroupName('')
    setSearch('')
  }

  // ── Direct message ─────────────────────────────
  const startDM = async (otherUser: CompanyUser) => {
    if (!user?.id || !profile?.company_id || starting) return
    setStarting(true)
    try {
      const channelId = await chatService.findOrCreateDMChannel(
        user.id, otherUser.id, profile.company_id
      )
      if (channelId) {
        closeCompose()
        fetchChannels()
        navigation.navigate('ChatRoom', {
          channelId,
          channelName: getUserName(otherUser),
        })
      }
    } finally {
      setStarting(false)
    }
  }

  // ── Group chat ─────────────────────────────────
  const toggleUserSelection = (u: CompanyUser) => {
    setSelectedUsers((prev) =>
      prev.find((x) => x.id === u.id)
        ? prev.filter((x) => x.id !== u.id)
        : [...prev, u]
    )
  }

  const createGroup = async () => {
    if (!user?.id || !profile?.company_id || starting) return
    if (selectedUsers.length < 2) return
    const name = groupName.trim() || selectedUsers.map(getUserName).join(', ')
    setStarting(true)
    try {
      const allMemberIds = [user.id, ...selectedUsers.map((u) => u.id)]
      const channelId = await chatService.createGroupChannel(
        user.id, allMemberIds, name, profile.company_id
      )
      if (channelId) {
        closeCompose()
        fetchChannels()
        navigation.navigate('ChatRoom', { channelId, channelName: name })
      }
    } finally {
      setStarting(false)
    }
  }

  // ── Helpers ────────────────────────────────────
  const getUserName = (u: CompanyUser) =>
    u.display_name || u.email || 'Unknown User'

  const getInitials = (u: CompanyUser) =>
    getUserName(u).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  const filteredUsers = companyUsers.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.display_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  })

  // ── Render ─────────────────────────────────────
  const renderChannel = ({ item }: { item: ChannelWithMembers }) => (
    <TouchableOpacity
      style={styles.channelCard}
      onPress={() => navigation.navigate('ChatRoom', { channelId: item.id, channelName: item.displayName })}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.channel_type === 'dm' ? '\u{1F464}' : '\u{1F465}'}
        </Text>
      </View>
      <View style={styles.channelInfo}>
        <Text style={styles.channelName} numberOfLines={1}>{item.displayName}</Text>
        <Text style={styles.channelType}>
          {item.channel_type === 'dm' ? 'Direct Message' : 'Group Chat'}
        </Text>
      </View>
      <Text style={styles.arrow}>{'\u203A'}</Text>
    </TouchableOpacity>
  )

  const renderUser = ({ item }: { item: CompanyUser }) => {
    const isSelected = selectedUsers.some((x) => x.id === item.id)
    return (
      <TouchableOpacity
        style={styles.userRow}
        onPress={() => composeMode === 'dm' ? startDM(item) : toggleUserSelection(item)}
        disabled={starting && composeMode === 'dm'}
        activeOpacity={0.7}
      >
        {item.profile_picture_url ? (
          <Image source={{ uri: item.profile_picture_url }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatarFallback}>
            <Text style={styles.userAvatarInitials}>{getInitials(item)}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{getUserName(item)}</Text>
          {item.email && item.display_name && (
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
          )}
        </View>
        {composeMode === 'group' ? (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        ) : (
          <Text style={styles.userArrow}>{'\u203A'}</Text>
        )}
      </TouchableOpacity>
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
    <LinearGradient colors={bgGradient} style={styles.container}>
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        renderItem={renderChannel}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.successGold} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\u{1F4AC}'}</Text>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Tap + to start a new message</Text>
          </View>
        }
      />

      {/* + FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCompose} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Compose Modal */}
      <Modal
        visible={composeVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCompose}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeCompose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Message</Text>
            {composeMode === 'group' ? (
              <TouchableOpacity
                onPress={createGroup}
                disabled={selectedUsers.length < 2 || starting}
                style={[styles.modalAction, (selectedUsers.length < 2 || starting) && { opacity: 0.35 }]}
              >
                {starting
                  ? <ActivityIndicator size="small" color={colors.successGold} />
                  : <Text style={styles.modalActionText}>Create</Text>
                }
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>

          {/* DM / Group toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, composeMode === 'dm' && styles.modeBtnActive]}
              onPress={() => { setComposeMode('dm'); setSelectedUsers([]) }}
            >
              <Text style={[styles.modeBtnText, composeMode === 'dm' && styles.modeBtnTextActive]}>
                Direct Message
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, composeMode === 'group' && styles.modeBtnActive]}
              onPress={() => setComposeMode('group')}
            >
              <Text style={[styles.modeBtnText, composeMode === 'group' && styles.modeBtnTextActive]}>
                Group Chat
              </Text>
            </TouchableOpacity>
          </View>

          {/* Group name input */}
          {composeMode === 'group' && (
            <View style={styles.groupNameWrap}>
              <TextInput
                style={styles.groupNameInput}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Group name (optional)"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>
          )}

          {/* Selected chips (group mode) */}
          {composeMode === 'group' && selectedUsers.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {selectedUsers.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.chip}
                  onPress={() => toggleUserSelection(u)}
                >
                  <Text style={styles.chipText}>{getUserName(u)}</Text>
                  <Text style={styles.chipX}> ✕</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Search */}
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or email..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Hint for group mode */}
          {composeMode === 'group' && (
            <Text style={styles.groupHint}>
              Select 2 or more people to create a group
            </Text>
          )}

          {usersLoading ? (
            <ActivityIndicator size="large" color={colors.successGold} style={{ marginTop: 40 }} />
          ) : filteredUsers.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyText}>
                {search ? 'No users match your search' : 'No other users in your company'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={renderUser}
              contentContainerStyle={styles.userList}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </SafeAreaView>
      </Modal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },

  // ── Channel cards ──────────────────────────────
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 17, 85, 0.6)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 20 },
  channelInfo: { flex: 1 },
  channelName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  channelType: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  arrow: { color: 'rgba(255,255,255,0.3)', fontSize: 24, fontWeight: '300' },

  // ── Empty ──────────────────────────────────────
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, color: 'rgba(255,255,255,0.2)', marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: '600' },
  emptySubtext: {
    color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 6,
    textAlign: 'center', paddingHorizontal: 40,
  },

  // ── + FAB ──────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.successGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  fabIcon: { fontSize: 32, color: '#000', lineHeight: 36, fontWeight: '300' },

  // ── Modal shell ────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: '#0a0a1a' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalClose: { paddingVertical: 4, paddingHorizontal: 4, minWidth: 60 },
  modalCloseText: { color: colors.successGold, fontSize: 16 },
  modalAction: { minWidth: 60, alignItems: 'flex-end' },
  modalActionText: { color: colors.successGold, fontSize: 16, fontWeight: '700' },

  // ── DM / Group toggle ──────────────────────────
  modeToggle: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: colors.successGold },
  modeBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  modeBtnTextActive: { color: '#000' },

  // ── Group name ─────────────────────────────────
  groupNameWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
  },
  groupNameInput: {
    color: '#fff',
    fontSize: 15,
    paddingVertical: 12,
  },

  // ── Selected chips ─────────────────────────────
  chipRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 6,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243,156,18,0.18)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.35)',
  },
  chipText: { color: colors.successGold, fontSize: 13, fontWeight: '600' },
  chipX: { color: colors.successGold, fontSize: 11 },

  // ── Group hint ─────────────────────────────────
  groupHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  // ── Search ─────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 },
  searchClear: { color: 'rgba(255,255,255,0.4)', fontSize: 14, paddingLeft: 8 },

  // ── User list ──────────────────────────────────
  userList: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  userAvatar: { width: 46, height: 46, borderRadius: 23 },
  userAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(243,156,18,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitials: { color: colors.successGold, fontSize: 16, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  userEmail: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  userArrow: { color: 'rgba(255,255,255,0.3)', fontSize: 22 },

  // ── Checkbox (group mode) ──────────────────────
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.successGold,
    borderColor: colors.successGold,
  },
  checkmark: { color: '#000', fontSize: 13, fontWeight: '800' },

  // ── Modal empty ────────────────────────────────
  modalEmpty: { alignItems: 'center', paddingVertical: 60 },
  modalEmptyText: {
    color: 'rgba(255,255,255,0.4)', fontSize: 15,
    textAlign: 'center', paddingHorizontal: 40,
  },
})
