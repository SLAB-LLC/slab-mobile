import { supabase } from '../utils/supabase'

export interface Broadcast {
  id: string
  title: string
  body: string
  category: string
  media_url: string | null
  media_type: 'image' | 'video' | 'audio' | 'gif' | null
  thumbnail_url: string | null
  created_at: string
}

/**
 * Fetch a single broadcast by ID. Used when the user taps a push notification.
 */
export async function getBroadcast(id: string): Promise<Broadcast | null> {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('id, title, body, category, media_url, media_type, thumbnail_url, created_at')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as Broadcast
}
