import { beforeEach, describe, expect, it } from 'vitest'
import { createMockApi } from './mock'
import { GoneError } from './types'

const DAY = 24 * 60 * 60 * 1000

describe('mock api', () => {
  let time = 1_700_000_000_000
  const api = createMockApi(() => time)

  beforeEach(() => {
    localStorage.clear()
    time = 1_700_000_000_000
  })

  it('creates a sealed howler whose status does not reveal the content', async () => {
    const { token } = await api.create({ message: 'You never answer my calls', recipient: 'Ana' })
    expect(await api.status(token)).toBe('sealed')
    expect(JSON.stringify(await api.status(token))).not.toContain('answer')
  })

  it('previews the recipient without revealing the message', async () => {
    const a = await api.create({ message: 'Você nunca atende as minhas ligações', recipient: 'Ana' })
    expect(await api.preview(a.token)).toEqual({ recipient: 'Ana' })
    expect(await api.preview('garbage')).toEqual({ recipient: '' })
    expect(JSON.stringify(await api.preview(a.token))).not.toContain('ligações')
  })

  it('opens exactly once, then it is burned', async () => {
    const { token } = await api.create({ message: 'Clean your room', recipient: '' })
    expect(await api.open(token)).toEqual({ message: 'Clean your room', recipient: '', audio: null })
    expect(await api.status(token)).toBe('burned')
    await expect(api.open(token)).rejects.toMatchObject({ name: 'GoneError', reason: 'burned' })
  })

  it('survives two concurrent opens by releasing the content once', async () => {
    const { token } = await api.create({ message: 'Hello', recipient: '' })
    const results = await Promise.allSettled([api.open(token), api.open(token)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
  })

  it('expires after 7 days', async () => {
    const { token } = await api.create({ message: 'Hello', recipient: '' })
    time += 7 * DAY - 1000
    expect(await api.status(token)).toBe('sealed')
    time += 2000
    expect(await api.status(token)).toBe('expired')
    await expect(api.open(token)).rejects.toBeInstanceOf(GoneError)
  })

  it('treats garbage and tampered tokens as not found', async () => {
    expect(await api.status('not-a-token')).toBe('notfound')
    expect(await api.status('')).toBe('notfound')
    const { token } = await api.create({ message: 'Hello', recipient: '' })
    expect(await api.status(token.slice(0, -4) + 'AAAA')).toBe('notfound')
    await expect(api.open('zzz')).rejects.toMatchObject({ reason: 'notfound' })
  })

  it('validates length and keeps unicode intact', async () => {
    await expect(api.create({ message: '', recipient: '' })).rejects.toBeInstanceOf(RangeError)
    await expect(api.create({ message: 'x'.repeat(141), recipient: '' })).rejects.toBeInstanceOf(RangeError)
    const { token } = await api.create({ message: 'Você nunca atende as minhas ligações! 😠', recipient: 'João' })
    expect(await api.open(token)).toEqual({ message: 'Você nunca atende as minhas ligações! 😠', recipient: 'João', audio: null })
  })
})
