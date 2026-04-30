import { supabase } from '../utils/supabase'
import { getChannelMemberTokens, sendPushNotifications } from './notifications.service'

export interface Channel {
  id: string
  channel_type: 'dm' | 'group'
  name: string | null
  description: string | null
  picture_url: string | null
}

export interface ChannelWithMembers extends Channel {
  displayName: string
  displayPictureUrl: string | null
}

export interface ChatMessage {
  id: string
  channel_id: string
  user_id: string
  message_text: string
  transcript_id: string | null
  timestamp_start: number | null
  timestamp_end: number | null
  shared_content_title: string | null
  created_at: string
  sender_name?: string
  sender_picture_url?: string | null
}

export interface CompanyUser {
  id: string
  display_name: string | null
  email: string | null
  profile_picture_url: string | null
}

function resolveDisplayName(profile: { display_name?: string | null; email?: string | null } | null, fallback = 'Unknown User'): string {
  if (!profile) return fallback
  return profile.display_name || profile.email || fallback
}

/**
 * Fetch all channels the current user is a member of.
 */
export async function getUserChannels(userId: string): Promise<ChannelWithMembers[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('channel_members')
    .select('channel_id')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (memberError || !memberships?.length) return []

  const channelIds = memberships.map((m) => m.channel_id)

  const { data: channels, error: channelError } = await supabase
    .from('channels')
    .select('id, channel_type, name, description, picture_url')
    .in('id', channelIds)

  if (channelError || !channels) return []

  const result: ChannelWithMembers[] = []

  for (const channel of channels) {
    let displayName = channel.name || 'Unnamed Channel'
    let displayPictureUrl: string | null = channel.picture_url ?? null

    if (channel.channel_type === 'dm') {
      // Use RPC to bypass channel_members RLS and find the other user
      const { data: partnerId } = await supabase
        .rpc('get_dm_partner', { p_channel_id: channel.id, p_my_user_id: userId })

      if (partnerId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, email, profile_picture_url')
          .eq('id', partnerId)
          .single()

        displayName = resolveDisplayName(profile)
        displayPictureUrl = profile?.profile_picture_url ?? null
      }
    }

    result.push({ ...channel, displayName, displayPictureUrl })
  }

  return result
}

/**
 * Fetch all other users in the same company (for starting new DMs).
 */
export async function getCompanyUsers(userId: string, companyId: string): Promise<CompanyUser[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, display_name, email, profile_picture_url')
    .eq('company_id', companyId)
    .neq('id', userId)
    .order('display_name', { ascending: true })

  if (error || !data) return []
  return data
}

/**
 * Find an existing DM channel between two users, or create one.
 * Returns the channel ID.
 */
export async function findOrCreateDMChannel(
  userId: string,
  otherUserId: string,
  companyId: string
): Promise<string | null> {
  // Look across active AND inactive memberships so we can revive a DM
  // the user previously deleted from their list.
  const { data: myMemberships } = await supabase
    .from('channel_members')
    .select('channel_id, is_active')
    .eq('user_id', userId)

  if (myMemberships?.length) {
    const myChannelIds = myMemberships.map((m) => m.channel_id)

    const { data: sharedMemberships } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', otherUserId)
      .in('channel_id', myChannelIds)

    if (sharedMemberships?.length) {
      const sharedIds = sharedMemberships.map((m) => m.channel_id)

      const { data: dmChannels } = await supabase
        .from('channels')
        .select('id')
        .eq('channel_type', 'dm')
        .in('id', sharedIds)
        .limit(1)

      if (dmChannels?.length) {
        const channelId = dmChannels[0].id
        // Reactivate either side's membership if it was previously deleted
        await supabase
          .from('channel_members')
          .update({ is_active: true })
          .eq('channel_id', channelId)
          .in('user_id', [userId, otherUserId])
        return channelId
      }
    }
  }

  // No existing DM found — create one
  const { data: newChannel, error: createError } = await supabase
    .from('channels')
    .insert({ channel_type: 'dm', company_id: companyId, created_by: userId })
    .select('id')
    .single()

  if (createError || !newChannel) {
    console.error('Error creating DM channel:', createError)
    return null
  }

  const channelId = newChannel.id

  const { error: membersError } = await supabase
    .from('channel_members')
    .insert([
      { channel_id: channelId, user_id: userId, added_by: userId },
      { channel_id: channelId, user_id: otherUserId, added_by: userId },
    ])

  if (membersError) {
    console.error('Error adding channel members:', membersError)
    return null
  }

  return channelId
}

/**
 * Create a new group channel with the given members.
 * Returns the channel ID, or null on failure.
 */
export async function createGroupChannel(
  creatorId: string,
  memberIds: string[],
  name: string,
  companyId: string
): Promise<string | null> {
  const { data: newChannel, error: createError } = await supabase
    .from('channels')
    .insert({ channel_type: 'group', name, company_id: companyId, created_by: creatorId })
    .select('id')
    .single()

  if (createError || !newChannel) {
    console.error('Error creating group channel:', createError)
    return null
  }

  const channelId = newChannel.id

  const { error: membersError } = await supabase
    .from('channel_members')
    .insert(
      memberIds.map((userId) => ({
        channel_id: channelId,
        user_id: userId,
        added_by: creatorId,
      }))
    )

  if (membersError) {
    console.error('Error adding group members:', membersError)
    return null
  }

  return channelId
}

/**
 * Fetch messages for a channel, ordered by creation time.
 */
export async function getChannelMessages(
  channelId: string,
  limit = 50
): Promise<ChatMessage[]> {
  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error || !messages) return []

    const userIds = [...new Set(messages.map((m) => m.user_id))]
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, email, profile_picture_url')
      .in('id', userIds)

    const nameMap = new Map<string, string>()
    const pictureMap = new Map<string, string | null>()
    profiles?.forEach((p) => {
      nameMap.set(p.id, resolveDisplayName(p, 'Unknown'))
      pictureMap.set(p.id, p.profile_picture_url ?? null)
    })

    return messages.map((m) => ({
      ...m,
      sender_name: nameMap.get(m.user_id) || 'Unknown',
      sender_picture_url: pictureMap.get(m.user_id) ?? null,
    }))
  } catch (err) {
    console.error('Error fetching messages:', err)
    return []
  }
}

/**
 * Subscribe to new messages in a channel via Supabase realtime.
 * Returns an unsubscribe function.
 */
export function subscribeToChannel(
  channelId: string,
  onNewMessage: (message: ChatMessage) => void
): () => void {
  const subscription = supabase
    .channel(`chat:${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      },
      async (payload) => {
        const msg = payload.new as ChatMessage

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, email, profile_picture_url')
          .eq('id', msg.user_id)
          .single()

        onNewMessage({
          ...msg,
          sender_name: resolveDisplayName(profile, 'Unknown'),
          sender_picture_url: profile?.profile_picture_url ?? null,
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(subscription)
  }
}

/**
 * Send a message to a channel, optionally with a shared conversation/transcript.
 */
export async function sendMessage(
  channelId: string,
  userId: string,
  text: string,
  options?: {
    transcriptId?: string
    timestampStart?: number
    timestampEnd?: number
    sharedContentTitle?: string
  }
): Promise<boolean> {
  const { error } = await supabase.from('chat_messages').insert({
    channel_id: channelId,
    user_id: userId,
    message_text: text,
    transcript_id: options?.transcriptId || null,
    timestamp_start: options?.timestampStart ?? null,
    timestamp_end: options?.timestampEnd ?? null,
    shared_content_title: options?.sharedContentTitle || null,
  })

  if (error) {
    console.error('Error sending message:', error)
    return false
  }

  // Fire-and-forget: push notify other channel members
  getChannelMemberTokens(channelId, userId).then((tokens) => {
    if (tokens.length === 0) return
    supabase
      .from('user_profiles')
      .select('display_name, email')
      .eq('id', userId)
      .single()
      .then(({ data: profile }) => {
        const senderName = resolveDisplayName(profile, 'Someone')
        const preview = text.length > 80 ? text.slice(0, 77) + '...' : text
        sendPushNotifications(tokens, senderName, preview, {
          type: 'chat',
          channelId,
          channelName: senderName,
        })
      })
  })

  return true
}

/**
 * Soft-delete a channel from the current user's list by deactivating their
 * membership. Other members keep their view of the conversation. If the user
 * later starts a DM with the same person, findOrCreateDMChannel reactivates
 * this membership so message history is preserved.
 */
export async function leaveChannel(channelId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('channel_members')
    .update({ is_active: false })
    .eq('channel_id', channelId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error leaving channel:', error)
    return false
  }
  return true
}
