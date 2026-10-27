import React, { useMemo } from 'react'
import Svg, { Rect } from 'react-native-svg'
import { useSpriteEngine } from './useSpriteEngine'
import { CROPS, composeRider, composeRideIcon, cropGrid, flipGrid, toRuns } from './render'
import type { RepLook, SpriteCrop, SpriteGrid } from './types'

interface PixelSpriteProps {
  look: RepLook
  /** Rendered height in points; width follows the crop's aspect */
  size: number
  pose?: string
  mood?: string
  crop?: SpriteCrop
  flip?: boolean
  /** Show their ride (full crop only): side poses ride it, others stand beside it */
  withRide?: boolean
  /** Lift by one sprite pixel (idle "breathing") */
  bob?: boolean
}

/** Draws a grid crisply at any size */
export function PixelGrid({ grid, size, bob }: { grid: SpriteGrid; size: number; bob?: boolean }) {
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const runs = useMemo(() => toRuns(grid), [grid])
  if (!h || !w) return null
  return (
    <Svg width={(size * w) / h} height={size} viewBox={`0 ${bob ? 1 : 0} ${w} ${h}`}>
      {runs.map((r, i) => (
        // overlap by a hair so anti-aliasing never shows seams between runs
        <Rect key={i} x={r.x} y={r.y} width={r.w + 0.02} height={1.02} fill={r.c} />
      ))}
    </Svg>
  )
}

/** A rep drawn by the pixel engine in the company's gear */
export default function PixelSprite({
  look,
  size,
  pose = 'idle',
  mood = 'happy',
  crop = 'full',
  flip = false,
  withRide = false,
  bob = false,
}: PixelSpriteProps) {
  const engine = useSpriteEngine()
  const grid = useMemo(() => {
    let g: SpriteGrid
    if (withRide && crop === 'full' && engine.RIDES[look.ride]) {
      const p = pose === 'idle' ? 'down-0' : pose
      // demo's drawRiderFit: a 72-wide window starting at x 6
      g = cropGrid(composeRider(engine, look, p, mood), [6, 0, 72, engine.RIDER_H])
    } else {
      g = cropGrid(engine.composeSprite(look, pose, mood), CROPS[crop])
    }
    return flip ? flipGrid(g) : g
  }, [engine, JSON.stringify(look), pose, mood, crop, flip, withRide])

  return <PixelGrid grid={grid} size={size} bob={bob} />
}

/** A ride on its own, for locker tiles */
export function RideIcon({ kind, size }: { kind: string; size: number }) {
  const engine = useSpriteEngine()
  const grid = useMemo(() => composeRideIcon(engine, kind), [engine, kind])
  return <PixelGrid grid={grid} size={size} />
}
