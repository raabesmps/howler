import { defineConfig, devices } from '@playwright/test'

/*
 * End-to-end tests: a real browser against the real frontend, the real Laravel API and a real PostgreSQL.
 *
 * The backend is started by the caller (CI: `php artisan serve`; locally: `scripts/e2e-backend.sh`, which runs it in
 * Docker with the voice turned off and the rate limits raised). This config starts only the frontend and forwards /api
 * to the backend, so the browser, as in production, only ever talks to one origin.
 *
 * There is no OpenAI key in these runs, so howlers have no server voice and the browser's own voice reads them: that is
 * the fallback path, and it keeps the suite free and deterministic.
 */
const PORT = Number(process.env.E2E_PORT ?? 4173)
const API = process.env.E2E_API_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // one backend, one database, one IP: keep the order predictable
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Pixel 7'], // mobile first
  },
  webServer: {
    command: `npm run dev -- --host localhost --port ${PORT} --strictPort`,
    cwd: '../frontend',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_API_TARGET: API },
  },
})
