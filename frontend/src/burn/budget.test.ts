import { describe, expect, it } from 'vitest'
import { FrameGovernor, LEVELS, SLOW_MS, startLevel } from './budget'

function feed(g: FrameGovernor, ms: number, frames: number): boolean[] {
  return Array.from({ length: frames }, () => g.sample(ms))
}

describe('startLevel', () => {
  it('starts full on a capable device and one level down on a weak one', () => {
    expect(startLevel(8, 8)).toBe(0)
    expect(startLevel(undefined, undefined)).toBe(0)
    expect(startLevel(4, 8)).toBe(1)
    expect(startLevel(8, 2)).toBe(1)
    expect(startLevel(2, 1)).toBe(1)
  })
})

describe('FrameGovernor', () => {
  it('stays at full quality while frames are fast', () => {
    const g = new FrameGovernor()
    expect(feed(g, 16.7, 200).some(Boolean)).toBe(false)
    expect(g.budget.level).toBe(0)
  })

  it('ignores the first frames, which are always slow', () => {
    const g = new FrameGovernor()
    feed(g, 300, 4) // warm-up
    expect(feed(g, 16, 40).some(Boolean)).toBe(false)
    expect(g.budget.level).toBe(0)
  })

  it('steps down when frames are slow, and keeps stepping until it keeps up', () => {
    const g = new FrameGovernor()
    feed(g, 400, 4)
    expect(feed(g, 60, 8).filter(Boolean)).toHaveLength(1)
    expect(g.budget.level).toBe(1)
    expect(feed(g, 60, 8).filter(Boolean)).toHaveLength(1)
    expect(g.budget.level).toBe(2)
    // now it keeps up at the new level: no more changes
    expect(feed(g, 20, 100).some(Boolean)).toBe(false)
    expect(g.budget.level).toBe(2)
  })

  it('never goes below the last level, and never back up', () => {
    const g = new FrameGovernor()
    feed(g, 500, 400)
    expect(g.budget.level).toBe(LEVELS.length - 1)
    feed(g, 5, 400)
    expect(g.budget.level).toBe(LEVELS.length - 1)
  })

  it('does not react to one stutter inside an otherwise smooth window', () => {
    const g = new FrameGovernor()
    feed(g, 16, 4)
    g.sample(120)
    feed(g, 16, 7)
    expect(g.budget.level).toBe(0)
  })

  it('can start at a given level and the levels really get cheaper', () => {
    expect(new FrameGovernor(1).budget.level).toBe(1)
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]!.spawn).toBeLessThan(LEVELS[i - 1]!.spawn)
      expect(LEVELS[i]!.dprCap).toBeLessThanOrEqual(LEVELS[i - 1]!.dprCap)
      expect(LEVELS[i]!.burnEvery).toBeGreaterThan(LEVELS[i - 1]!.burnEvery)
    }
    expect(SLOW_MS).toBeGreaterThan(16.7)
  })
})
