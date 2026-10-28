import { useTenantTheme } from '../tenant'

/**
 * Background and accent colors for the current company, from its tenant
 * theme (which already folds in the legacy companies.primary/secondary_color).
 */
export function useCompanyColors() {
  const { colors } = useTenantTheme()

  return {
    bgColor: colors.background,
    bgGradient: colors.backgroundGradient,
    primaryColor: colors.accent,
  }
}
