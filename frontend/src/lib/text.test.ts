import { describe, expect, it } from 'vitest'
import { activeWord, detectLang, splitClauses, splitWords, wordTimings } from './text'

describe('detectLang', () => {
  it('spots Portuguese by accents and common words', () => {
    expect(detectLang('Você nunca atende as minhas ligações')).toBe('pt')
    expect(detectLang('eu nao quero mais isso')).toBe('pt')
  })
  it('defaults to English', () => {
    expect(detectLang('You never answer my calls')).toBe('en')
    expect(detectLang('')).toBe('en')
  })
})

describe('splitClauses', () => {
  it('keeps a short message as one piece', () => {
    expect(splitClauses('Clean your room')).toEqual(['Clean your room'])
  })
  it('splits at punctuation and never exceeds the maximum', () => {
    const out = splitClauses('I told you once, I told you twice, I told you a hundred times! Clean. Your. Room.', 3)
    expect(out.length).toBeLessThanOrEqual(3)
    expect(out.join(' ').replace(/\s+/g, ' ')).toContain('I told you once,')
  })
  it('does not lose any text', () => {
    const text = 'Wait. What? You did WHAT, again, after all I said!'
    const joined = splitClauses(text, 4).join(' ').replace(/\s+/g, '')
    expect(joined).toBe(text.replace(/\s+/g, ''))
  })
})

describe('word timing', () => {
  const words = splitWords('You never answer my calls.')
  const starts = wordTimings(words, 3)
  it('starts at zero and increases', () => {
    expect(starts[0]).toBe(0)
    for (let i = 1; i < starts.length; i++) expect(starts[i]!).toBeGreaterThan(starts[i - 1]!)
  })
  it('stays inside the duration', () => {
    expect(starts[starts.length - 1]!).toBeLessThan(3)
  })
  it('finds the active word', () => {
    expect(activeWord(starts, -1)).toBe(-1)
    expect(activeWord(starts, 0)).toBe(0)
    expect(activeWord(starts, 2.99)).toBe(words.length - 1)
  })
})
