import type { RepLook, SpriteCrop, SpriteEngine, SpriteGrid } from './types'

/** Crops in sprite pixels: [x, y, w, h] (same as the demo) */
export const CROPS: Record<SpriteCrop, [number, number, number, number]> = {
  full: [0, 0, 36, 52],
  head: [6, 0, 24, 24],
  torso: [4, 17, 28, 22],
  legs: [6, 32, 24, 18],
  bust: [4, 0, 28, 32],
}

/** One horizontal run of same-colored pixels */
export interface PixelRun {
  x: number
  y: number
  w: number
  c: string
}

/** A grid that the demo's fillRect-style painters can draw into */
class GridCanvas {
  grid: SpriteGrid
  fillStyle = '#000000'
  constructor(public w: number, public h: number) {
    this.grid = Array.from({ length: h }, () => Array(w).fill(null))
  }
  fillRect(x: number, y: number, w: number, h: number) {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) {
      if (yy < 0 || yy >= this.h) continue
      for (let xx = Math.round(x); xx < Math.round(x + w); xx++) {
        if (xx >= 0 && xx < this.w) this.grid[yy][xx] = this.fillStyle
      }
    }
  }
  /** Copy a grid in at (dx, dy), optionally mirrored */
  draw(src: SpriteGrid, dx: number, dy: number) {
    src.forEach((row, y) =>
      row.forEach((c, x) => {
        const tx = dx + x
        const ty = dy + y
        if (c && tx >= 0 && tx < this.w && ty >= 0 && ty < this.h) this.grid[ty][tx] = c
      })
    )
  }
}

/** Mirror a grid left to right */
export function flipGrid(grid: SpriteGrid): SpriteGrid {
  return grid.map((row) => row.slice().reverse())
}

/** Cut a rectangle out of a grid */
export function cropGrid(grid: SpriteGrid, [cx, cy, cw, ch]: [number, number, number, number]): SpriteGrid {
  return grid.slice(cy, cy + ch).map((row) => row.slice(cx, cx + cw))
}

/** Merge each row into runs so a sprite is a few hundred rects, not ~1,900 */
export function toRuns(grid: SpriteGrid): PixelRun[] {
  const runs: PixelRun[] = []
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      if (!c) {
        x++
        continue
      }
      let w = 1
      while (x + w < row.length && row[x + w] === c) w++
      runs.push({ x, y, w, c })
      x += w
    }
  })
  return runs
}

/**
 * A rep on (or parked beside) their ride, in the demo's 84x68 rider frame.
 * Side poses ride it; front/back poses stand beside it.
 */
export function composeRider(engine: SpriteEngine, look: RepLook, pose: string, mood: string, frame = 0): SpriteGrid {
  const g = new GridCanvas(engine.RIDER_W, engine.RIDER_H)
  const ride = engine.RIDES[look.ride] ? look.ride : null
  const mounted = /^side/.test(pose)
  const spr = engine.composeSprite(look, pose, mood)
  if (ride && mounted) {
    g.draw(spr, 24, engine.RIDER_OY - 49 - engine.RIDES[ride].lift)
    engine.paintRide(g, ride, engine.RIDER_OX, engine.RIDER_OY, frame)
  } else {
    if (ride === 'scooter') {
      // parked facing the other way so its stem shows past their side (demo: translate 58, scale -1)
      const t = new GridCanvas(engine.RIDER_W, engine.RIDER_H)
      engine.paintRide(t, ride, 29, engine.RIDER_OY, 0)
      t.grid.forEach((row, y) =>
        row.forEach((c, x) => {
          const tx = 58 - 1 - x
          if (c && tx >= 0 && tx < g.w) g.grid[y][tx] = c
        })
      )
    } else if (ride) {
      engine.paintRide(g, ride, engine.RIDER_OX - 22, engine.RIDER_OY, 0)
    }
    g.draw(spr, 24, engine.RIDER_OY - 49)
  }
  return g.grid
}

/** A ride on its own (locker tiles), 48x50 */
export function composeRideIcon(engine: SpriteEngine, kind: string): SpriteGrid {
  const g = new GridCanvas(48, 50)
  if (engine.RIDES[kind]) engine.paintRide(g, kind, 24, 49, 1)
  return g.grid
}
