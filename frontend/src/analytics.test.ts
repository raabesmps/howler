import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { installAnalytics, isTagManagerLoaded, loadTagManager, resetTagManagerForTests } from './analytics'
import { choose, consent, resetConsentForTests } from './consent'

const Blank = { template: '<div />' }
const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'compose', component: Blank },
      { path: '/sent/:token', name: 'sent', component: Blank },
      { path: '/h/:token', name: 'open', component: Blank },
    ],
  })
const gtmScripts = () => document.querySelectorAll('script[src*="googletagmanager.com/gtm.js"]')

beforeEach(() => {
  localStorage.clear()
  resetConsentForTests()
  resetTagManagerForTests()
  document.head.innerHTML = ''
  delete window.dataLayer
})
afterEach(() => vi.restoreAllMocks())

describe('loadTagManager', () => {
  it('adds the container once, after the consent-mode defaults, with no inline script', () => {
    expect(loadTagManager('GTM-TEST123')).toBe(true)
    expect(loadTagManager('GTM-TEST123')).toBe(false)
    expect(gtmScripts()).toHaveLength(1)
    expect((gtmScripts()[0] as HTMLScriptElement).src).toBe('https://www.googletagmanager.com/gtm.js?id=GTM-TEST123')
    const [consentCmd, start] = window.dataLayer as unknown[]
    expect(Array.from(consentCmd as ArrayLike<unknown>)).toEqual([
      'consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' },
    ])
    expect(start).toMatchObject({ event: 'gtm.js' })
    expect(document.querySelectorAll('script:not([src])')).toHaveLength(0)
  })

  it('loads nothing without a valid id', () => {
    expect(loadTagManager('')).toBe(false)
    expect(loadTagManager('UA-1234')).toBe(false)
    expect(gtmScripts()).toHaveLength(0)
  })
})

describe('installAnalytics', () => {
  it('does nothing at all without an id', async () => {
    choose('granted')
    const router = makeRouter()
    installAnalytics(router, '')
    await router.push('/')
    expect(isTagManagerLoaded()).toBe(false)
  })

  it('loads nothing before the visitor chooses, nor after a refusal', async () => {
    const router = makeRouter()
    installAnalytics(router, 'GTM-TEST123', vi.fn())
    await router.push('/')
    expect(consent.value).toBeNull()
    expect(isTagManagerLoaded()).toBe(false)
    choose('denied')
    await router.push('/sent/x')
    await router.push('/')
    expect(isTagManagerLoaded()).toBe(false)
    expect(gtmScripts()).toHaveLength(0)
  })

  it('loads the moment the visitor accepts on the write screen', async () => {
    const router = makeRouter()
    installAnalytics(router, 'GTM-TEST123', vi.fn())
    await router.push('/')
    choose('granted')
    expect(isTagManagerLoaded()).toBe(true)
  })

  it('never loads on a screen that has a token in the address, even with consent', async () => {
    choose('granted')
    const router = makeRouter()
    installAnalytics(router, 'GTM-TEST123', vi.fn())
    await router.push('/h/abc')
    await router.push('/sent/abc')
    expect(isTagManagerLoaded()).toBe(false)
  })

  it('leaving the write screen after it loaded is a full page load instead of an in-app navigation', async () => {
    choose('granted')
    const router = makeRouter()
    const reload = vi.fn()
    installAnalytics(router, 'GTM-TEST123', reload)
    await router.push('/')
    expect(isTagManagerLoaded()).toBe(true)

    await router.push({ name: 'sent', params: { token: 'secret-token' }, query: { to: 'Sam' } })
    expect(reload).toHaveBeenCalledWith('/sent/secret-token?to=Sam')
    expect(router.currentRoute.value.name).toBe('compose')
  })

  it('refusing after it loaded deletes the Analytics cookies and reloads the page', async () => {
    choose('granted')
    const router = makeRouter()
    const reload = vi.fn()
    installAnalytics(router, 'GTM-TEST123', reload)
    await router.push('/')
    document.cookie = '_ga=GA1.1.123; path=/'
    document.cookie = '_ga_ABC=GS1.1.456; path=/'
    document.cookie = 'other=keep; path=/'

    choose('denied')
    expect(document.cookie).not.toContain('_ga')
    expect(document.cookie).toContain('other=keep')
    expect(reload).toHaveBeenCalledWith('/')
  })
})

describe('the stored choice', () => {
  it('is remembered with its version, and not in a cookie', () => {
    choose('denied')
    expect(JSON.parse(localStorage.getItem('howler.consent')!)).toMatchObject({ v: 1, choice: 'denied' })
    expect(document.cookie).not.toContain('consent')
    resetConsentForTests()
    expect(consent.value).toBe('denied')
  })

  it('asks again when what is collected changes (an older version is ignored)', () => {
    localStorage.setItem('howler.consent', JSON.stringify({ v: 0, choice: 'granted', at: '2026-01-01' }))
    resetConsentForTests()
    expect(consent.value).toBeNull()
  })
})
