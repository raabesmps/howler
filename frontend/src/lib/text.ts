/** Small text helpers for the word-by-word highlight. */

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
