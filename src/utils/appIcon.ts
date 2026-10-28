import { Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo'
import type { Company } from '../types'
import type { TenantFeatures } from '../tenant'

/**
 * The home screen icon follows the rep's company. iOS only switches between icons that ship
 * inside the app (app.json, expo-alternate-app-icons), so a new company's icon needs a new build.
 * Phones on an older build don't have the native module and simply keep the SLAB icon.
 */
const BUNDLED = ['Ace']

type IconModule = {
  supportsAlternateIcons: boolean
  getAppIconName(): string | null
  setAlternateAppIcon(name: string | null): Promise<string | null>
}
const Icons = requireOptionalNativeModule<IconModule>('ExpoAlternateAppIcons')

export function companyIconName(company: Company | null, features: TenantFeatures): string | null {
  const named = (features as { appIcon?: string | null }).appIcon
  if (named) return BUNDLED.includes(named) ? named : null
  return company && (/^ace/i.test(company.slug || '') || /^ace/i.test(company.name || '')) ? 'Ace' : null
}

export async function applyAppIcon(name: string | null): Promise<void> {
  // Android swaps launcher aliases, which can close the app; it keeps the default for now
  if (Platform.OS !== 'ios' || !Icons?.supportsAlternateIcons) return
  try {
    if (Icons.getAppIconName() === name) return
    await Icons.setAlternateAppIcon(name)
  } catch {
    // iOS refuses while the app is in the background; it tries again next launch
  }
}
