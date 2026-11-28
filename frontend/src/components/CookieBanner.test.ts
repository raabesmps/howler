import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

const Blank = { template: '<div />' }

/** The banner reads the GTM id when its module loads, so each test imports a fresh copy with the id set. */
async function setup(path = '/') {
  vi.resetModules()
  vi.stubEnv('VITE_GTM_ID', 'GTM-TEST123')
  const { default: CookieBanner } = await import('./CookieBanner.vue')
  const consentModule = await import('../consent')
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'compose', component: Blank },
      { path: '/h/:token', name: 'open', component: Blank },
    ],
  })
  await router.push(path)
  const wrapper = mount(CookieBanner, { global: { plugins: [router] } })
  return { wrapper, ...consentModule }
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllEnvs())

describe('the cookie notice', () => {
  it('shows on the write screen until a choice, with refuse and accept side by side', async () => {
    const { wrapper } = await setup()
    expect(wrapper.find('[role="region"]').exists()).toBe(true)
    const buttons = wrapper.findAll('.actions button')
    expect(buttons.map((b) => b.text())).toEqual(['Refuse', 'Accept'])
    expect(buttons.every((b) => b.classes('choice'))).toBe(true) // the same size and weight
  })

  it('never shows on a screen with a token, unless reopened', async () => {
    const { wrapper, reopenConsent } = await setup('/h/abc')
    expect(wrapper.find('[role="region"]').exists()).toBe(false)
    reopenConsent()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="region"]').exists()).toBe(true)
  })

  it('refusing stores the choice and closes it', async () => {
    const { wrapper, consent } = await setup()
    await wrapper.findAll('.actions button')[0].trigger('click')
    expect(consent.value).toBe('denied')
    expect(wrapper.find('[role="region"]').exists()).toBe(false)
  })

  it('explains who, what, who receives it, for how long and the legal basis', async () => {
    const { wrapper } = await setup()
    await wrapper.find('.more').trigger('click')
    const text = wrapper.find('#cookie-details').text()
    for (const piece of ['Raabe', 'Google', '_ga', '2 years', 'LGPD']) expect(text).toContain(piece)
  })
})
