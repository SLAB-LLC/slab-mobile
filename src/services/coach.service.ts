import { supabase } from '../utils/supabase'

/**
 * Ask Marshall (the AI coach) service.
 *
 * The chatbot lives on the website (slabtech src/app/api/app/coach); EXPO_PUBLIC_COACH_URL
 * can point the app at another endpoint:
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
 *   -> 200 { "reply": "...", "clips": [...] }   // clips: the door moments the reply drew on
 *
 * The endpoint verifies the token with Supabase to know who is asking.
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

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://www.slabtraining.com').replace(/\/$/, '')
const COACH_URL = process.env.EXPO_PUBLIC_COACH_URL || `${SITE_URL}/api/app/coach`

/** True once a real chatbot endpoint is configured */
export const isCoachConnected = (): boolean => !!COACH_URL

/** A door the answer drew on: its day's audio folder in the Vault, the door's number and the moment cited */
export interface CoachClip {
  title: string
  prefix: string
  door: number
  st: number
  en: number
}

export async function askCoach(messages: CoachMessage[], ctx: CoachAskContext): Promise<string> {
  return (await askCoachWithClips(messages, ctx)).reply
}

export async function askCoachWithClips(
  messages: CoachMessage[],
  ctx: CoachAskContext,
): Promise<{ reply: string; clips: CoachClip[] }> {
  if (!COACH_URL) {
    return { reply: `${ctx.coachName} is still in training. Check back soon, the real answers are on the way.`, clips: [] }
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
  const clips = Array.isArray(body.clips) ? body.clips.filter((c: any) => c && c.prefix && c.door) : []
  return { reply: body.reply, clips }
}
