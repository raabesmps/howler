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
  /** Public Sentry DSN for the page. Empty means error monitoring is off. */
  readonly VITE_SENTRY_DSN?: string
  /** The commit this build came from, so an error points at the code. */
  readonly VITE_RELEASE?: string
  /** Google Tag Manager container id (GTM-XXXX). Empty means no analytics. Loaded on the write screen only. */
  readonly VITE_GTM_ID?: string
  /** The public site URL for the link-preview tags. */
  readonly VITE_SITE_URL?: string
}
