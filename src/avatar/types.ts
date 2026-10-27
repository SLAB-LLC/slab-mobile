/** Everything that describes how a rep looks; stored as JSON in user_avatars.look */
export interface RepLook {
  skin: number
  eyes: number
  eyeStyle?: 'dot' | 'simple' | 'big'
  hair: string
  hairColor: number
  face: string
  top: string
  hat: string
  pants: string
  shoes: string
  extra: string
  ride: string
}

export type GearSlot = 'top' | 'hat' | 'pants' | 'shoes' | 'extra' | 'ride'

export interface GearItem {
  id: string
  name: string
  /** Total XP that unlocks it (0 = always open) */
  xp: number
}

/** 36x52 grid of hex colors, null = transparent */
export type SpriteGrid = (string | null)[][]

export type SpriteCrop = 'full' | 'head' | 'torso' | 'legs' | 'bust'

export interface SpriteEngine {
  SPR_W: number
  SPR_H: number
  OUTLINE: string
  SKINS: string[]
  HAIR_COLORS: string[]
  EYE_COLORS: string[]
  HAIR_STYLES: { id: string; name: string }[]
  FACES: { id: string; name: string }[]
  GEAR: Record<GearSlot, GearItem[]>
  ALL_GEAR: (GearItem & { slot: GearSlot })[]
  DEFAULT_LOOK: RepLook
  RIDES: Record<string, { lift: number; name: string }>
  RIDER_W: number
  RIDER_H: number
  RIDER_OX: number
  RIDER_OY: number
  composeSprite: (look: RepLook, pose?: string, mood?: string) => SpriteGrid
  paintRide: (
    g: { fillStyle: string; fillRect: (x: number, y: number, w: number, h: number) => void },
    kind: string,
    ox: number,
    oy: number,
    frame?: number
  ) => void
}
