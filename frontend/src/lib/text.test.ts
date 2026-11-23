import { describe, expect, it } from 'vitest'
import { activeWord, splitWords, wordTimings } from './text'

describe('word timing', () => {
  const words = splitWords('You never answer my calls.')
  const starts = wordTimings(words, 3)
  it('starts at zero and increases', () => {
    expect(starts[0]).toBe(0)
    for (let i = 1; i < starts.length; i++) expect(starts[i]!).toBeGreaterThan(starts[i - 1]!)
  })
  it('stays inside the duration', () => {
    expect(starts[starts.length - 1]!).toBeLessThan(3)
  })
  it('finds the active word', () => {
    expect(activeWord(starts, -1)).toBe(-1)
    expect(activeWord(starts, 0)).toBe(0)
    expect(activeWord(starts, 2.99)).toBe(words.length - 1)
  })
})
