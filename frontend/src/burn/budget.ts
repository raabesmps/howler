/*
 * A performance budget for the burn. The burn is a lot of drawing (a per-pixel burn pass, hundreds of flame sprites a
 * second, a full-screen glow) and phones differ a lot. Instead of tuning for one phone, the effect watches its own frame
 * time and steps down through a few quality levels until it keeps up. It only ever goes down: going back up would make
 * the frame rate oscillate, and the burn is over in a few seconds anyway.
 *
 * What a level changes, in order of how much it saves:
 *  - dprCap: the canvas resolution. Pixels grow with the square of it, so this is the biggest lever.
 *  - burnEvery: the burn front is recomputed per pixel; it moves slowly, so every 2nd to 4th frame is enough.
 *  - spawn: the share of flames, sparks and paper fragments that are created.
 */
export interface Budget {
  level: number
  /** multiplies how many flames, sparks and fragments are spawned */
  spawn: number
  /** the per-pixel burn pass runs on every Nth frame */
  burnEvery: number
  /** the most device pixels per CSS pixel the canvas will use */
  dprCap: number
}

export const LEVELS: readonly Budget[] = [
  { level: 0, spawn: 1, burnEvery: 1, dprCap: 2 },
  { level: 1, spawn: 0.6, burnEvery: 2, dprCap: 1.5 },
  { level: 2, spawn: 0.35, burnEvery: 3, dprCap: 1.25 },
  { level: 3, spawn: 0.2, burnEvery: 4, dprCap: 1 },
]

/** Frames slower than this, typically (the median of a short window; about 40 fps) trigger a step down. */
export const SLOW_MS = 25
const WARMUP_FRAMES = 4
const WINDOW_FRAMES = 8

/** Phones that report few cores or little memory start one level down, so they never see the slow first seconds. */
export function startLevel(hardwareConcurrency: number | undefined, deviceMemoryGb: number | undefined): number {
  const fewCores = hardwareConcurrency !== undefined && hardwareConcurrency <= 4
  const littleMemory = deviceMemoryGb !== undefined && deviceMemoryGb <= 3
  return fewCores || littleMemory ? 1 : 0
}

export class FrameGovernor {
  private seen = 0
  private window: number[] = []

  constructor(private current = 0) {}

  get budget(): Budget {
    return LEVELS[this.current]!
  }

  /** Feed the real time since the previous frame, in ms. Returns true when the budget just changed. */
  sample(frameMs: number): boolean {
    this.seen++
    if (this.seen <= WARMUP_FRAMES) return false // the first frames pay for compiling and allocating, not for steady state
    this.window.push(frameMs)
    if (this.window.length < WINDOW_FRAMES) return false

    // the median, not the mean: one garbage-collection hiccup must not cost the whole burn its quality
    const sorted = [...this.window].sort((a, b) => a - b)
    const median = (sorted[WINDOW_FRAMES / 2 - 1]! + sorted[WINDOW_FRAMES / 2]!) / 2
    this.window = []
    if (median > SLOW_MS && this.current < LEVELS.length - 1) {
      this.current++
      return true
    }
    return false
  }
}
