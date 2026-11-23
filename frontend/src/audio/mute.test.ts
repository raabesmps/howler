import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readMuted, storeMuted } from './mute'

describe('remembered mute', () => {
  beforeEach(() => localStorage.clear())

  it('is off by default and remembers the choice', () => {
    expect(readMuted()).toBe(false)
    storeMuted(true)
    expect(readMuted()).toBe(true)
    storeMuted(false)
    expect(readMuted()).toBe(false)
  })

  it('survives blocked storage without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readMuted()).toBe(false)
    expect(() => storeMuted(true)).not.toThrow()
    vi.restoreAllMocks()
  })
})
