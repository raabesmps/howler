import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { createHowler, linkFor } from './helpers'

/* Language and theme: the two buttons in the top right corner, what they change, and that the choice is remembered. */

async function audit(page: Page): Promise<void> {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))))
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
  expect(summary, summary.join('\n')).toEqual([])
}

test.describe('language', () => {
  test('starts in English, switches to Portuguese and is remembered', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Seal it' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await page.getByRole('button', { name: /PT: ver em português/ }).click()
    await expect(page.getByRole('button', { name: 'Selar' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')

    await page.reload()
    await expect(page.getByRole('button', { name: 'Selar' })).toBeVisible()
    await page.getByRole('button', { name: /EN: view in English/ }).click()
    await expect(page.getByRole('button', { name: 'Seal it' })).toBeVisible()
  })

  test('a Portuguese browser starts in Portuguese', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'pt-BR' })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Selar' })).toBeVisible()
    await context.close()
  })

  test('the whole flow works in Portuguese, and the message is never translated', async ({ page, request }) => {
    await page.addInitScript(() => localStorage.setItem('howler.lang', 'pt'))
    await page.goto('/')
    await page.getByLabel(/seu recado/i).fill('Arruma esse quarto!')
    await page.getByRole('button', { name: 'Selar' }).click()
    await expect(page.getByText('Selado. Funciona uma vez.')).toBeVisible({ timeout: 30_000 })
    await audit(page)

    const token = await createHowler(request)
    await page.goto(linkFor(token))
    await expect(page.getByText('Toque no selo.')).toBeVisible()
    await audit(page)
  })
})

test.describe('theme', () => {
  test('starts dark, switches to light and is remembered', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Use the light theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).toBe('rgb(243, 236, 223)')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('button', { name: 'Use the dark theme' })).toBeVisible()
  })

  test('every light-theme screen passes the accessibility audit', async ({ page, request }) => {
    await page.addInitScript(() => localStorage.setItem('howler.theme', 'light'))
    await page.goto('/')
    await page.getByLabel(/your message/i).fill('x'.repeat(130))
    await audit(page)

    await page.getByRole('button', { name: 'Seal it' }).click()
    await expect(page.getByLabel('Your one-time link')).toBeVisible({ timeout: 30_000 })
    await audit(page)

    const token = await createHowler(request)
    await page.goto(linkFor(token))
    await expect(page.getByRole('button', { name: /open the howler/i })).toBeVisible()
    await audit(page)

    await page.getByRole('button', { name: /open the howler/i }).click({ force: true })
    await expect(page.locator('.end')).toBeVisible({ timeout: 45_000 })
    await audit(page)
  })

  test('the scream stays dark in the light theme', async ({ page, request }) => {
    await page.addInitScript(() => localStorage.setItem('howler.theme', 'light'))
    const token = await createHowler(request)
    await page.goto(linkFor(token))
    await page.getByRole('button', { name: /open the howler/i }).click({ force: true })
    await expect(page.locator('.scream')).toBeVisible({ timeout: 20_000 })
    const bg = await page.locator('.scream').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(14, 9, 7)')
  })
})
