export const MAX_MESSAGE = 140
export const MAX_NAME = 40
export const EXPIRY_DAYS = 7

import type { Lang } from '../lib/text'

export type HowlerStatus = 'sealed' | 'burned' | 'expired' | 'notfound'

export interface NewHowler {
  message: string
  recipient: string
}

export interface HowlerPreview {
  recipient: string
  voiceLang: Lang
}

export interface HowlerContent {
  message: string
  recipient: string
}

/** The contract the app talks to. The prototype implements it in the browser; CP8 swaps in the real HTTP client. */
export interface HowlerApi {
  create(input: NewHowler): Promise<{ token: string; expiresAt: number }>
  /** Reports the state only. Must never reveal the content. */
  status(token: string): Promise<HowlerStatus>
  /**
   * What the closed envelope may show: the name it is addressed to (not secret) and, for the prototype only, which
   * language the voice will need so the right model can be warmed up before the tap. Never the message.
   * In the real API the audio is made on the server when the howler is created.
   */
  preview(token: string): Promise<HowlerPreview>
  /** Returns the content exactly once, then the howler is burned. Throws GoneError afterwards. */
  open(token: string): Promise<HowlerContent>
}

/** Thrown by open() when the howler is not sealed any more (HTTP 410 in the real API). */
export class GoneError extends Error {
  constructor(public readonly reason: Exclude<HowlerStatus, 'sealed'>) {
    super(`howler is ${reason}`)
    this.name = 'GoneError'
  }
}
