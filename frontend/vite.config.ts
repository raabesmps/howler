import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

// The browser only ever calls its own origin. In development (and in `vite preview`) /api is forwarded to the Laravel
// backend, so there is no CORS and the OpenAI key (which only the backend has) never comes near the browser.
const api = { '/api': { target: process.env.VITE_API_TARGET ?? 'http://localhost:8000', changeOrigin: false } }

/** Link-preview tags need absolute URLs. Fill them from VITE_SITE_URL (for example https://howler.example.com), or drop them. */
export function withSiteUrl(html: string, site: string | undefined): string {
  const base = site?.replace(/\/$/, '')
  if (base) return html.replaceAll('__SITE_URL__', base)
  return html
    .split('\n')
    .filter((line) => !line.includes('__SITE_URL__'))
    .join('\n')
}

function siteUrl(site: string | undefined): Plugin {
  return { name: 'howler-site-url', transformIndexHtml: (html) => withSiteUrl(html, site) }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_')
  return {
    base: './', // relative paths: the build works from any folder
    plugins: [vue(), siteUrl(env.VITE_SITE_URL)],
    server: { host: true, port: 5173, proxy: api },
    preview: { proxy: api },
    build: { target: 'es2022' },
    test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
  }
})
