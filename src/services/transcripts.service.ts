import { supabase } from '../utils/supabase'
import { Transcript } from '../types'

/**
 * Transcripts Service
 * Centralized service for all transcript-related database operations
 * All queries include explicit company_id filtering for security
 */

/**
 * Fetch transcripts for a user based on subscriptions and assignments
 * This matches the web app's behavior: shows transcripts from subscribed salespeople + assigned transcripts
 * @param userId - The user ID
 * @returns Array of transcripts
 */
export async function getTranscripts(
  userId: string
): Promise<Transcript[]> {
  try {
    // Step 1: Get transcript IDs from explicit assignments
    const { data: assignments } = await supabase
      .from('transcript_assignments')
      .select('transcript_id')
      .eq('user_id', userId)

    const assignedIds = assignments?.map((a) => a.transcript_id) || []

    // Step 2: Get user's salesperson subscriptions
    const { data: subscriptions } = await supabase
      .from('salesperson_subscriptions')
      .select('salesperson_name')
      .eq('user_id', userId)

    const salespersonNames = subscriptions?.map((s) => s.salesperson_name) || []

    // Step 3: Get transcript IDs for subscribed salespeople
    let subscribedIds: string[] = []
    if (salespersonNames.length > 0) {
      const { data: subscribedTranscripts } = await supabase
        .from('transcripts')
        .select('id')
        .in('salesperson_name', salespersonNames)

      subscribedIds = subscribedTranscripts?.map((t) => t.id) || []
    }

    // Step 4: Combine all transcript IDs (remove duplicates)
    const allTranscriptIds = Array.from(new Set([...assignedIds, ...subscribedIds]))

    // Step 5: If no transcripts found, return empty array
    if (allTranscriptIds.length === 0) {
      return []
    }

    // Step 6: Fetch full transcript data for all IDs
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .in('id', allTranscriptIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transcripts:', error)
      throw new Error(`Failed to fetch transcripts: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getTranscripts:', error)
    throw error
  }
}

/**
 * Fetch a single transcript by ID
 * Access is controlled by RLS policies (subscriptions, assignments, ownership)
 * @param id - The transcript ID
 * @returns Single transcript or null
 */
export async function getTranscriptById(
  id: string
): Promise<Transcript | null> {
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - either doesn't exist or RLS denied access
        console.warn('Transcript not found or access denied:', id)
        return null
      }
      throw new Error(`Failed to fetch transcript: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error in getTranscriptById:', error)
    throw error
  }
}

/**
 * Search transcripts by query string
 * Searches within user's accessible transcripts (based on subscriptions/assignments)
 * @param query - Search query
 * @param userId - The user ID
 * @returns Array of matching transcripts
 */
export async function searchTranscripts(
  query: string,
  userId: string
): Promise<Transcript[]> {
  try {
    // First get all accessible transcripts
    const allTranscripts = await getTranscripts(userId)

    // Filter by search query (client-side filtering)
    const searchLower = query.toLowerCase()
    const filtered = allTranscripts.filter(
      (t) =>
        t.salesperson_name?.toLowerCase().includes(searchLower) ||
        t.original_filename?.toLowerCase().includes(searchLower)
    )

    return filtered
  } catch (error) {
    console.error('Error in searchTranscripts:', error)
    throw error
  }
}

/**
 * Filter transcripts by salesperson name
 * Filters within user's accessible transcripts
 * @param salespersonName - The salesperson name to filter by
 * @param userId - The user ID
 * @returns Array of transcripts for that salesperson
 */
export async function getTranscriptsBySalesperson(
  salespersonName: string,
  userId: string
): Promise<Transcript[]> {
  try {
    // Get all accessible transcripts
    const allTranscripts = await getTranscripts(userId)

    // Filter by salesperson name
    const filtered = allTranscripts.filter(
      (t) => t.salesperson_name === salespersonName
    )

    return filtered
  } catch (error) {
    console.error('Error in getTranscriptsBySalesperson:', error)
    throw error
  }
}

/**
 * Get unique salespeople from user's accessible transcripts
 * Used for filter dropdowns
 * @param userId - The user ID
 * @returns Array of unique salesperson names
 */
export async function getUniqueSalespeople(userId: string): Promise<string[]> {
  try {
    // Get all accessible transcripts
    const allTranscripts = await getTranscripts(userId)

    // Extract unique salesperson names
    const uniqueNames = [
      ...new Set(allTranscripts.map((t) => t.salesperson_name).filter(Boolean)),
    ]

    return uniqueNames.sort() as string[]
  } catch (error) {
    console.error('Error in getUniqueSalespeople:', error)
    throw error
  }
}
