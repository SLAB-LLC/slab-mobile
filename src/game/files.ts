import * as FileSystem from 'expo-file-system/legacy'
import { Asset } from 'expo-asset'

/**
 * The game page and Marshall's Vault pack ship inside the app. iOS web views only read files next to
 * the page, so on start-up they're copied into one folder (documents/game/) and the page loads from
 * there, where its relative audio/ links just work. Files are recopied only when their content changes
 * (a new build or over-the-air update).
 */

const PAGE = require('../../assets/game/game.html')
const LOGIN = require('../../assets/game/login.html')

/** Marshall's pack: full days (m) and reels (r), the files the demo's Vault data points at */
const AUDIO: Record<string, number> = {
  'm01.mp3': require('../../assets/game/audio/m01.mp3'),
  'm02.mp3': require('../../assets/game/audio/m02.mp3'),
  'm03.mp3': require('../../assets/game/audio/m03.mp3'),
  'm04.mp3': require('../../assets/game/audio/m04.mp3'),
  'm05.mp3': require('../../assets/game/audio/m05.mp3'),
  'm06.mp3': require('../../assets/game/audio/m06.mp3'),
  'm07.mp3': require('../../assets/game/audio/m07.mp3'),
  'm08.mp3': require('../../assets/game/audio/m08.mp3'),
  'm09.mp3': require('../../assets/game/audio/m09.mp3'),
  'm10.mp3': require('../../assets/game/audio/m10.mp3'),
  'm11.mp3': require('../../assets/game/audio/m11.mp3'),
  'm12.mp3': require('../../assets/game/audio/m12.mp3'),
  'm13.mp3': require('../../assets/game/audio/m13.mp3'),
  'm14.mp3': require('../../assets/game/audio/m14.mp3'),
  'm15.mp3': require('../../assets/game/audio/m15.mp3'),
  'm16.mp3': require('../../assets/game/audio/m16.mp3'),
  'm17.mp3': require('../../assets/game/audio/m17.mp3'),
  'r01.mp3': require('../../assets/game/audio/r01.mp3'),
  'r02.mp3': require('../../assets/game/audio/r02.mp3'),
  'r03.mp3': require('../../assets/game/audio/r03.mp3'),
  'r04.mp3': require('../../assets/game/audio/r04.mp3'),
  'r05.mp3': require('../../assets/game/audio/r05.mp3'),
  'r06.mp3': require('../../assets/game/audio/r06.mp3'),
  'r07.mp3': require('../../assets/game/audio/r07.mp3'),
  'r08.mp3': require('../../assets/game/audio/r08.mp3'),
  'r09.mp3': require('../../assets/game/audio/r09.mp3'),
  'r10.mp3': require('../../assets/game/audio/r10.mp3'),
  'r11.mp3': require('../../assets/game/audio/r11.mp3'),
  'r12.mp3': require('../../assets/game/audio/r12.mp3'),
  'r13.mp3': require('../../assets/game/audio/r13.mp3'),
  'r14.mp3': require('../../assets/game/audio/r14.mp3'),
  'r15.mp3': require('../../assets/game/audio/r15.mp3'),
  'r16.mp3': require('../../assets/game/audio/r16.mp3'),
  'r17.mp3': require('../../assets/game/audio/r17.mp3'),
  'r18.mp3': require('../../assets/game/audio/r18.mp3'),
  'r19.mp3': require('../../assets/game/audio/r19.mp3'),
  'r20.mp3': require('../../assets/game/audio/r20.mp3'),
}

const DIR = `${FileSystem.documentDirectory}game/`
const MANIFEST = `${DIR}manifest.json`

async function place(module: number, target: string, hash: string | null, manifest: Record<string, string>, key: string) {
  const info = await FileSystem.getInfoAsync(target)
  if (info.exists && hash && manifest[key] === hash) return
  const asset = Asset.fromModule(module)
  await asset.downloadAsync()
  const from = asset.localUri || asset.uri
  if (info.exists) await FileSystem.deleteAsync(target, { idempotent: true })
  if (from.startsWith('file:')) await FileSystem.copyAsync({ from, to: target })
  else await FileSystem.downloadAsync(from, target)
  manifest[key] = hash || String(Date.now())
}

/** Copies the page and audio into place and returns the page's file URL and folder */
export async function prepareGameFiles(): Promise<{ pageUri: string; dirUri: string }> {
  await FileSystem.makeDirectoryAsync(`${DIR}audio`, { intermediates: true }).catch(() => {})
  let manifest: Record<string, string> = {}
  try {
    manifest = JSON.parse(await FileSystem.readAsStringAsync(MANIFEST))
  } catch {}

  const page = Asset.fromModule(PAGE)
  await place(PAGE, `${DIR}game.html`, page.hash, manifest, 'game.html')
  // The page can open while the pack copies; the Vault stays locked for most reps on day one anyway
  const audio = Promise.all(
    Object.entries(AUDIO).map(([name, mod]) =>
      place(mod, `${DIR}audio/${name}`, Asset.fromModule(mod).hash, manifest, `audio/${name}`).catch(() => {})
    )
  ).then(() => FileSystem.writeAsStringAsync(MANIFEST, JSON.stringify(manifest)).catch(() => {}))
  // Write the manifest now for the page, and again once the audio is in place
  await FileSystem.writeAsStringAsync(MANIFEST, JSON.stringify(manifest)).catch(() => {})
  void audio
  return { pageUri: `${DIR}game.html`, dirUri: DIR }
}

/** The sign-in page, copied next to the game page the same way */
export async function prepareLoginPage(): Promise<{ pageUri: string; dirUri: string }> {
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {})
  let manifest: Record<string, string> = {}
  try {
    manifest = JSON.parse(await FileSystem.readAsStringAsync(MANIFEST))
  } catch {}
  await place(LOGIN, `${DIR}login.html`, Asset.fromModule(LOGIN).hash, manifest, 'login.html')
  // Re-read before writing so a game copy running at the same time keeps its entries
  try {
    manifest = { ...JSON.parse(await FileSystem.readAsStringAsync(MANIFEST)), 'login.html': manifest['login.html'] }
  } catch {}
  await FileSystem.writeAsStringAsync(MANIFEST, JSON.stringify(manifest)).catch(() => {})
  return { pageUri: `${DIR}login.html`, dirUri: DIR }
}
