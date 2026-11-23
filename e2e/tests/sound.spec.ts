import { expect, test } from '@playwright/test'
import { createHowler, linkFor } from './helpers'

test.describe('loud sound: the warning and the mute control', () => {
  test('the recipient is warned and can mute before anything plays', async ({ page, request }) => {
    const token = await createHowler(request)
    await page.goto(linkFor(token))

    await expect(page.getByText('Loud sound.')).toBeVisible()
    const toggle = page.getByRole('button', { name: 'Mute sound' })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(toggle).toContainText('Sound off')
  })

  test('muted stays muted when the envelope screams, even with the browser voice', async ({ page, request }) => {
    // record what the browser voice is asked to do (the server voice is off in these runs)
    await page.addInitScript(() => {
      ;(window as unknown as { __spoken: number[] }).__spoken = []
      const original = window.speechSynthesis?.speak?.bind(window.speechSynthesis)
      if (window.speechSynthesis) {
        window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
          ;(window as unknown as { __spoken: number[] }).__spoken.push(u.volume)
          original?.(u)
        }
      }
    })
    const token = await createHowler(request, 'QUIET PLEASE')
    await page.goto(linkFor(token))
    await page.getByRole('button', { name: 'Mute sound' }).click()
    await page.getByRole('button', { name: /open the howler/i }).click({ force: true })

    await expect(page.locator('.scream')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute('aria-pressed', 'true')
    // the voice starts a moment after the screen appears (the letter rises first)
    const spoken = (): Promise<number[]> => page.evaluate(() => (window as unknown as { __spoken: number[] }).__spoken)
    await expect.poll(async () => (await spoken()).length, { timeout: 10_000 }).toBeGreaterThan(0)
    expect((await spoken()).every((v) => v === 0)).toBe(true)
  })

  test('the choice is remembered for the next howler on this device', async ({ page, request }) => {
    const first = await createHowler(request)
    await page.goto(linkFor(first))
    await page.getByRole('button', { name: 'Mute sound' }).click()

    const second = await createHowler(request)
    await page.goto(linkFor(second))
    await page.reload()
    await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('the mute control is also there while it screams, to stop it midway', async ({ page, request }) => {
    const token = await createHowler(request, 'LOUD LOUD LOUD LOUD LOUD LOUD')
    await page.goto(linkFor(token))
    await page.getByRole('button', { name: /open the howler/i }).click({ force: true })
    await expect(page.locator('.scream')).toBeVisible({ timeout: 20_000 })

    const toggle = page.getByRole('button', { name: 'Mute sound' })
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })
})
