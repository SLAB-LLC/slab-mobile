import { supabase } from '../utils/supabase'

/**
 * Ask Marshall (the AI coach) service.
 *
 * The chatbot itself is built separately. This app only needs one HTTP
 * endpoint, set with EXPO_PUBLIC_COACH_URL:
 *
 *   POST <EXPO_PUBLIC_COACH_URL>
 *   Authorization: Bearer <Supabase access token of the signed-in rep>
 *   Content-Type: application/json
 *   {
 *     "coach":    "Marshall",
 *     "user":     { "id": "...", "name": "...", "companyId": "...", "companyName": "..." },
 *     "messages": [{ "role": "user" | "assistant", "content": "..." }, ...]  // oldest first
 *   }
 *
 *   -> 200 { "reply": "..." }
 *
 * The endpoint can verify the token with Supabase to know who is asking.
 * Until the URL is set, the coach answers with a placeholder.
 */

export interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CoachAskContext {
  coachName: string
  userId: string
  userName: string | null
  companyId: string | null
  companyName: string | null
}

const COACH_URL = process.env.EXPO_PUBLIC_COACH_URL

/** True once a real chatbot endpoint is configured */
export const isCoachConnected = (): boolean => !!COACH_URL

export async function askCoach(messages: CoachMessage[], ctx: CoachAskContext): Promise<string> {
  if (!COACH_URL) {
    return `${ctx.coachName} is still in training. Check back soon, the real answers are on the way.`
  }

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const res = await fetch(COACH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      coach: ctx.coachName,
      user: {
        id: ctx.userId,
        name: ctx.userName,
        companyId: ctx.companyId,
        companyName: ctx.companyName,
      },
      messages,
    }),
  })

  if (!res.ok) throw new Error(`Coach request failed (${res.status})`)
  const body = await res.json()
  if (typeof body?.reply !== 'string') throw new Error('Coach reply was empty')
  return body.reply
}
