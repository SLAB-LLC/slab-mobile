import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { resolveTenantConfig } from './merge'
import type { CompanyAppConfigRow, TenantConfig } from './types'

type ConfigRow = Pick<CompanyAppConfigRow, 'theme' | 'features' | 'labels'>

interface TenantContextType {
  config: TenantConfig
  /** True once the company's saved config (cached or fresh) has been applied */
  ready: boolean
  refreshTenant: () => Promise<void>
}

const cacheKey = (companyId: string) => `slab.tenantConfig.${companyId}`

const TenantContext = createContext<TenantContextType | undefined>(undefined)

/**
 * Loads the signed-in user's company app config and exposes the merged
 * result. A cached copy is applied first so the app paints in the company's
 * colors on launch, then the fresh row replaces it.
 */
export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { company } = useAuth()
  const companyId = company?.id ?? null
  const [row, setRow] = useState<ConfigRow | null>(null)
  // Which company the applied config belongs to: ready turns false in the same render the company
  // changes (a SLAB admin switching), so nothing builds on the previous company's config
  const [readyFor, setReadyFor] = useState<string | null | undefined>(undefined)
  const ready = readyFor === companyId

  const fetchRow = async (id: string, cancelled: () => boolean) => {
    const { data, error } = await supabase
      .from('company_app_config')
      .select('theme, features, labels')
      .eq('company_id', id)
      .maybeSingle()

    if (cancelled()) return
    if (error) {
      // Table not migrated yet, or offline: keep defaults / cached copy
      console.warn('Tenant config unavailable:', error.message)
      return
    }
    setRow(data ?? null)
    if (data) AsyncStorage.setItem(cacheKey(id), JSON.stringify(data)).catch(() => {})
    else AsyncStorage.removeItem(cacheKey(id)).catch(() => {})
  }

  useEffect(() => {
    setRow(null)
    setReadyFor(undefined)
    if (!companyId) {
      setReadyFor(null)
      return
    }
    let cancelled = false
    const isCancelled = () => cancelled

    AsyncStorage.getItem(cacheKey(companyId))
      .then((cached) => {
        if (!cancelled && cached) setRow(JSON.parse(cached))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReadyFor(companyId)
        fetchRow(companyId, isCancelled)
      })

    return () => {
      cancelled = true
    }
  }, [companyId])

  const config = useMemo(() => resolveTenantConfig(company, row), [company, row])

  const refreshTenant = async () => {
    if (companyId) await fetchRow(companyId, () => false)
  }

  return (
    <TenantContext.Provider value={{ config, ready, refreshTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) throw new Error('useTenant must be used within a TenantProvider')
  return context
}

/** The current company's theme (colors, brand, coach) */
export function useTenantTheme() {
  return useTenant().config.theme
}

/** The current company's feature switches and XP rules */
export function useFeatures() {
  return useTenant().config.features
}

/** The current company's display labels */
export function useLabels() {
  return useTenant().config.labels
}
