import { AppState, Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo'
import type { Company } from '../types'
import type { TenantFeatures } from '../tenant'

/**
 * The home screen icon follows the rep's company. iOS only switches between icons that ship
 * inside the app (app.json, expo-alternate-app-icons), so a new company's icon needs a new build.
 * Phones on an older build don't have the native module and simply keep the SLAB icon.
 */
const BUNDLED = ['Ace', 'Proterra']

type IconModule = {
  supportsAlternateIcons: boolean
  getAppIconName(): string | null
  setAlternateAppIcon(name: string | null): Promise<string | null>
}
const Icons = requireOptionalNativeModule<IconModule>('ExpoAlternateAppIcons')

export function companyIconName(company: Company | null, features: TenantFeatures): string | null {
  const named = (features as { appIcon?: string | null }).appIcon
  if (named) return BUNDLED.includes(named) ? named : null
  if (!company) return null
  if (/^ace/i.test(company.slug || '') || /^ace/i.test(company.name || '')) return 'Ace'
  if (/^pro\s*terra/i.test(company.slug || '') || /^pro\s*terra/i.test(company.name || '')) return 'Proterra'
  return null
}

let wanted: string | null | undefined
let retryHooked = false

let lastError = ''

/** One line for the build label under Sign out, so a phone shows why its icon didn't change */
export function iconStatus(): string {
  if (Platform.OS !== 'ios') return ''
  if (!Icons) return 'icon: no module'
  if (!Icons.supportsAlternateIcons) return 'icon: unsupported'
  let now = '?'
  try {
    now = Icons.getAppIconName() ?? 'SLAB'
  } catch {}
  const want = wanted === undefined ? '-' : wanted ?? 'SLAB'
  return `icon ${now} (want ${want})${lastError ? ' ' + lastError : ''}`
}

async function setIcon(name: string | null): Promise<boolean> {
  try {
    if (Icons!.getAppIconName() !== name) await Icons!.setAlternateAppIcon(name)
    lastError = ''
    return true
  } catch (e: any) {
    lastError = `failed ${name ?? 'SLAB'}: ${String(e?.message || e).slice(0, 80)}`
    return false
  }
}

/**
 * Puts the company's icon on the home screen. One quiet try per change: iOS throttles icon changes
 * (it answers "resource temporarily unavailable" and can stay stuck until the phone restarts), so
 * hammering it with retries makes things worse. A refused change is tried once more the next time
 * the app comes to the front. Names this build doesn't have fall back to the SLAB icon.
 */
let tried = new Set<string>()
export async function applyAppIcon(name: string | null): Promise<void> {
  // Android swaps launcher aliases, which can close the app; it keeps the default for now
  if (Platform.OS !== 'ios' || !Icons?.supportsAlternateIcons) return
  if (wanted !== name) tried = new Set()
  wanted = name
  if (!retryHooked) {
    retryHooked = true
    AppState.addEventListener('change', (state) => {
      if (state !== 'active' || wanted === undefined || !lastError || tried.has('fg:' + wanted)) return
      tried.add('fg:' + wanted)
      setTimeout(() => wanted !== undefined && setIcon(wanted), 1500)
    })
  }
  await setIcon(name)
}
