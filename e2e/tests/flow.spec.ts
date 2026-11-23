import { expect, test } from '@playwright/test'
import { createHowler, linkFor, openAndWatchItBurn } from './helpers'

test.describe('the whole journey', () => {
  test('write it, share the link, the other person opens it, it screams and burns', async ({ page, browser }) => {
    // the sender
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Seal it' })).toBeDisabled()
    await page.getByLabel(/recipient name/i).fill('Ron')
    await page.getByLabel(/your message/i).fill('I told you once, I told you twice. CLEAN. YOUR. ROOM!')
    await expect(page.getByText('53 / 140')).toBeVisible()
    await page.getByRole('button', { name: 'Seal it' }).click()

    const link = page.getByLabel('Your one-time link')
    await expect(link).toBeVisible({ timeout: 30_000 })
    const url = await link.inputValue()
    expect(url).toContain('#/h/')
    await expect(page.getByRole('heading', { name: /sealed/i })).toBeVisible()

    // the recipient: a different browser context, as another person on another device
    const other = await browser.newContext({ ...test.info().project.use })
    const recipient = await other.newPage()
    await recipient.goto(url)
    await expect(recipient.getByText('For Ron.')).toBeVisible()
    await expect(recipient.getByText(/loud sound/i)).toBeVisible()

    await openAndWatchItBurn(recipient)
    await expect(recipient.getByRole('heading', { name: /already been delivered/i })).toBeVisible()
    await other.close()
  })

  test('the link works once: a second visit, from anywhere, is refused', async ({ request, browser }) => {
    const token = await createHowler(request)

    const first = await browser.newContext({ ...test.info().project.use })
    const page = await first.newPage()
    await page.goto(linkFor(token))
    await openAndWatchItBurn(page)

    // the same device, after a reload
    await page.reload()
    await expect(page.getByRole('heading', { name: /already been delivered/i })).toBeVisible()

    // another device
    const second = await browser.newContext({ ...test.info().project.use })
    const again = await second.newPage()
    await again.goto(linkFor(token))
    await expect(again.getByRole('heading', { name: /already been delivered/i })).toBeVisible()
    await expect(again.getByRole('button', { name: /open the howler/i })).toHaveCount(0)

    await first.close()
    await second.close()
  })

  test('the API itself opens it exactly once', async ({ request }) => {
    const token = await createHowler(request, 'ONLY ONCE')

    const first = await request.post(`/api/howlers/${token}/open`)
    expect(first.status()).toBe(200)
    expect((await first.json()).message).toBe('ONLY ONCE')

    const second = await request.post(`/api/howlers/${token}/open`)
    expect(second.status()).toBe(410)
    expect(await second.text()).not.toContain('ONLY ONCE')
  })

  test('several people opening at the same instant: exactly one gets it', async ({ request }) => {
    const token = await createHowler(request, 'RACE')

    const results = await Promise.all(Array.from({ length: 6 }, () => request.post(`/api/howlers/${token}/open`)))

    const statuses = results.map((r) => r.status()).sort()
    expect(statuses).toEqual([200, 410, 410, 410, 410, 410])
  })

  test('looking at the link does not burn it (what a chat app preview does)', async ({ request, page }) => {
    const token = await createHowler(request)

    await request.get(`/api/howlers/${token}`)
    await page.goto(linkFor(token))
    await expect(page.getByRole('button', { name: /open the howler/i })).toBeVisible()
  })

  test('an unknown link says there is nothing there', async ({ page }) => {
    await page.goto(linkFor('not-a-real-token-at-all-0000000000000'))
    await expect(page.getByRole('heading', { name: /nothing here/i })).toBeVisible()
  })
})

test.describe('when things go wrong', () => {
  test('too many howlers: the person is told to slow down, and keeps what they wrote', async ({ page }) => {
    await page.route('**/api/howlers', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 429, headers: { 'Retry-After': '42', 'Content-Type': 'application/json' }, body: '{"message":"Too Many Attempts."}' })
        : route.continue(),
    )
    await page.goto('/')
    await page.getByLabel(/your message/i).fill('Still here')
    await page.getByRole('button', { name: 'Seal it' }).click()

    await expect(page.getByRole('alert')).toHaveText('Slow down. Try again in 42 seconds.')
    await expect(page.getByLabel(/your message/i)).toHaveValue('Still here')
    await expect(page.getByRole('button', { name: 'Seal it' })).toBeEnabled()
  })

  test('the server is unreachable while sealing', async ({ page }) => {
    await page.route('**/api/howlers', (route) => route.abort())
    await page.goto('/')
    await page.getByLabel(/your message/i).fill('Hello')
    await page.getByRole('button', { name: 'Seal it' }).click()
    await expect(page.getByRole('alert')).toContainText('reach the server')
  })

  test('the server is unreachable when the recipient arrives, and a retry works', async ({ page, request }) => {
    const token = await createHowler(request)
    let down = true
    await page.route('**/api/howlers/**', (route) => (down ? route.abort() : route.continue()))

    await page.goto(linkFor(token))
    await expect(page.getByRole('alert')).toContainText('reach the server')

    down = false
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('button', { name: /open the howler/i })).toBeVisible()
  })

  test('the connection drops when opening: the envelope stays closed and can be tried again', async ({ page, request }) => {
    const token = await createHowler(request)
    await page.goto(linkFor(token))
    await expect(page.getByRole('button', { name: /open the howler/i })).toBeVisible()

    let down = true
    await page.route('**/open', (route) => (down ? route.abort() : route.continue()))
    await page.getByRole('button', { name: /open the howler/i }).click({ force: true })
    await expect(page.getByRole('alert').filter({ hasText: 'reach the server' })).toBeVisible()
    await expect(page.locator('.scream')).toHaveCount(0)

    down = false
    await page.getByRole('button', { name: /open the howler/i }).click({ force: true })
    await expect(page.locator('.end')).toBeVisible({ timeout: 45_000 })
  })

  test('a howler can be reported', async ({ page, request }) => {
    const token = await createHowler(request)
    await page.goto(linkFor(token))
    await page.getByRole('button', { name: 'Report this' }).click()
    await expect(page.getByRole('button', { name: /reported/i })).toBeDisabled()
  })
})

test.describe('keyboard and reduced motion', () => {
  test('the whole opening works from the keyboard', async ({ page, request }) => {
    const token = await createHowler(request)
    await page.goto(linkFor(token))
    const seal = page.getByRole('button', { name: /open the howler/i })
    await seal.focus()
    await expect(seal).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('.scream')).toBeVisible({ timeout: 20_000 })
  })

  test.describe('prefers-reduced-motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('the words still arrive and it ends, without the fire', async ({ page, request }) => {
      const token = await createHowler(request, 'CALM DOWN')
      await page.goto(linkFor(token))
      await page.getByRole('button', { name: /open the howler/i }).click({ force: true })
      await expect(page.locator('.scream')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByRole('status').filter({ hasText: 'CALM DOWN' })).toHaveCount(1)
      await expect(page.locator('.end')).toBeVisible({ timeout: 30_000 })
      await expect(page.locator('.burning')).toHaveCount(0)
    })
  })
})
