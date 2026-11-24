/*
 * Error monitoring (Sentry), off unless the build was given a DSN (VITE_SENTRY_DSN). With no DSN nothing is loaded:
 * the Sentry code is a separate chunk that is only fetched when it is going to be used.
 *
 * Privacy first (ADR-005). This product has two secrets and both live where an error tool likes to look:
 *  - the link token, which is in the page address (after the #): the URL, the referrer and the router's own
 *    navigation records would all carry it;
 *  - the message, which is on screen, in the component props and in what the person typed.
 * So the report is cut down to the error, its stack trace and the release. No breadcrumbs (they record clicks, console
 * output and navigation), no component props, no user, no cookies, and every address is stripped of its fragment, its
 * query and anything shaped like a token.
 */
import type { App } from 'vue'

/** A token is 16 random bytes as URL-safe base64: 22 characters (links made before v1.1.0 have 43). */
const TOKEN_SHAPE = /(?<![A-Za-z0-9_-])(?:[A-Za-z0-9_-]{43}|[A-Za-z0-9_-]{22})(?![A-Za-z0-9_-])/g
export const TOKEN = '[token]'

/** An address with the fragment and the query removed and any token blanked. */
export function scrubUrl(url: string): string {
  return scrubText(url.replace(/[?#].*$/, ''))
}

export function scrubText(text: string): string {
  return text.replace(/\/h\/[^/?#\s]+/g, `/h/${TOKEN}`).replace(TOKEN_SHAPE, TOKEN)
}

interface ReportLike {
  request?: { url?: string; headers?: Record<string, string>; cookies?: unknown; query_string?: unknown; data?: unknown }
  user?: unknown
  breadcrumbs?: unknown
  extra?: unknown
  transaction?: string
  message?: string
  exception?: { values?: { value?: string }[] }
}

/** Cuts a report down to what finds the bug. It never drops the report. */
export function scrubReport<T extends ReportLike>(event: T): T {
  if (event.request) {
    event.request = event.request.url ? { url: scrubUrl(event.request.url) } : {}
  }
  delete event.user
  delete event.breadcrumbs
  delete event.extra
  if (event.transaction) event.transaction = scrubText(event.transaction)
  if (event.message) event.message = scrubText(event.message)
  for (const v of event.exception?.values ?? []) {
    if (v.value) v.value = scrubText(v.value)
  }
  return event
}

/** Starts monitoring when there is a DSN. Resolves to whether it started. Never throws: monitoring must not break the app. */
export async function initMonitoring(app: App, dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN): Promise<boolean> {
  if (!dsn) return false
  try {
    const Sentry = await import('@sentry/vue')
    Sentry.init({
      dsn,
      app,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_RELEASE || undefined,
      // collect nothing about the person or their requests: no user info, cookies, headers, bodies or query strings
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
      tracesSampleRate: 0,
      // Only what is needed for errors. The default set also records breadcrumbs, sessions and the address of the page.
      defaultIntegrations: false,
      integrations: [
        Sentry.globalHandlersIntegration(),
        Sentry.browserApiErrorsIntegration(),
        Sentry.linkedErrorsIntegration(),
        Sentry.dedupeIntegration(),
        Sentry.functionToStringIntegration(),
        // component props would carry the message
        Sentry.vueIntegration({ app, attachProps: false, attachErrorHandler: true }),
      ],
      beforeBreadcrumb: () => null,
      beforeSend: (event) => scrubReport(event),
    })
    return true
  } catch {
    return false
  }
}
