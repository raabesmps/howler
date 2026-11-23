import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './', // relative paths: the build works from any folder, such as a GitHub Pages project site
  plugins: [vue()],
  server: { host: true, port: 5173 },
  build: { target: 'es2022' },
  worker: { format: 'es' },
  // vits-web ships its own worker and wasm loaders: let it be, do not pre-bundle it
  optimizeDeps: { exclude: ['@diffusionstudio/vits-web'] },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
})
