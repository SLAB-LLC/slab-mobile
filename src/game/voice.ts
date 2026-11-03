/**
 * Talk to Ask Marshall: the chat's mic button uses the phone's own speech recognition (Apple's, on iOS),
 * so it costs nothing per use. The words land in the chat box as they're heard; the rep sends them.
 *
 * The native module only exists in builds made after it was added. Older builds that receive this code
 * over the air get `available() === false` and the page hides the mic, instead of crashing.
 */
type Listener = { remove: () => void }
type Emit = (type: 'voice', data: { state: 'listening' | 'idle' | 'error'; text?: string; final?: boolean; error?: string }) => void

let mod: any | undefined
function native(): any | null {
  if (mod === undefined) {
    try {
      mod = require('expo-speech-recognition').ExpoSpeechRecognitionModule ?? null
    } catch {
      mod = null
    }
  }
  return mod
}

export function voiceAvailable(): boolean {
  const m = native()
  if (!m) return false
  try {
    return m.isRecognitionAvailable() !== false
  } catch {
    return false
  }
}

let subs: Listener[] = []
function clear() {
  subs.forEach((s) => s.remove())
  subs = []
}

export async function startListening(emit: Emit): Promise<boolean> {
  const m = native()
  if (!m) throw new Error('Voice needs the latest app update')
  const perm = await m.requestPermissionsAsync()
  if (!perm.granted) throw new Error('Turn on Microphone and Speech Recognition for SLAB in Settings')
  clear()
  subs.push(
    m.addListener('start', () => emit('voice', { state: 'listening' })),
    m.addListener('result', (e: any) => {
      const text = e?.results?.[0]?.transcript ?? ''
      emit('voice', { state: 'listening', text, final: !!e?.isFinal })
    }),
    m.addListener('error', (e: any) => {
      // "no-speech" and "aborted" just mean nothing was said, not a failure worth showing
      const quiet = e?.error === 'no-speech' || e?.error === 'aborted' || e?.error === 'speech-timeout'
      emit('voice', quiet ? { state: 'idle' } : { state: 'error', error: e?.message || 'Couldn’t hear that' })
    }),
    m.addListener('end', () => {
      emit('voice', { state: 'idle' })
      clear()
    }),
  )
  m.start({
    lang: 'en-US',
    interimResults: true,
    continuous: false,
    addsPunctuation: true,
    // Door-to-door words the recognizer would otherwise miss
    contextualStrings: ['Marshall', 'SLAB', 'pest control', 'switchover', 'Ace', 'rebuttal', 'objection'],
  })
  return true
}

export function stopListening() {
  try {
    native()?.stop()
  } catch {}
}
