import { useAuth } from '../context/AuthContext'

const FALLBACK_BG = '#000033'
const FALLBACK_GRADIENT = ['#000033', '#001155', '#0a1a5f'] as const

/**
 * Returns background colors derived from the company's secondary_color.
 * Falls back to the default navy blue theme when no secondary_color is set.
 */
export function useCompanyColors() {
  const { company } = useAuth()

  const bgColor = company?.secondary_color ?? FALLBACK_BG
  const primaryColor = company?.primary_color ?? '#f39c12'

  // If a secondary color is set, use it as a flat solid background (all stops the same).
  // Otherwise fall back to the default navy gradient.
  const bgGradient: [string, string, string] = company?.secondary_color
    ? [company.secondary_color, company.secondary_color, company.secondary_color]
    : [...FALLBACK_GRADIENT]

  return { bgColor, bgGradient, primaryColor }
}
