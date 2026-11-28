/*
 * Consent for the optional analytics cookies (LGPD art. 7, I; ADR-006).
 *
 * - Nothing optional runs before a choice: Google Tag Manager is only loaded after "Accept".
 * - Accepting and refusing are equally easy (two buttons of the same size, side by side).
 * - The choice can be changed at any time from the "Cookies" link in the footer.
 * - The choice itself is kept in this browser's local storage, never in a cookie and never sent anywhere.
 *   It carries a version: if what is collected ever changes, bumping it asks everyone again.
 */
import { ref } from 'vue'

export type Choice = 'granted' | 'denied'
const STORAGE = 'howler.consent'
export const CONSENT_VERSION = 1

interface Stored { v: number; choice: Choice; at: string }

function read(): Choice | null {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<Stored>
    return s.v === CONSENT_VERSION && (s.choice === 'granted' || s.choice === 'denied') ? s.choice : null
  } catch { return null }
}

/** The visitor's choice; null until they make one. */
export const consent = ref<Choice | null>(read())
/** The banner opened again from the footer link, to change a choice already made. */
export const reopened = ref(false)

const listeners = new Set<(c: Choice) => void>()
export function onConsentChange(fn: (c: Choice) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function choose(choice: Choice): void {
  consent.value = choice
  reopened.value = false
  try { localStorage.setItem(STORAGE, JSON.stringify({ v: CONSENT_VERSION, choice, at: new Date().toISOString() } satisfies Stored)) } catch { /* private mode: asked again next visit */ }
  listeners.forEach((fn) => fn(choice))
}

export function reopenConsent(): void {
  reopened.value = true
}

/** For the tests. */
export function resetConsentForTests(): void {
  consent.value = read()
  reopened.value = false
  listeners.clear()
}

/** Deletes Google Analytics cookies (_ga, _ga_*, _gid, _gat*) on this host and on every parent domain they may be set on. */
export function clearAnalyticsCookies(): void {
  if (typeof document === 'undefined') return
  const names = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^_ga($|_)|^_gid$|^_gat/.test(n))
  const parts = location.hostname.split('.')
  const domains = ['', ...parts.map((_, i) => parts.slice(i).join('.')).filter((d) => d.includes('.'))]
  for (const name of names) {
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`
    }
  }
}
