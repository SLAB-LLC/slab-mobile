import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Image, StyleSheet, Text, View, useWindowDimensions, AccessibilityInfo } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../context/AuthContext'
import { useTenant } from '../tenant'
import { isAceCompany } from '../game/boot'

/**
 * The launch curtain: every rep opens on SLAB × their company (SLAB's box in the company's color, their
 * logo beside it, their name under it) on black, held until the screen underneath has painted, then a
 * seam lights up down the middle and the two halves slide apart. Reps without a company get SLAB alone
 * in its true orange. It's the same opening Ace and ProTerra had inside the game page, now native, so it
 * covers the whole start-up (auth, company config, loading the page) instead of a spinner and a blank.
 *
 * The company is only known after sign-in, so the last company this phone opened is cached and shown
 * on the next launch; a phone with nothing cached (or signed out) gets the neutral SLAB curtain.
 */

const ORANGE = '#F4711E'
const ACE_GOLD = '#daae5d'
const CACHE_KEY = 'slab.launchBrand.v1'
/** Never hold the curtain longer than this, whatever the screen underneath says */
const MAX_HOLD_MS = 12000
/** If no company brand turns up by then (no cache, slow network), the curtain shows SLAB alone */
const BRAND_WAIT_MS = 1500

const SLAB_BOX = require('../../assets/launch/slab-box.png')
const SLAB_LETTERS = require('../../assets/launch/slab-letters.png')
const SLAB_ACE = require('../../assets/launch/slab-ace.png')
const ACE_LOGO = require('../../assets/launch/ace-logo.png')

export interface LaunchBrand {
  /** 'slab': no company, SLAB alone. 'ace': Ace's gold SLAB × Ace. 'company': SLAB in their color × them */
  kind: 'slab' | 'ace' | 'company'
  /** Company name under the logos */
  name: string | null
  /** Color of SLAB's box */
  box: string
  /** Seam and name color */
  accent: string
  /** The company's logo: a file on the phone once cached, else its web address */
  logo: string | null
  /** Where the logo came from, so a changed logo is fetched again */
  logoSrc: string | null
  /** A light-themed company: the curtain is its background color, SLAB's letters in its ink */
  bg?: string | null
  ink?: string | null
}

/** Same company look (the logo may be a phone copy in one and a web address in the other) */
const sameBrand = (a: LaunchBrand, b: LaunchBrand) =>
  a.kind === b.kind && a.name === b.name && a.box === b.box && a.accent === b.accent && a.logoSrc === b.logoSrc && (a.bg ?? null) === (b.bg ?? null)

const NEUTRAL: LaunchBrand = { kind: 'slab', name: null, box: ORANGE, accent: ORANGE, logo: null, logoSrc: null }

const HEX = /^#?[0-9a-f]{6}$/i
const hex = (c: unknown): string | null => (typeof c === 'string' && HEX.test(c.trim()) ? '#' + c.trim().replace('#', '') : null)

/** A logo the curtain can draw (React Native can't draw SVG from a web address) */
const drawable = (url: string | null | undefined) => (url && /^https?:\/\//i.test(url) && !/\.svg(\?|$)/i.test(url) ? url : null)

/** Keeps the company logo on the phone, so the curtain shows it instantly next launch, even offline */
async function localLogo(url: string): Promise<string> {
  const ext = (url.match(/\.(png|jpe?g|webp|gif)(\?|$)/i)?.[1] || 'png').toLowerCase()
  let h = 0
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) | 0
  const file = `${FileSystem.documentDirectory}launch-logo-${(h >>> 0).toString(36)}.${ext}`
  const info = await FileSystem.getInfoAsync(file)
  if (!info.exists) await FileSystem.downloadAsync(url, file)
  return file
}

interface CurtainApi {
  /** Bring the curtain back (or keep it up) while the screen underneath loads */
  hold: () => void
  /** The screen underneath has painted: part the curtain (onOpen runs as it starts to part) */
  release: (onOpen?: () => void) => void
  /** True while the curtain is up */
  showing: () => boolean
}

const CurtainContext = createContext<CurtainApi>({ hold: () => {}, release: (open) => open?.(), showing: () => false })

export const useLaunchCurtain = () => useContext(CurtainContext)

type Phase = 'hold' | 'part' | 'gone'

export function LaunchCurtainProvider({ children }: { children: React.ReactNode }) {
  const { user, company, loading } = useAuth()
  const tenant = useTenant()
  const theme = tenant.config.theme

  // ---- the company's brand, live once the company config is in ----
  const live: LaunchBrand | null = useMemo(() => {
    if (loading) return null
    if (!user) return NEUTRAL
    if (!tenant.ready) return null
    if (!company) return NEUTRAL
    if (isAceCompany(company)) return { kind: 'ace', name: 'ACE COOPERATIVES', box: ACE_GOLD, accent: ACE_GOLD, logo: null, logoSrc: null }
    const accent = hex(theme.colors.accent) || ORANGE
    const src = drawable(theme.logoUrl)
    return {
      kind: 'company',
      name: (company.name || theme.brandName || '').trim().toUpperCase() || null,
      // SLAB's box in the company's color: the one they picked for it (theme.slabLogo), else their accent
      box: hex(theme.slabLogo) || accent,
      accent,
      logo: src,
      logoSrc: src,
      // dark status bar = a light theme: the curtain runs light too, so a dark logo shows
      bg: theme.statusBar === 'dark' ? hex(theme.colors.background) : null,
      ink: theme.statusBar === 'dark' ? hex(theme.colors.text) : null,
    }
  }, [loading, user?.id, tenant.ready, company?.id, company?.name, theme])

  // ---- what the last launch saw ----
  const [cached, setCached] = useState<LaunchBrand | null | undefined>(undefined)
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((s) => setCached(s ? (JSON.parse(s) as LaunchBrand) : null))
      .catch(() => setCached(null))
  }, [])

  // Remember this company for next launch (its logo copied onto the phone); signing out forgets it
  const savedRef = useRef<string>('')
  useEffect(() => {
    if (!live || cached === undefined) return
    let cancelled = false
    ;(async () => {
      let next = live
      if (live.logoSrc) {
        const keep = cached && cached.logoSrc === live.logoSrc && cached.logo && !/^https?:/i.test(cached.logo) ? cached.logo : null
        const file = keep ?? (await localLogo(live.logoSrc).catch(() => null))
        next = { ...live, logo: file ?? live.logoSrc }
      }
      const json = JSON.stringify(next)
      const key = (user ? 'in:' : 'out:') + json
      if (cancelled || key === savedRef.current) return
      savedRef.current = key
      // Signed out: forget it, so the next launch opens on SLAB alone (reps without a company keep theirs)
      if (!user) AsyncStorage.removeItem(CACHE_KEY).catch(() => {})
      else AsyncStorage.setItem(CACHE_KEY, json).catch(() => {})
    })()
    return () => {
      cancelled = true
    }
  }, [live, cached, user?.id])

  // ---- the curtain itself ----
  const [phase, setPhase] = useState<Phase>('hold')
  const [holdId, setHoldId] = useState(0)
  const [brand, setBrand] = useState<LaunchBrand | null>(null)
  const [waited, setWaited] = useState(false)
  const releaseWanted = useRef(false)
  const [tick, setTick] = useState(0)
  const shownAt = useRef<number | null>(null)
  const onOpen = useRef<(() => void) | null>(null)

  const phaseRef = useRef<Phase>('hold')
  const holdAgain = useRef(false)
  const go = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }
  const hold = useCallback(() => {
    releaseWanted.current = false
    onOpen.current = null
    if (phaseRef.current === 'part') holdAgain.current = true // let it finish parting, then come back
    if (phaseRef.current !== 'gone') return
    shownAt.current = null
    setBrand(null)
    setWaited(false)
    setHoldId((n) => n + 1)
    go('hold')
  }, [])
  const onPart = useCallback(() => go('part'), [])
  const onGone = useCallback(() => {
    if (phaseRef.current !== 'part') return
    go('gone')
    if (holdAgain.current) {
      holdAgain.current = false
      hold()
    }
  }, [hold])

  // Each hold picks its brand once and keeps it: the live one if it's in, else the cached one,
  // else SLAB alone after a short wait
  useEffect(() => {
    if (phase !== 'hold') return
    const t = setTimeout(() => setWaited(true), BRAND_WAIT_MS)
    return () => clearTimeout(t)
  }, [phase, holdId])
  // While it still holds, a different live brand replaces what's showing: a SLAB admin switching
  // company starts the hold before the new company has loaded, and the cache can be another company's
  useEffect(() => {
    if (phase !== 'hold') return
    if (live) {
      if (brand && (sameBrand(brand, live) || releaseWanted.current)) return
      // A cached copy of the same company draws its logo from the phone, not the network
      setBrand(cached && sameBrand(cached, live) ? cached : live)
    } else if (brand) return
    else if (cached) setBrand(cached)
    else if (cached === null && waited) setBrand(NEUTRAL)
  }, [phase, brand, live, cached, waited])

  // Safety: never stuck behind the curtain
  useEffect(() => {
    if (phase !== 'hold') return
    const t = setTimeout(() => {
      releaseWanted.current = true
      setBrand((b) => b ?? NEUTRAL)
      setTick((n) => n + 1)
    }, MAX_HOLD_MS)
    return () => clearTimeout(t)
  }, [phase, holdId])

  const release = useCallback((open?: () => void) => {
    onOpen.current = open ?? null
    releaseWanted.current = true
    setTick((n) => n + 1)
  }, [])

  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {})
  }, [])

  return (
    <CurtainContext.Provider value={useMemo(() => ({ hold, release, showing: () => phaseRef.current === 'hold' }), [hold, release])}>
      {children}
      {phase !== 'gone' && (
        <Curtain
          key={holdId}
          brand={brand}
          releaseWanted={releaseWanted}
          onOpen={onOpen}
          tick={tick}
          shownAt={shownAt}
          reduceMotion={reduceMotion}
          onPart={onPart}
          onGone={onGone}
        />
      )}
    </CurtainContext.Provider>
  )
}

/** The demo's timing: logos flicker in, the name shows, then a seam lights and the halves part */
const FLICKER_STEP = 60
const MIN_SHOWN_MS = 500
const CRACK_MS = 220
const PART_MS = 700

function Curtain({
  brand,
  releaseWanted,
  onOpen,
  tick,
  shownAt,
  reduceMotion,
  onPart,
  onGone,
}: {
  brand: LaunchBrand | null
  releaseWanted: React.MutableRefObject<boolean>
  onOpen: React.MutableRefObject<(() => void) | null>
  tick: number
  shownAt: React.MutableRefObject<number | null>
  reduceMotion: boolean
  onPart: () => void
  onGone: () => void
}) {
  const { width } = useWindowDimensions()
  const logos = useRef(new Animated.Value(0)).current
  const tag = useRef(new Animated.Value(0)).current
  const seam = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(0)).current
  const [shown, setShown] = useState(false)
  const parting = useRef(false)

  // Logos glitch in once the brand is picked
  useEffect(() => {
    if (!brand) return
    let alive = true
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, f: () => void) => timers.push(setTimeout(() => alive && f(), ms))
    if (reduceMotion) {
      logos.setValue(1)
      tag.setValue(1)
      at(0, () => setShown(true))
    } else {
      for (let i = 0; i < 6; i++) at(i * FLICKER_STEP, () => logos.setValue(i % 2 ? 0 : 1))
      at(6 * FLICKER_STEP, () => {
        logos.setValue(1)
        tag.setValue(1)
        setShown(true)
      })
    }
    return () => {
      alive = false
      timers.forEach(clearTimeout)
    }
  }, [brand])

  useEffect(() => {
    if (shown && shownAt.current === null) shownAt.current = Date.now()
  }, [shown])

  // Part once the screen underneath is ready and the logos have had their moment
  useEffect(() => {
    if (!shown || parting.current || !releaseWanted.current) return
    const wait = Math.max(0, MIN_SHOWN_MS - (Date.now() - (shownAt.current ?? Date.now())))
    const t = setTimeout(() => {
      if (parting.current || !releaseWanted.current) return
      parting.current = true
      onPart()
      onOpen.current?.()
      onOpen.current = null
      Animated.sequence([
        Animated.timing(seam, { toValue: 1, duration: reduceMotion ? 0 : 200, useNativeDriver: true }),
        Animated.delay(reduceMotion ? 0 : CRACK_MS - 200),
        Animated.timing(slide, {
          toValue: 1,
          duration: reduceMotion ? 0 : PART_MS,
          easing: Easing.bezier(0.77, 0, 0.175, 1),
          useNativeDriver: true,
        }),
      ]).start(() => onGone())
    }, wait)
    return () => clearTimeout(t)
  }, [shown, tick])

  const half = width / 2
  const shift = width * 0.52
  const leftX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, -shift] })
  const rightX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, shift] })

  const content = brand ? <CurtainFace brand={brand} logos={logos} tag={tag} /> : null
  const bgStyle = brand?.bg ? { backgroundColor: brand.bg } : null

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={shown && parting.current ? 'none' : 'auto'}>
      {/* Left half: the left side of the face, its seam on the right edge */}
      <Animated.View style={[styles.half, bgStyle, { left: 0, width: half, transform: [{ translateX: leftX }] }]}>
        <View style={[styles.face, bgStyle, { width, left: 0 }]}>{content}</View>
        <Animated.View style={[styles.seam, { right: 0, backgroundColor: brand?.accent ?? ORANGE, shadowColor: brand?.accent ?? ORANGE, opacity: seam }]} />
      </Animated.View>
      {/* Right half: the right side of the face, its seam on the left edge */}
      <Animated.View style={[styles.half, bgStyle, { left: half, width: width - half, transform: [{ translateX: rightX }] }]}>
        <View style={[styles.face, bgStyle, { width, left: -half }]}>{content}</View>
        <Animated.View style={[styles.seam, { left: 0, backgroundColor: brand?.accent ?? ORANGE, shadowColor: brand?.accent ?? ORANGE, opacity: seam }]} />
      </Animated.View>
    </View>
  )
}

function CurtainFace({ brand, logos, tag }: { brand: LaunchBrand; logos: Animated.Value; tag: Animated.Value }) {
  const [logoFailed, setLogoFailed] = useState(false)
  // A wide wordmark (Ronin's is 4.4 : 1) would shrink to a sliver in the square badge box: it gets a wide
  // box instead, and SLAB steps down so the two read about the same size
  const [aspect, setAspect] = useState<number | null>(null)
  useEffect(() => {
    setAspect(null)
    if (brand.kind !== 'company' || !brand.logo) return
    let live = true
    Image.getSize(brand.logo, (w, h) => live && h > 0 && setAspect(w / h), () => {})
    return () => {
      live = false
    }
  }, [brand.kind, brand.logo])
  const wide = aspect != null && aspect >= 2
  const coLogoStyle = wide ? { width: 168, height: Math.round(168 / aspect!) } : styles.coLogo
  const slabStyle = wide ? styles.slabSmall : styles.slab
  const slab =
    brand.kind === 'ace' ? (
      <Image source={SLAB_ACE} style={styles.slab} resizeMode="contain" />
    ) : (
      <View style={slabStyle}>
        <Image source={SLAB_BOX} style={[StyleSheet.absoluteFill, { width: undefined, height: undefined, tintColor: brand.box }]} resizeMode="contain" />
        <Image
          source={SLAB_LETTERS}
          style={[StyleSheet.absoluteFill, { width: undefined, height: undefined }, brand.ink ? { tintColor: brand.ink } : null]}
          resizeMode="contain"
        />
      </View>
    )
  const other =
    brand.kind === 'ace' ? (
      <Image source={ACE_LOGO} style={styles.coLogo} resizeMode="contain" />
    ) : brand.logo && !logoFailed ? (
      <Image source={{ uri: brand.logo }} style={coLogoStyle} resizeMode="contain" onError={() => setLogoFailed(true)} />
    ) : null

  return (
    <>
      <Animated.View style={[styles.logos, { opacity: logos }]}>
        {slab}
        {brand.kind !== 'slab' && (other || brand.name) ? <Text style={[styles.x, { color: brand.accent }]}>×</Text> : null}
        {other}
        {brand.kind !== 'slab' && !other && brand.name ? (
          <Text style={[styles.coName, { color: brand.accent }]} numberOfLines={2}>
            {brand.name}
          </Text>
        ) : null}
      </Animated.View>
      {brand.kind !== 'slab' && other && brand.name ? (
        <Animated.Text style={[styles.tag, { color: brand.accent, opacity: tag }]} numberOfLines={1}>
          {brand.name}
        </Animated.Text>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  half: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden', backgroundColor: '#000' },
  face: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  seam: { position: 'absolute', top: 0, bottom: 0, width: 1, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  logos: { flexDirection: 'row', alignItems: 'center' },
  // SLAB's logo is 500 × 274
  slab: { width: 150, height: 82 },
  // beside a wide wordmark
  slabSmall: { width: 112, height: 61 },
  x: { fontSize: 24, marginHorizontal: 14 },
  coLogo: { width: 64, height: 64 },
  coName: { maxWidth: 120, fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  tag: { marginTop: 16, fontSize: 11, fontWeight: '700', letterSpacing: 3.3 },
})
