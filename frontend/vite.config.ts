import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { voiceProxy } from './server/voice'

export default defineConfig(({ mode }) => {
  // The OpenAI key lives in ../.env.local (git-ignored). It is read here, on the server side, and never reaches the browser.
  const env = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), '')
  return {
    base: './', // relative paths: the build works from any folder
    plugins: [vue(), voiceProxy(env)],
    server: { host: true, port: 5173 },
    build: { target: 'es2022' },
    test: { environment: 'jsdom', include: ['src/**/*.test.ts', 'server/**/*.test.ts'] },
  }
})
