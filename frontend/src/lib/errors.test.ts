import { describe, expect, it } from 'vitest'
import { NetworkError, RateLimitError, ServerError, ValidationError } from '../api/types'
import { describeError } from './errors'

describe('describeError', () => {
  it('explains the rate limit in seconds, minutes or "tomorrow"', () => {
    expect(describeError(new RateLimitError(1))).toBe('Slow down. Try again in 1 second.')
    expect(describeError(new RateLimitError(42))).toBe('Slow down. Try again in 42 seconds.')
    expect(describeError(new RateLimitError(600))).toBe('Slow down. Try again in about 10 minutes.')
    expect(describeError(new RateLimitError(40000))).toContain('tomorrow')
    expect(describeError(new RateLimitError(null))).toContain('Slow down')
  })

  it('explains a network failure, a server failure and a refusal', () => {
    expect(describeError(new NetworkError())).toContain("Can't reach the server")
    expect(describeError(new ServerError(500))).toContain('our side')
    expect(describeError(new ValidationError('The message field is required.'))).toBe('The message field is required.')
  })

  it('has a kind fallback and never leaks internals', () => {
    expect(describeError(new Error('SQLSTATE[23514] secret'))).toBe('Something went wrong. Try again.')
    expect(describeError('boom')).toBe('Something went wrong. Try again.')
  })
})
