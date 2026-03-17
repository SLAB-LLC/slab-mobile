import { supabase } from '../utils/supabase'
import { Conversation } from '../types'

/**
 * Conversations Service
 * Fetch conversation segments for transcripts
 */

/**
 * Get all conversations for a transcript
 * @param transcriptId - The transcript ID
 * @returns Array of conversations ordered by conversation_number
 */
export async function getConversationsByTranscriptId(
  transcriptId: string
): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('transcript_id', transcriptId)
      .order('conversation_number', { ascending: true })

    if (error) {
      console.error('Error fetching conversations:', error)
      throw new Error(`Failed to fetch conversations: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getConversationsByTranscriptId:', error)
    throw error
  }
}

/**
 * Get conversations filtered by category
 * @param transcriptId - The transcript ID
 * @param category - Filter by category (sale, pitch, interaction)
 * @returns Filtered conversations
 */
export async function getConversationsByCategory(
  transcriptId: string,
  category: 'sale' | 'pitch' | 'interaction'
): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('transcript_id', transcriptId)
      .eq('category', category)
      .order('conversation_number', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch conversations: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getConversationsByCategory:', error)
    throw error
  }
}

/**
 * Get conversation statistics for a transcript
 * @param transcriptId - The transcript ID
 * @returns Conversation stats by category
 */
export async function getConversationStats(transcriptId: string): Promise<{
  total: number
  sales: number
  pitches: number
  interactions: number
}> {
  try {
    const conversations = await getConversationsByTranscriptId(transcriptId)

    return {
      total: conversations.length,
      sales: conversations.filter((c) => c.category === 'sale').length,
      pitches: conversations.filter((c) => c.category === 'pitch').length,
      interactions: conversations.filter((c) => c.category === 'interaction').length,
    }
  } catch (error) {
    console.error('Error in getConversationStats:', error)
    return { total: 0, sales: 0, pitches: 0, interactions: 0 }
  }
}

/**
 * Get unique objection types from conversations
 * @param conversations - Array of conversations
 * @returns Array of unique objection types with counts
 */
export function getUniqueObjections(conversations: Conversation[]): Array<{
  type: string
  count: number
}> {
  const objectionCounts = new Map<string, number>()

  conversations.forEach((conv) => {
    conv.objections.forEach((obj) => {
      objectionCounts.set(obj, (objectionCounts.get(obj) || 0) + 1)
    })
  })

  return Array.from(objectionCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Get all conversations across multiple salesperson names (for Big Five cross-member queries).
 * Returns conversations enriched with salesperson name and transcript date.
 */
export async function getConversationsBySalespersonNames(
  salespersonNames: string[]
): Promise<Array<Conversation & { salesperson_name: string; transcript_date: string; area_type?: string; audio_path: string | null }>> {
  if (salespersonNames.length === 0) return []

  try {
    // Get transcripts for these salespeople
    const { data: transcripts, error: tErr } = await supabase
      .from('transcripts')
      .select('id, salesperson_name, created_at, area_type, file_storage_path, transcript_redacted')
      .in('salesperson_name', salespersonNames)
      .order('created_at', { ascending: false })

    if (tErr || !transcripts || transcripts.length === 0) return []

    const transcriptIds = transcripts.map((t) => t.id)
    const transcriptMap = new Map(
      transcripts.map((t) => [t.id, t])
    )

    // Get all conversations for those transcripts
    const { data: convos, error: cErr } = await supabase
      .from('conversations')
      .select('*')
      .in('transcript_id', transcriptIds)
      .order('conversation_number', { ascending: true })

    if (cErr || !convos) return []

    return convos.map((c) => {
      const t = transcriptMap.get(c.transcript_id)
      return {
        ...(c as Conversation),
        salesperson_name: t?.salesperson_name || '',
        transcript_date: t?.created_at?.split('T')[0] || '',
        area_type: t?.area_type,
        audio_path: t?.transcript_redacted?.redacted_file_storage_path || t?.file_storage_path || null,
      }
    })
  } catch (err) {
    console.error('Error fetching cross-member conversations:', err)
    return []
  }
}
