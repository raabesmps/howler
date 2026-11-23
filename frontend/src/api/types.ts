export const MAX_MESSAGE = 140
export const MAX_NAME = 40
export const EXPIRY_DAYS = 7

export type HowlerStatus = 'sealed' | 'burned' | 'expired' | 'notfound'

export interface NewHowler {
  message: string
  recipient: string
}

export interface HowlerPreview {
  recipient: string
}

export interface HowlerContent {
  message: string
  recipient: string
  /** The voice (WAV bytes) made by the server when the howler was created, or null: then the browser reads it itself. */
  audio: ArrayBuffer | null
}

export type ReportReason = 'abuse' | 'harassment' | 'threat' | 'spam' | 'other'

/** The contract the app talks to. The real implementation is the HTTP client (http.ts); the mock (mock.ts) works without a server. */
export interface HowlerApi {
  create(input: NewHowler): Promise<{ token: string; expiresAt: number; voice: boolean }>
  /** Reports the state only. Must never reveal the content. */
  status(token: string): Promise<HowlerStatus>
  /** What the closed envelope may show: the name it is addressed to (not secret). Never the message. */
  preview(token: string): Promise<HowlerPreview>
  /** Returns the content exactly once, then the howler is burned. Throws GoneError afterwards. */
  open(token: string): Promise<HowlerContent>
  /** Reports a howler as abusive. Works in any state. */
  report(token: string, reason: ReportReason): Promise<void>
}

/** Thrown by open() when the howler is not sealed any more (HTTP 410 in the real API). */
export class GoneError extends Error {
  constructor(public readonly reason: Exclude<HowlerStatus, 'sealed'>) {
    super(`howler is ${reason}`)
    this.name = 'GoneError'
  }
}

/** The server said slow down (HTTP 429). */
export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number | null) {
    super('too many requests')
    this.name = 'RateLimitError'
  }
}

/** The server could not be reached at all: offline, DNS, the server is down. */
export class NetworkError extends Error {
  constructor() {
    super('could not reach the server')
    this.name = 'NetworkError'
  }
}

/** The server answered with something unexpected (HTTP 5xx or a malformed body). */
export class ServerError extends Error {
  constructor(public readonly status: number) {
    super(`the server failed (${status})`)
    this.name = 'ServerError'
  }
}

/** The server refused the input (HTTP 422). The text is meant to be shown to the person. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
