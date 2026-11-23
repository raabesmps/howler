/*
 * Asks the server for the howler's voice. The server (server/voice.ts in the prototype, the backend in the product)
 * calls the audio model with the key, so nothing secret is in the browser. The returned audio is then cleaned and made
 * loud by treatVoice. When it fails, the caller falls back to the plain browser voice, so a message is never lost.
 */
import { decodeAudio, treatVoice } from './engine'

export async function fetchVoice(text: string): Promise<AudioBuffer> {
  const res = await fetch('/api/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`voice request failed (${res.status})`)
  return treatVoice(await decodeAudio(await res.arrayBuffer()))
}
