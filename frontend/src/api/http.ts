/*
 * The real client: talks to the Laravel API (docs/api/openapi.yaml).
 *
 * In development the Vite server proxies /api to the backend, and in production the reverse proxy does, so the browser
 * only ever calls its own origin: no CORS and no key. Every failure becomes one of a few typed errors the screens can
 * explain to a person: NetworkError, RateLimitError, ValidationError, ServerError, and GoneError for a howler that is
 * burned, expired or unknown.
 */
import {
  GoneError,
  NetworkError,
  RateLimitError,
  ServerError,
  ValidationError,
  type HowlerApi,
  type HowlerContent,
  type HowlerPreview,
  type HowlerStatus,
  type NewHowler,
  type ReportReason,
} from './types'

type Fetch = typeof fetch

interface StateBody { status?: unknown; recipient_name?: unknown }
interface OpenBody { message?: unknown; recipient_name?: unknown; audio?: { data?: unknown } | null }
interface GoneBody { status?: unknown }

const STATES: readonly string[] = ['sealed', 'burned', 'expired']
/** The state and the preview come from the same GET: share it for a moment instead of asking twice. */
const LOOKUP_TTL_MS = 3000

function base64ToBytes(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

export function createHttpApi(baseUrl = '/api', fetchImpl: Fetch = (...a) => fetch(...a)): HowlerApi {
  const root = baseUrl.replace(/\/$/, '')
  const lookups = new Map<string, Promise<{ status: HowlerStatus; recipient: string }>>()

  async function call(path: string, init?: RequestInit): Promise<Response> {
    let res: Response
    try {
      res = await fetchImpl(`${root}${path}`, { ...init, headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) } })
    } catch {
      throw new NetworkError()
    }
    if (res.status === 429) {
      const after = Number(res.headers.get('Retry-After'))
      throw new RateLimitError(Number.isFinite(after) && after > 0 ? after : null)
    }
    return res
  }

  async function json<T>(res: Response): Promise<T> {
    try {
      return (await res.json()) as T
    } catch {
      throw new ServerError(res.status)
    }
  }

  async function validation(res: Response): Promise<never> {
    const body = await json<{ errors?: Record<string, string[]>; message?: string }>(res).catch(() => ({}) as { errors?: Record<string, string[]>; message?: string })
    const first = body.errors ? Object.values(body.errors)[0]?.[0] : undefined
    throw new ValidationError(first ?? body.message ?? 'That could not be sent.')
  }

  function lookup(token: string): Promise<{ status: HowlerStatus; recipient: string }> {
    const cached = lookups.get(token)
    if (cached) return cached
    const p = (async () => {
      const res = await call(`/howlers/${encodeURIComponent(token)}`)
      if (res.status === 404) return { status: 'notfound' as const, recipient: '' }
      if (!res.ok) throw new ServerError(res.status)
      const body = await json<StateBody>(res)
      if (typeof body.status !== 'string' || !STATES.includes(body.status)) throw new ServerError(res.status)
      return { status: body.status as HowlerStatus, recipient: typeof body.recipient_name === 'string' ? body.recipient_name : '' }
    })()
    lookups.set(token, p)
    // failures must not be remembered, or a retry would get the same error back
    p.catch(() => lookups.delete(token))
    setTimeout(() => lookups.delete(token), LOOKUP_TTL_MS)
    return p
  }

  return {
    async create({ message, recipient }: NewHowler) {
      const res = await call('/howlers', {
        method: 'POST',
        body: JSON.stringify({ message: message.trim(), recipient_name: recipient.trim() || null }),
      })
      if (res.status === 422) return validation(res)
      if (res.status !== 201) throw new ServerError(res.status)
      const body = await json<{ token?: unknown; expires_at?: unknown; voice?: unknown }>(res)
      if (typeof body.token !== 'string' || typeof body.expires_at !== 'string') throw new ServerError(res.status)
      return { token: body.token, expiresAt: Date.parse(body.expires_at), voice: body.voice === true }
    },

    async status(token: string) {
      return (await lookup(token)).status
    },

    async preview(token: string): Promise<HowlerPreview> {
      return { recipient: (await lookup(token)).recipient }
    },

    async open(token: string): Promise<HowlerContent> {
      lookups.delete(token)
      const res = await call(`/howlers/${encodeURIComponent(token)}/open`, { method: 'POST' })
      if (res.status === 404) throw new GoneError('notfound')
      if (res.status === 410) {
        const body = await json<GoneBody>(res).catch((): GoneBody => ({}))
        throw new GoneError(body.status === 'expired' ? 'expired' : 'burned')
      }
      if (!res.ok) throw new ServerError(res.status)
      const body = await json<OpenBody>(res)
      if (typeof body.message !== 'string') throw new ServerError(res.status)
      const audio = body.audio && typeof body.audio.data === 'string' ? base64ToBytes(body.audio.data) : null
      return { message: body.message, recipient: typeof body.recipient_name === 'string' ? body.recipient_name : '', audio }
    },

    async report(token: string, reason: ReportReason): Promise<void> {
      const res = await call(`/howlers/${encodeURIComponent(token)}/report`, { method: 'POST', body: JSON.stringify({ reason }) })
      if (res.status === 404 || res.status === 201) return // a howler that is already gone needs no report
      if (res.status === 422) return validation(res)
      throw new ServerError(res.status)
    },
  }
}
