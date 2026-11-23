/*
 * The voice arrives with the opened howler (the backend made it when the howler was created, see backend/app/Services/
 * VoiceGenerator.php), so nothing secret is in the browser. Here the raw audio is decoded, then cleaned and made loud
 * by treatVoice. When there is no audio or it cannot be decoded, the caller falls back to the plain browser voice, so a
 * message is never lost.
 */
import { decodeAudio, treatVoice } from './engine'

export async function prepareVoice(wav: ArrayBuffer | null): Promise<AudioBuffer | null> {
  if (!wav || wav.byteLength === 0) return null
  try {
    return treatVoice(await decodeAudio(wav))
  } catch {
    return null
  }
}
