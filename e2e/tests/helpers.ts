import { expect, type APIRequestContext, type Page } from '@playwright/test'

/** Creates a howler straight through the API (fast, and does not use the screens that other tests cover). */
export async function createHowler(request: APIRequestContext, message = 'CLEAN. YOUR. ROOM!', recipient: string | null = 'Ron'): Promise<string> {
  const res = await request.post('/api/howlers', { data: { message, recipient_name: recipient } })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()).token as string
}

export const linkFor = (token: string): string => `/#/h/${token}`

/** Taps the seal and waits until the howler is burned and the end screen shows. */
export async function openAndWatchItBurn(page: Page): Promise<void> {
  await page.getByRole('button', { name: /open the howler/i }).click({ force: true })
  await expect(page.locator('.scream')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.end')).toBeVisible({ timeout: 45_000 })
}
