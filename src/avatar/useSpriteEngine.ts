import { useMemo } from 'react'
import { useTenantTheme } from '../tenant'
import type { TenantTheme } from '../tenant'
import { createSpriteEngine } from './engine'
import type { SpriteEngine } from './types'

const engines = new Map<string, SpriteEngine>()

/** Gear branding for a company, filling gaps from its brand name and accent */
export function gearBrand(theme: TenantTheme) {
  const name = theme.gear.name || theme.brandName
  const letters = (theme.gear.letters || name)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
    .split('')
  return {
    name,
    letters,
    primary: theme.gear.primary || theme.colors.accent,
    dark: theme.gear.dark,
  }
}

/** The sprite engine dressed in the current company's gear brand */
export function useSpriteEngine(): SpriteEngine {
  const theme = useTenantTheme()
  const brand = gearBrand(theme)
  const key = JSON.stringify(brand)
  return useMemo(() => {
    let engine = engines.get(key)
    if (!engine) {
      engine = createSpriteEngine(brand) as SpriteEngine
      engines.set(key, engine)
    }
    return engine
  }, [key])
}
