import { describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './http'

function reply(status: number, body?: unknown, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

function clientWith(...responses: (Response | Error)[]) {
  const fetchMock = vi.fn(async () => {
    const next = responses.shift()
    if (!next) throw new Error('unexpected request')
    if (next instanceof Error) throw next
    return next
  })
  return { api: createHttpApi('/api', fetchMock as unknown as typeof fetch), fetchMock }
}

describe('http api', () => {
  it('creates a howler and returns the token, expiry and whether the server made a voice', async () => {
    const { api, fetchMock } = clientWith(reply(201, { token: 'abc', recipient_name: 'Ana', expires_at: '2026-11-30T18:48:46+00:00', voice: true }))

    const made = await api.create({ message: '  HOW DARE YOU  ', recipient: ' Ana ' })

    expect(made).toEqual({ token: 'abc', expiresAt: Date.parse('2026-11-30T18:48:46+00:00'), voice: true })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/howlers')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ message: 'HOW DARE YOU', recipient_name: 'Ana' })
  })

  it('sends no recipient name when there is none', async () => {
    const { api, fetchMock } = clientWith(reply(201, { token: 'abc', expires_at: '2026-11-30T18:48:46+00:00', voice: false }))
    await api.create({ message: 'Hi', recipient: '  ' })
    const init = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init[1].body as string).recipient_name).toBeNull()
  })

  it('turns a 422 into a ValidationError with the first message', async () => {
    const { api } = clientWith(reply(422, { message: 'x', errors: { message: ['The message field is required.'] } }))
    await expect(api.create({ message: 'x', recipient: '' })).rejects.toMatchObject({ name: 'ValidationError', message: 'The message field is required.' })
  })

  it('turns a 429 into a RateLimitError with the wait time', async () => {
    const { api } = clientWith(reply(429, { message: 'Too Many Attempts.' }, { 'Retry-After': '42' }))
    await expect(api.create({ message: 'x', recipient: '' })).rejects.toMatchObject({ name: 'RateLimitError', retryAfterSeconds: 42 })
  })

  it('turns a failed fetch into a NetworkError and a 500 into a ServerError', async () => {
    const { api } = clientWith(new TypeError('Failed to fetch'), reply(500, { message: 'boom' }))
    await expect(api.create({ message: 'x', recipient: '' })).rejects.toMatchObject({ name: 'NetworkError' })
    await expect(api.create({ message: 'x', recipient: '' })).rejects.toMatchObject({ name: 'ServerError', status: 500 })
  })

  it('reads the state and the preview with one request', async () => {
    const { api, fetchMock } = clientWith(reply(200, { status: 'sealed', recipient_name: 'Ana' }))

    expect(await api.status('tok')).toBe('sealed')
    expect(await api.preview('tok')).toEqual({ recipient: 'Ana' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('maps 404 to notfound and does not remember a failure', async () => {
    const { api, fetchMock } = clientWith(new TypeError('offline'), reply(404, { message: 'nope' }))

    await expect(api.status('tok')).rejects.toMatchObject({ name: 'NetworkError' })
    expect(await api.status('tok')).toBe('notfound')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('opens: returns the message and the decoded voice', async () => {
    const wav = btoa('RIFFvoice')
    const { api } = clientWith(reply(200, { message: 'BOO', recipient_name: 'Ana', audio: { mime: 'audio/wav', data: wav } }))

    const content = await api.open('tok')

    expect(content.message).toBe('BOO')
    expect(content.recipient).toBe('Ana')
    expect(new TextDecoder().decode(content.audio!)).toBe('RIFFvoice')
  })

  it('opens: no voice means null audio, so the browser reads it', async () => {
    const { api } = clientWith(reply(200, { message: 'BOO', recipient_name: null, audio: null }))
    expect(await api.open('tok')).toEqual({ message: 'BOO', recipient: '', audio: null })
  })

  it('opens: 410 is a GoneError with the reason, 404 is notfound', async () => {
    const { api } = clientWith(reply(410, { status: 'burned' }), reply(410, { status: 'expired' }), reply(404, {}))
    await expect(api.open('t')).rejects.toMatchObject({ name: 'GoneError', reason: 'burned' })
    await expect(api.open('t')).rejects.toMatchObject({ name: 'GoneError', reason: 'expired' })
    await expect(api.open('t')).rejects.toMatchObject({ name: 'GoneError', reason: 'notfound' })
  })

  it('opening always asks the server, even right after a state lookup (never a cached answer)', async () => {
    const { api, fetchMock } = clientWith(reply(200, { status: 'sealed', recipient_name: null }), reply(200, { message: 'x', recipient_name: null, audio: null }))
    await api.status('tok')
    await api.open('tok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].method).toBe('POST')
  })

  it('encodes the token in the URL', async () => {
    const { api, fetchMock } = clientWith(reply(404))
    await api.status('a/b?c')
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('/api/howlers/a%2Fb%3Fc')
  })

  it('reports, and treats an already-gone howler as fine', async () => {
    const { api, fetchMock } = clientWith(reply(201, { reported: true }), reply(404))
    await api.report('tok', 'abuse')
    await api.report('tok', 'abuse')
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ reason: 'abuse' })
  })
})
