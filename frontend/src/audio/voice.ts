/*
 * Text to speech for the prototype, run in the browser with Piper models (WebAssembly, MIT licence).
 * It is a stand-in so that the whole flow can be tried without a backend. In the product the voice file is made on the
 * server by a neural TTS service when the howler is created (ADR-002), and this module is replaced by a plain download.
 *
 * Known gaps of the stand-in: the first visit downloads a model of about 60 MB (cached after that), it comes from
 * third-party CDNs, and a Piper voice reads calmly: the anger is added by the treatment in engine.ts.
 */
import { decodeAudio } from './engine'
import { splitClauses, type Lang } from '../lib/text'

export type VoiceId = 'en_GB-jenny_dioco-medium' | 'en_GB-cori-medium' | 'en_GB-alba-medium' | 'en_GB-southern_english_female-low' | 'pt_BR-faber-medium'

/** One fixed voice per language, decided by the product. English: a British woman. */
export const VOICES: Record<Lang, VoiceId> = {
  en: 'en_GB-jenny_dioco-medium',
  pt: 'pt_BR-faber-medium',
}

/** For tuning the tone together: add ?voice=cori (or alba, southern, jenny) to a link to hear another British voice. */
const ALIASES: Record<string, VoiceId> = {
  jenny: 'en_GB-jenny_dioco-medium',
  cori: 'en_GB-cori-medium',
  alba: 'en_GB-alba-medium',
  southern: 'en_GB-southern_english_female-low',
}

export function voiceFor(lang: Lang): VoiceId {
  if (lang === 'en') {
    const wanted = new URLSearchParams(location.hash.split('?')[1] ?? '').get('voice')
    const alias = wanted ? ALIASES[wanted] : undefined
    if (alias) return alias
  }
  return VOICES[lang]
}

export interface Progress { loaded: number; total: number }

type Tts = typeof import('@diffusionstudio/vits-web')
let ttsPromise: Promise<Tts> | null = null
const loadTts = (): Promise<Tts> => (ttsPromise ??= import('@diffusionstudio/vits-web'))

/** Downloads the model (a no-op when it is already stored in the browser). */
export async function prepareVoice(lang: Lang, onProgress?: (p: Progress) => void): Promise<void> {
  const tts = await loadTts()
  const id = voiceFor(lang)
  if ((await tts.stored()).includes(id)) return
  const parts = new Map<string, Progress>()
  await tts.download(id, (p) => {
    parts.set(p.url, { loaded: p.loaded, total: p.total })
    let loaded = 0
    let total = 0
    parts.forEach((v) => { loaded += v.loaded; total += v.total })
    onProgress?.({ loaded, total })
  })
}

/** Different voices come out at very different levels: bring every piece to the same peak before the treatment. */
export function normalize(buf: AudioBuffer, target = 0.9): AudioBuffer {
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c)
    let peak = 0
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]!))
    if (peak > 0.001) { const k = target / peak; for (let i = 0; i < d.length; i++) d[i]! *= k }
  }
  return buf
}

/** Speaks the message in a few pieces (see splitClauses) so the engine can build the fury up. */
export async function synthesize(text: string, lang: Lang): Promise<AudioBuffer[]> {
  const tts = await loadTts()
  const out: AudioBuffer[] = []
  for (const piece of splitClauses(text)) {
    const wav = await tts.predict({ text: piece, voiceId: voiceFor(lang) })
    out.push(normalize(await decodeAudio(await wav.arrayBuffer())))
  }
  return out
}
