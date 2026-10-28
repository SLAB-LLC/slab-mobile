import type { Company } from '../types'
import { DEFAULT_TENANT_CONFIG } from './defaults'
import type { CompanyAppConfigRow, TenantConfig, TenantConfigOverride } from './types'

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Deep-merge `override` onto `base`. Objects merge key by key; arrays and
 * scalars replace. `null`/`undefined` in the override keep the base value,
 * except for keys the base itself allows to be null (e.g. logoUrl).
 */
export function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : (override as T)
  }
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue
    const current = (base as Record<string, unknown>)[key]
    if (value === null && current !== null) continue
    out[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value
  }
  return out as T
}

/** Hex color with an alpha channel, for translucent accent fills */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/**
 * Overrides implied by the legacy `companies` columns (logo, primary and
 * secondary color) that the website already lets admins set.
 */
function legacyCompanyOverride(company: Company | null): TenantConfigOverride {
  if (!company) return {}
  const colors: Record<string, unknown> = {}
  if (company.secondary_color) {
    const bg = company.secondary_color
    colors.background = bg
    colors.backgroundGradient = [bg, bg, bg]
    colors.header = bg
    colors.tabBar = bg
  }
  if (company.primary_color) {
    colors.accent = company.primary_color
    colors.accentSoft = withAlpha(company.primary_color, 0.15)
    colors.accentLine = withAlpha(company.primary_color, 0.2)
  }
  return {
    theme: {
      brandName: company.name,
      logoUrl: company.logo_url ?? null,
      colors,
    },
  }
}

/**
 * Resolve the full config for a company:
 * SLAB defaults <- legacy company columns <- company_app_config row.
 */
export function resolveTenantConfig(
  company: Company | null,
  row: Pick<CompanyAppConfigRow, 'theme' | 'features' | 'labels'> | null
): TenantConfig {
  let config = deepMerge(DEFAULT_TENANT_CONFIG, legacyCompanyOverride(company))
  if (row) {
    config = deepMerge(config, {
      theme: row.theme ?? undefined,
      features: row.features ?? undefined,
      labels: row.labels ?? undefined,
    })
  }
  return config
}
