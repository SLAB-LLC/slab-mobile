import { supabase } from '../utils/supabase'
import { Conversation } from '../types'

/**
 * Fetch upvote counts for a set of conversation IDs.
 */
export async function getUpvoteCounts(
  conversationIds: string[]
): Promise<Record<string, number>> {
  if (conversationIds.length === 0) return {}

  const { data, error } = await supabase
    .from('conversation_upvotes')
    .select('conversation_id')
    .in('conversation_id', conversationIds)

  if (error) {
    console.error('Error fetching upvote counts:', error)
    return {}
  }

  const counts: Record<string, number> = {}
  ;(data || []).forEach((row) => {
    counts[row.conversation_id] = (counts[row.conversation_id] || 0) + 1
  })
  return counts
}

/**
 * Fetch which conversations the current user has upvoted.
 */
export async function getUserUpvotedIds(
  userId: string,
  conversationIds: string[]
): Promise<Set<string>> {
  if (conversationIds.length === 0) return new Set()

  const { data, error } = await supabase
    .from('conversation_upvotes')
    .select('conversation_id')
    .eq('user_id', userId)
    .in('conversation_id', conversationIds)

  if (error) {
    console.error('Error fetching user upvotes:', error)
    return new Set()
  }

  return new Set((data || []).map((r) => r.conversation_id))
}

/**
 * Toggle upvote on a conversation. Returns the new upvoted state.
 */
export async function toggleUpvote(
  userId: string,
  conversationId: string,
  currentlyUpvoted: boolean
): Promise<boolean> {
  try {
    if (currentlyUpvoted) {
      const { error } = await supabase
        .from('conversation_upvotes')
        .delete()
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)

      if (error) throw error
      return false
    } else {
      const { error } = await supabase
        .from('conversation_upvotes')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
        })

      if (error) throw error
      return true
    }
  } catch (err) {
    console.error('Error toggling upvote:', err)
    return currentlyUpvoted
  }
}

/**
 * Fetch trending conversations (most upvoted), with full conversation data.
 */
export async function getTrendingConversations(
  limit = 30
): Promise<Array<{ conversation: Conversation; upvoteCount: number; transcriptSalesperson?: string }>> {
  try {
    // Get all upvotes, grouped by conversation
    const { data: upvotes, error: upErr } = await supabase
      .from('conversation_upvotes')
      .select('conversation_id')

    if (upErr || !upvotes || upvotes.length === 0) return []

    // Count upvotes per conversation
    const counts: Record<string, number> = {}
    upvotes.forEach((u) => {
      counts[u.conversation_id] = (counts[u.conversation_id] || 0) + 1
    })

    // Sort by count descending, take top N
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)

    const convoIds = sorted.map(([id]) => id)
    if (convoIds.length === 0) return []

    // Fetch full conversation data
    const { data: convos, error: convoErr } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convoIds)

    if (convoErr || !convos) return []

    // Get transcript salesperson names
    const transcriptIds = [...new Set(convos.map((c) => c.transcript_id))]
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('id, salesperson_name')
      .in('id', transcriptIds)

    const transcriptMap = new Map<string, string>()
    transcripts?.forEach((t) => transcriptMap.set(t.id, t.salesperson_name))

    const convoMap = new Map<string, Conversation>()
    convos.forEach((c) => convoMap.set(c.id, c as Conversation))

    return sorted
      .filter(([id]) => convoMap.has(id))
      .map(([id, count]) => ({
        conversation: convoMap.get(id)!,
        upvoteCount: count,
        transcriptSalesperson: transcriptMap.get(convoMap.get(id)!.transcript_id),
      }))
  } catch (err) {
    console.error('Error fetching trending:', err)
    return []
  }
}
