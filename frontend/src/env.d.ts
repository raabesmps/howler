/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  /** 'mock' keeps everything in the browser (no backend). Anything else uses the real API. */
  readonly VITE_API?: string
  /** Where the API lives. Defaults to /api on the same origin (proxied in development and production). */
  readonly VITE_API_URL?: string
}
