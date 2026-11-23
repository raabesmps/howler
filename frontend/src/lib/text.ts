/** Small text helpers: language guess, clause splitting for the voice, and word timing for the highlight. */

export type Lang = 'en' | 'pt'

const PT_WORDS = new Set([
  'que', 'não', 'nao', 'você', 'voce', 'vc', 'nunca', 'eu', 'meu', 'minha', 'meus', 'minhas', 'para', 'pra', 'com', 'está', 'esta',
  'uma', 'um', 'os', 'as', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'mas', 'por', 'quando', 'ainda', 'sempre', 'ligações', 'atende',
  'tá', 'ta', 'foi', 'fez', 'quero', 'porque', 'seu', 'sua', 'ele', 'ela', 'isso', 'esse', 'essa', 'muito', 'tudo', 'nada', 'mãe', 'casa',
])

/** Very small heuristic, enough to choose a voice for the prototype. */
export function detectLang(text: string): Lang {
  if (/[ãõçáéíóúâêô]/i.test(text)) return 'pt'
  const words = text.toLowerCase().match(/[a-zà-ú]+/g) ?? []
  const hits = words.filter((w) => PT_WORDS.has(w)).length
  return hits >= 2 || (words.length > 0 && hits / words.length >= 0.3) ? 'pt' : 'en'
}

/**
 * Splits a message into at most `max` spoken pieces at sentence and clause boundaries, so the voice can build up
 * (each piece louder and faster than the one before). Tiny pieces are merged into their neighbour.
 */
export function splitClauses(text: string, max = 4): string[] {
  const parts = (text.trim().match(/[^.!?;:,—…]+[.!?;:,—…]*/g) ?? [text.trim()]).map((p) => p.trim()).filter(Boolean)
  const merged: string[] = []
  for (const p of parts) {
    const last = merged[merged.length - 1]
    if (last !== undefined && (last.length < 14 || p.length < 8)) merged[merged.length - 1] = `${last} ${p}`
    else merged.push(p)
  }
  while (merged.length > max) {
    let at = 0
    let best = Infinity
    for (let i = 0; i < merged.length - 1; i++) {
      const len = merged[i]!.length + merged[i + 1]!.length
      if (len < best) { best = len; at = i }
    }
    merged.splice(at, 2, `${merged[at]} ${merged[at + 1]}`)
  }
  return merged.length ? merged : [text.trim()]
}

export function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean)
}

/** Start time (seconds) of each word, spreading `duration` by word length and punctuation pauses. */
export function wordTimings(words: string[], duration: number): number[] {
  const weights = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1 + (/[,;:]$/.test(w) ? 2 : 0) + (/[.!?…]$/.test(w) ? 4 : 0))
  const total = weights.reduce((a, b) => a + b, 0) || 1
  const starts: number[] = []
  let acc = 0
  for (const w of weights) {
    starts.push((acc / total) * duration)
    acc += w
  }
  return starts
}

/** Index of the word being spoken at time `t`, or -1 before the first and after the last second of speech. */
export function activeWord(starts: number[], t: number): number {
  if (t < 0 || starts.length === 0) return -1
  let i = 0
  while (i + 1 < starts.length && starts[i + 1]! <= t) i++
  return i
}
