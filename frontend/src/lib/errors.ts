import { NetworkError, RateLimitError, ServerError, ValidationError } from '../api/types'

/** Plain words for what went wrong, written for the person using the app (never a status code or a stack). */
export function describeError(e: unknown): string {
  if (e instanceof RateLimitError) {
    const s = e.retryAfterSeconds
    if (s === null) return 'Slow down. Too many howlers for now. Try again in a bit.'
    if (s > 3600) return "You've sent a lot of howlers today. Try again tomorrow."
    if (s > 90) return `Slow down. Try again in about ${Math.ceil(s / 60)} minutes.`
    return `Slow down. Try again in ${s} second${s === 1 ? '' : 's'}.`
  }
  if (e instanceof NetworkError) return "Can't reach the server. Check your connection and try again."
  if (e instanceof ValidationError) return e.message
  if (e instanceof ServerError) return 'Something broke on our side. Try again in a moment.'
  return 'Something went wrong. Try again.'
}
