/*
 * Google Tag Manager, on the write screen only (ADR-006).
 *
 * A howler's token is in the page address on the share screen and on the open screen, and a GTM container can run
 * whatever is switched on in its panel (Analytics, pixels, session recording). So the container is only ever loaded on
 * the write screen, which has no token, and the page is reloaded when it leaves that screen: a script cannot be
 * unloaded, so a fresh page is the only way to be sure nothing of it is still running where a token is.
 *
 * And only after consent (consent.ts, LGPD): nothing optional runs until the visitor accepts; refusing later deletes the
 * Analytics cookies and reloads the page so the container is gone.
 *
 * Off unless the build has VITE_GTM_ID (development, tests and forks load nothing). The Content-Security-Policy allows
 * Google's tag hosts only; it still blocks inline scripts, so "Custom HTML" tags in the container will not run.
 */
import type { Router } from 'vue-router'
import { clearAnalyticsCookies, consent, onConsentChange } from './consent'

const ID = import.meta.env.VITE_GTM_ID ?? ''
const SAFE_ROUTE = 'compose'

/** Whether this build has analytics at all: the cookie notice and the footer link only exist then. */
export const analyticsEnabled = /^GTM-[A-Z0-9]+$/.test(ID)

declare global {
  interface Window { dataLayer?: unknown[] }
}

let loaded = false

/** Loads the container once. The same thing the official snippet does, without an inline script (blocked by the CSP). */
export function loadTagManager(id: string = ID): boolean {
  if (loaded || !/^GTM-[A-Z0-9]+$/.test(id) || typeof document === 'undefined') return false
  loaded = true
  window.dataLayer = window.dataLayer || []
  // Google's consent mode, before the container: measuring visits was accepted, advertising never is
  gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`
  document.head.appendChild(s)
  return true
}

/** Google's own helper: the consent command must be pushed as an arguments object, not an array. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the parameters only type the call; gtag must push `arguments`
function gtag(..._args: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer!.push(arguments)
}

export function isTagManagerLoaded(): boolean {
  return loaded
}

/** For the tests. */
export function resetTagManagerForTests(): void {
  loaded = false
}

/**
 * Wires the rule into the router: load on the write screen; once loaded, leaving it is a full page load.
 * `reload` is injectable for the tests.
 */
export function installAnalytics(router: Router, id: string = ID, reload: (href: string) => void = hardNavigate): void {
  if (!id) return
  let leaving = false
  onConsentChange((choice) => {
    if (choice === 'granted') {
      if (router.currentRoute.value.name === SAFE_ROUTE) loadTagManager(id)
      return
    }
    clearAnalyticsCookies()
    if (loaded) reload(router.resolve(router.currentRoute.value).href) // refused after it loaded: a fresh page without the container
  })
  router.beforeEach((to, from) => {
    if (!loaded || leaving || from.name !== SAFE_ROUTE || to.name === SAFE_ROUTE) return true
    leaving = true
    reload(router.resolve(to).href)
    return false
  })
  router.afterEach((to) => {
    if (to.name === SAFE_ROUTE && consent.value === 'granted') loadTagManager(id)
  })
}

function hardNavigate(href: string): void {
  window.location.assign(new URL(href, window.location.href).toString())
  window.location.reload()
}
