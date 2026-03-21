import { supabase } from '../utils/supabase'

export interface BigFiveMember {
  id: string
  name: string
  profile_picture_url: string | null
  background_picture_url: string | null
  instagram_handle: string | null
  best_day: number
  best_summer: number
  best_week: number
  retention_percentage: number
  bio: string | null
  is_active: boolean
  display_order: number
  /** Logo of the field company the member is currently knocking for */
  field_company_logo_url: string | null
}

export interface BigFiveAward {
  id: string
  member_id: string
  title: string
  year: number
}

/**
 * Fetch all active Big Five members
 */
export async function getBigFiveMembers(): Promise<BigFiveMember[]> {
  try {
    const { data, error } = await supabase
      .from('big_five_members')
      .select('*')
      .order('display_order')

    if (error) {
      console.error('Error fetching Big Five members:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getBigFiveMembers:', err)
    return []
  }
}

/**
 * Fetch a single Big Five member by ID
 */
export async function getBigFiveMemberById(memberId: string): Promise<BigFiveMember | null> {
  try {
    const { data, error } = await supabase
      .from('big_five_members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (error) {
      console.error('Error fetching member:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Error in getBigFiveMemberById:', err)
    return null
  }
}

/**
 * Fetch awards for a Big Five member
 */
export async function getMemberAwards(memberId: string): Promise<BigFiveAward[]> {
  try {
    const { data, error } = await supabase
      .from('big_five_awards')
      .select('*')
      .eq('member_id', memberId)
      .order('year', { ascending: false })

    if (error) {
      console.error('Error fetching awards:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getMemberAwards:', err)
    return []
  }
}

/**
 * Get user's Big Five subscriptions
 */
export async function getUserSubscriptions(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('big_five_subscriptions')
      .select('member_id')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return []
    }

    return (data || []).map((d) => d.member_id)
  } catch (err) {
    console.error('Error in getUserSubscriptions:', err)
    return []
  }
}

/**
 * Toggle subscription to a Big Five member
 */
export async function toggleSubscription(
  userId: string,
  memberId: string,
  isSubscribed: boolean
): Promise<boolean> {
  try {
    if (isSubscribed) {
      const { error } = await supabase
        .from('big_five_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('member_id', memberId)

      if (error) throw error
      return false
    } else {
      const { error } = await supabase
        .from('big_five_subscriptions')
        .insert({ user_id: userId, member_id: memberId })

      if (error) throw error
      return true
    }
  } catch (err) {
    console.error('Error toggling subscription:', err)
    return isSubscribed // Return original state on error
  }
}

export interface MemberRecording {
  id: string
  created_at: string
  area_type: string | null
  actual_sales_count: number
  conversation_count: number
}

/**
 * Fetch all transcripts for a Big Five member with conversation counts.
 * Resolves via big_five_transcript_links → salesperson_name → transcripts.
 */
export async function getMemberAllRecordings(memberId: string): Promise<MemberRecording[]> {
  try {
    // Step 1: get linked salesperson names
    const { data: links, error: linkErr } = await supabase
      .from('big_five_transcript_links')
      .select('salesperson_name')
      .eq('member_id', memberId)

    if (linkErr || !links?.length) return []

    const names = links.map((l) => l.salesperson_name)

    // Step 2: fetch all transcripts for those names
    const { data: transcripts, error: transErr } = await supabase
      .from('transcripts')
      .select('id, created_at, area_type, actual_sales_count')
      .in('salesperson_name', names)
      .order('created_at', { ascending: false })

    if (transErr || !transcripts?.length) return []

    // Step 3: fetch conversation counts per transcript
    const ids = transcripts.map((t) => t.id)
    const { data: convos } = await supabase
      .from('conversations')
      .select('transcript_id')
      .in('transcript_id', ids)

    const countsMap: Record<string, number> = {}
    convos?.forEach((c) => {
      countsMap[c.transcript_id] = (countsMap[c.transcript_id] || 0) + 1
    })

    return transcripts.map((t) => ({
      id: t.id,
      created_at: t.created_at,
      area_type: t.area_type || null,
      actual_sales_count: t.actual_sales_count || 0,
      conversation_count: countsMap[t.id] || 0,
    }))
  } catch (err) {
    console.error('Error in getMemberAllRecordings:', err)
    return []
  }
}

/**
 * Update a Big Five member's field company logo URL (super admins only)
 */
export async function updateMemberFieldLogo(
  memberId: string,
  fieldCompanyLogoUrl: string | null
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('big_five_members')
      .update({ field_company_logo_url: fieldCompanyLogoUrl })
      .eq('id', memberId)

    if (error) {
      console.error('Error updating field company logo:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Error in updateMemberFieldLogo:', err)
    return false
  }
}

/**
 * Get salesperson names linked to a Big Five member
 */
export async function getMemberSalespersonNames(memberId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('big_five_transcript_links')
      .select('salesperson_name')
      .eq('member_id', memberId)

    if (error) {
      console.error('Error fetching transcript links:', error)
      return []
    }

    return (data || []).map((d) => d.salesperson_name)
  } catch (err) {
    console.error('Error in getMemberSalespersonNames:', err)
    return []
  }
}
