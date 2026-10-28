import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../context/AuthContext'
import * as avatarService from '../services/avatar.service'
import { useSpriteEngine } from './useSpriteEngine'
import type { RepLook, SpriteEngine } from './types'

interface AvatarContextType {
  /** The rep's look, or the default rep until they save one */
  look: RepLook
  /** null while loading, then whether they've saved a look */
  hasLook: boolean | null
  saveLook: (look: RepLook) => Promise<void>
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined)

const cacheKey = (userId: string) => `slab.repLook.${userId}`

/** Fills gaps and drops ids this engine doesn't know, so an old look always draws */
export function normalizeLook(engine: SpriteEngine, saved: Partial<RepLook> | null | undefined): RepLook {
  const d = engine.DEFAULT_LOOK
  const s = saved ?? {}
  const inList = (v: unknown, list: { id: string }[], fallback: string) =>
    typeof v === 'string' && list.some((x) => x.id === v) ? v : fallback
  const inRange = (v: unknown, len: number, fallback: number) =>
    typeof v === 'number' && v >= 0 && v < len ? v : fallback
  return {
    ...d,
    skin: inRange(s.skin, engine.SKINS.length, d.skin),
    eyes: inRange(s.eyes, engine.EYE_COLORS.length, d.eyes),
    hairColor: inRange(s.hairColor, engine.HAIR_COLORS.length, d.hairColor),
    hair: inList(s.hair, engine.HAIR_STYLES, d.hair),
    face: inList(s.face, engine.FACES, d.face),
    top: inList(s.top, engine.GEAR.top, d.top),
    hat: inList(s.hat, engine.GEAR.hat, d.hat),
    pants: inList(s.pants, engine.GEAR.pants, d.pants),
    shoes: inList(s.shoes, engine.GEAR.shoes, d.shoes),
    extra: inList(s.extra, engine.GEAR.extra, d.extra),
    ride: inList(s.ride, engine.GEAR.ride, d.ride),
    ...(s.eyeStyle ? { eyeStyle: s.eyeStyle } : {}),
  }
}

/** Loads the signed-in rep's pixel look (cached on the phone for a fast header) */
export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth()
  const engine = useSpriteEngine()
  const [saved, setSaved] = useState<Partial<RepLook> | null>(null)
  const [hasLook, setHasLook] = useState<boolean | null>(null)

  useEffect(() => {
    setSaved(null)
    setHasLook(null)
    if (!user?.id) return
    let cancelled = false
    const id = user.id
    AsyncStorage.getItem(cacheKey(id))
      .then((raw) => {
        if (!cancelled && raw) setSaved(JSON.parse(raw))
      })
      .catch(() => {})
    avatarService
      .getMyLook(id)
      .then((look) => {
        if (cancelled) return
        setSaved(look)
        setHasLook(!!look)
        if (look) AsyncStorage.setItem(cacheKey(id), JSON.stringify(look)).catch(() => {})
      })
      .catch((err) => {
        // Offline or table not there yet: don't push the rep into the builder
        console.error('Error loading rep look:', err)
        if (!cancelled) setHasLook(true)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const saveLook = useCallback(
    async (look: RepLook) => {
      if (!user?.id) return
      await avatarService.saveMyLook(user.id, profile?.company_id ?? null, look)
      setSaved(look)
      setHasLook(true)
      AsyncStorage.setItem(cacheKey(user.id), JSON.stringify(look)).catch(() => {})
    },
    [user?.id, profile?.company_id]
  )

  const look = useMemo(() => normalizeLook(engine, saved), [engine, saved])

  return <AvatarContext.Provider value={{ look, hasLook, saveLook }}>{children}</AvatarContext.Provider>
}

export function useMyLook() {
  const ctx = useContext(AvatarContext)
  if (!ctx) throw new Error('useMyLook must be used inside AvatarProvider')
  return ctx
}
