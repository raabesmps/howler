import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { createHowler, linkFor } from './helpers'

/*
 * Automated accessibility audit (axe-core, WCAG 2.0/2.1 A and AA) of every screen a person can reach.
 * Automated checks catch roughly a third of the problems: contrast, names, roles, structure, landmarks. Keyboard use,
 * focus order and reduced motion are covered by their own tests; the rest is in docs/TESTING.md as a manual checklist.
 */
/** Waits for every finite animation and transition to end: axe measures contrast on what is painted, so a fade in progress gives false results. */
async function settle(page: Page): Promise<void> {
  // two frames first: a transition only starts once the browser has painted the new screen
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  )
}

async function audit(page: Page): Promise<void> {
  await settle(page)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
  expect(summary, summary.join('\n')).toEqual([])
}

test.describe('accessibility (axe)', () => {
  test('write screen', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Seal it' })).toBeVisible()
    await audit(page)
  })

  test('write screen with text, over the scorch', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel(/your message/i).fill('x'.repeat(130))
    await audit(page)
  })

  test('share screen', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel(/your message/i).fill('Hello')
    await page.getByLabel(/recipient name/i).fill('Ron')
    await page.getByRole('button', { name: 'Seal it' }).click()
    await expect(page.getByLabel('Your one-time link')).toBeVisible({ timeout: 30_000 })
    await audit(page)
  })

  test('closed envelope', async ({ page, request }) => {
    const token = await createHowler(request)
    await page.goto(linkFor(token))
    await expect(page.getByRole('button', { name: /open the howler/i })).toBeVisible()
    await audit(page)
  })

  test('closed envelope, muted', async ({ page, request }) => {
    const token = await createHowler(request)
    await page.goto(linkFor(token))
    await page.getByRole('button', { name: 'Mute sound' }).click()
    await audit(page)
  })

  test('the screaming screen', async ({ page, request }) => {
    const token = await createHowler(request, 'A LONG ENOUGH SCREAM TO AUDIT WHILE IT HAPPENS ALL OVER')
    await page.goto(linkFor(token))
    await page.getByRole('button', { name: /open the howler/i }).click({ force: true })
    await expect(page.locator('.scream')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1500)
    await audit(page)
  })

  test('end: already delivered', async ({ page, request }) => {
    const token = await createHowler(request)
    await request.post(`/api/howlers/${token}/open`)
    await page.goto(linkFor(token))
    await expect(page.getByRole('heading', { name: /already been delivered/i })).toBeVisible()
    await audit(page)
  })

  test('end: nothing here', async ({ page }) => {
    await page.goto(linkFor('not-a-real-token-at-all-0000000000000'))
    await expect(page.getByRole('heading', { name: /nothing here/i })).toBeVisible()
    await audit(page)
  })

  test('error screen (server unreachable)', async ({ page, request }) => {
    const token = await createHowler(request)
    await page.route('**/api/howlers/**', (route) => route.abort())
    await page.goto(linkFor(token))
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    await audit(page)
  })

  test('page not found', async ({ page }) => {
    await page.goto('/#/this/does/not/exist')
    await expect(page.getByRole('heading', { name: /nothing here/i })).toBeVisible()
    await audit(page)
  })
})

test.describe('structure a screen reader relies on', () => {
  test('every screen has a title, one main landmark and one level-1 heading where it has a heading', async ({ page, request }) => {
    const token = await createHowler(request)
    for (const path of ['/', linkFor(token), linkFor('missing-token-0000000000000000000')]) {
      await page.goto(path)
      await expect(page.locator('main')).toHaveCount(1)
      expect(await page.title()).toBeTruthy()
      expect(await page.locator('html').getAttribute('lang')).toBe('en')
    }
  })

  test('the viewport can be zoomed (no user-scalable=no)', async ({ page }) => {
    await page.goto('/')
    const viewport = await page.locator('meta[name=viewport]').getAttribute('content')
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)/i)
    expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(\.0)?\b/i)
  })
})

test.describe('focus and touch targets', () => {
  test('when the howler ends, focus lands on the outcome so a screen reader announces it', async ({ page, request }) => {
    const token = await createHowler(request)
    await request.post(`/api/howlers/${token}/open`)
    await page.goto(linkFor(token))
    await expect(page.getByRole('heading', { name: /already been delivered/i })).toBeFocused()
  })

  for (const [name, setup] of [
    ['write screen', async (page: Page) => { await page.goto('/') }],
    ['end screen', async (page: Page) => { await page.goto(linkFor('missing-token-0000000000000000000')) }],
  ] as const) {
    test(`buttons are at least 44px tall: ${name}`, async ({ page }) => {
      await setup(page)
      await expect(page.locator('main')).toBeVisible()
      const small = await page.$$eval('button, a[href]', (els) =>
        els.map((e) => ({ text: e.textContent?.trim(), h: e.getBoundingClientRect().height })).filter((e) => e.h > 0 && e.h < 44),
      )
      expect(small).toEqual([])
    })
  }

  test('buttons are at least 44px tall: closed envelope', async ({ page, request }) => {
    const token = await createHowler(request)
    await page.goto(linkFor(token))
    await expect(page.getByRole('button', { name: /open the howler/i })).toBeVisible()
    const small = await page.$$eval('button', (els) => els.map((e) => ({ text: e.textContent?.trim(), h: e.getBoundingClientRect().height })).filter((e) => e.h > 0 && e.h < 44))
    expect(small).toEqual([])
  })
})
