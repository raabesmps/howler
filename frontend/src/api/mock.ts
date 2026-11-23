/*
 * Implementation of HowlerApi with no server: for tests and for working on the screens without Docker (VITE_API=mock).
 *
 * To let a link made on one device open on another, the token itself carries the message (base64url of a small JSON).
 * "Single use" is enforced per browser through localStorage. This is a prototype shortcut: in the real product the
 * token is a random id, the message lives on the server and the open endpoint burns it atomically (CP7).
 * Known gap: anyone with the link can read the message from the URL, and the same link can be opened once per device.
 */
import {
  EXPIRY_DAYS,
  GoneError,
  MAX_MESSAGE,
  MAX_NAME,
  type HowlerApi,
  type HowlerContent,
  type HowlerPreview,
  type HowlerStatus,
  type NewHowler,
} from './types'

const BURNED_KEY = 'howler.burned'
const MAX_REMEMBERED = 300

interface Payload {
  /** id, so one howler can be remembered as burned */
  i: string
  /** message */
  m: string
  /** recipient name */
  r: string
  /** expires at (ms since epoch) */
  e: number
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): string {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

function decode(token: string): Payload | null {
  try {
    const p = JSON.parse(fromBase64Url(token)) as Partial<Payload>
    if (typeof p.i !== 'string' || typeof p.m !== 'string' || typeof p.r !== 'string' || typeof p.e !== 'number') return null
    if (p.m.length < 1 || p.m.length > MAX_MESSAGE || p.r.length > MAX_NAME) return null
    return p as Payload
  } catch {
    return null
  }
}

function readBurned(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(BURNED_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function remember(id: string): void {
  try {
    localStorage.setItem(BURNED_KEY, JSON.stringify([...readBurned(), id].slice(-MAX_REMEMBERED)))
  } catch {
    /* private mode: the link can then be opened again on this device, acceptable for the prototype */
  }
}

function randomId(): string {
  const a = new Uint8Array(9)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function createMockApi(now: () => number = Date.now): HowlerApi {
  function statusOf(p: Payload | null): HowlerStatus {
    if (!p) return 'notfound'
    if (readBurned().includes(p.i)) return 'burned'
    if (now() > p.e) return 'expired'
    return 'sealed'
  }

  return {
    async create({ message, recipient }: NewHowler) {
      const m = message.trim()
      const r = recipient.trim()
      if (m.length < 1 || m.length > MAX_MESSAGE) throw new RangeError(`message must be 1 to ${MAX_MESSAGE} characters`)
      if (r.length > MAX_NAME) throw new RangeError(`name must be at most ${MAX_NAME} characters`)
      const expiresAt = now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000
      return { token: toBase64Url(JSON.stringify({ i: randomId(), m, r, e: expiresAt } satisfies Payload)), expiresAt, voice: false }
    },

    async status(token: string) {
      return statusOf(decode(token))
    },

    async preview(token: string): Promise<HowlerPreview> {
      const p = decode(token)
      return { recipient: p?.r ?? '' }
    },

    async open(token: string): Promise<HowlerContent> {
      const p = decode(token)
      const s = statusOf(p)
      if (s !== 'sealed' || !p) throw new GoneError(s === 'sealed' ? 'notfound' : s)
      remember(p.i) // burn first, then reveal: a second call can never get the content
      return { message: p.m, recipient: p.r, audio: null }
    },

    async report(): Promise<void> {
      /* nobody to tell: the prototype has no server */
    },
  }
}

export const api: HowlerApi = createMockApi()
