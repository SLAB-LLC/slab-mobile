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

async function setIcon(name: string | null): Promise<boolean> {
  try {
    if (Icons!.getAppIconName() !== name) await Icons!.setAlternateAppIcon(name)
    return true
  } catch {
    return false
  }
}

/**
 * Puts the company's icon on the home screen. If this build doesn't have that icon (a company added
 * after the build), it falls back to the SLAB icon rather than leaving another company's icon up.
 * iOS refuses while the app is in the background or busy, so a failed change is tried again the next
 * time the app comes to the front.
 */
export async function applyAppIcon(name: string | null): Promise<void> {
  // Android swaps launcher aliases, which can close the app; it keeps the default for now
  if (Platform.OS !== 'ios' || !Icons?.supportsAlternateIcons) return
  wanted = name
  if (!retryHooked) {
    retryHooked = true
    AppState.addEventListener('change', (state) => {
      if (state === 'active' && wanted !== undefined) setTimeout(() => applyAppIcon(wanted ?? null), 800)
    })
  }
  if (await setIcon(name)) return
  if (name !== null && wanted === name) await setIcon(null)
}
