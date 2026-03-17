import { supabase } from '../utils/supabase'
import { Conversation } from '../types'

/**
 * Fetch all favorited conversation IDs for a user within a set of conversation IDs.
 */
export async function getFavoritedConversationIds(
  userId: string,
  conversationIds: string[]
): Promise<Set<string>> {
  if (conversationIds.length === 0) return new Set()

  const { data, error } = await supabase
    .from('user_favorites')
    .select('conversation_id')
    .eq('user_id', userId)
    .in('conversation_id', conversationIds)

  if (error) {
    console.error('Error fetching favorites:', error)
    return new Set()
  }

  return new Set((data || []).map((f) => f.conversation_id))
}

/**
 * Fetch all user favorites with full conversation data.
 */
export async function getUserFavorites(
  userId: string
): Promise<Array<{ conversation: Conversation; note: string | null; favoritedAt: string; transcriptSalesperson?: string; audio_path: string | null }>> {
  try {
    const { data: favs, error: favErr } = await supabase
      .from('user_favorites')
      .select('conversation_id, note, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (favErr || !favs || favs.length === 0) return []

    const convoIds = favs.map((f) => f.conversation_id)

    const { data: convos, error: convoErr } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convoIds)

    if (convoErr || !convos) return []

    // Get transcript salesperson names + audio path
    const transcriptIds = [...new Set(convos.map((c) => c.transcript_id))]
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('id, salesperson_name, file_storage_path, transcript_redacted')
      .in('id', transcriptIds)

    const transcriptMap = new Map<string, { salesperson_name: string; file_storage_path: string | null; transcript_redacted: any }>()
    transcripts?.forEach((t) => transcriptMap.set(t.id, { salesperson_name: t.salesperson_name, file_storage_path: t.file_storage_path || null, transcript_redacted: t.transcript_redacted || null }))

    const convoMap = new Map<string, Conversation>()
    convos.forEach((c) => convoMap.set(c.id, c as Conversation))

    return favs
      .filter((f) => convoMap.has(f.conversation_id))
      .map((f) => {
        const convo = convoMap.get(f.conversation_id)!
        const transcript = transcriptMap.get(convo.transcript_id)
        return {
          conversation: convo,
          note: f.note || null,
          favoritedAt: f.created_at,
          transcriptSalesperson: transcript?.salesperson_name,
          audio_path: transcript?.transcript_redacted?.redacted_file_storage_path || transcript?.file_storage_path || null,
        }
      })
  } catch (err) {
    console.error('Error fetching user favorites:', err)
    return []
  }
}

/**
 * Update the note on a favorite.
 */
export async function updateFavoriteNote(
  userId: string,
  conversationId: string,
  note: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_favorites')
      .update({ note })
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error updating favorite note:', err)
    return false
  }
}

/**
 * Toggle favorite on a conversation. Returns the new favorited state.
 */
export async function toggleFavorite(
  userId: string,
  companyId: string,
  conversationId: string,
  currentlyFavorited: boolean
): Promise<boolean> {
  try {
    if (currentlyFavorited) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)

      if (error) throw error
      return false
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: userId,
          company_id: companyId,
          conversation_id: conversationId,
        })

      if (error) throw error
      return true
    }
  } catch (err) {
    console.error('Error toggling favorite:', err)
    return currentlyFavorited // return unchanged state on error
  }
}
