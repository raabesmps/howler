import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// The browser only ever calls its own origin. In development (and in `vite preview`) /api is forwarded to the Laravel
// backend, so there is no CORS and the OpenAI key (which only the backend has) never comes near the browser.
const api = { '/api': { target: process.env.VITE_API_TARGET ?? 'http://localhost:8000', changeOrigin: false } }

export default defineConfig({
  base: './', // relative paths: the build works from any folder
  plugins: [vue()],
  server: { host: true, port: 5173, proxy: api },
  preview: { proxy: api },
  build: { target: 'es2022' },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
})
