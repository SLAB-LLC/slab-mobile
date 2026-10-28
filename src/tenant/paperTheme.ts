import { theme as baseTheme } from '../theme'
import type { TenantTheme } from './types'

/** react-native-paper theme with the tenant's accent as primary */
export function buildPaperTheme(tenant: TenantTheme) {
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: tenant.colors.accent,
      onPrimary: tenant.colors.onAccent,
      error: tenant.colors.danger,
    },
  }
}
