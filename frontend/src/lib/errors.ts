import { NetworkError, RateLimitError, ServerError, ValidationError } from '../api/types'
import { lang, t } from '../i18n'

/** Plain words for what went wrong, written for the person using the app (never a status code or a stack). */
export function describeError(e: unknown): string {
  if (e instanceof RateLimitError) {
    const s = e.retryAfterSeconds
    if (s === null) return t('errSlowDown')
    if (s > 3600) return t('errTomorrow')
    if (s > 90) return t('errMinutes', { n: Math.ceil(s / 60) })
    return t(s === 1 ? 'errSecond' : 'errSeconds', { n: s })
  }
  if (e instanceof NetworkError) return t('errNetwork')
  // the server's own words are in English: in another language, say it in ours
  if (e instanceof ValidationError) return lang.value === 'en' ? e.message : t('errInvalid')
  if (e instanceof ServerError) return t('errServer')
  return t('errGeneric')
}
