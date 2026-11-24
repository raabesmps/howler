import { afterEach, describe, expect, it } from 'vitest'
import { dictionaries, lang, setLang, t, type Key } from './i18n'
import { describeError } from './lib/errors'
import { RateLimitError, ValidationError } from './api/types'

const keys = Object.keys(dictionaries.en) as Key[]
const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

afterEach(() => setLang('en'))

describe('the dictionaries', () => {
  it('have the same keys, none of them empty', () => {
    expect(Object.keys(dictionaries.pt).sort()).toEqual([...keys].sort())
    for (const k of keys) {
      expect(dictionaries.en[k].trim(), `en.${k}`).not.toBe('')
      expect(dictionaries.pt[k].trim(), `pt.${k}`).not.toBe('')
    }
  })

  it('use the same {placeholders} in both languages', () => {
    for (const k of keys) expect(placeholders(dictionaries.pt[k]), k).toEqual(placeholders(dictionaries.en[k]))
  })
})

describe('t and setLang', () => {
  it('fills placeholders and follows the chosen language', () => {
    expect(t('forName', { name: 'Sam' })).toBe('For Sam.')
    setLang('pt')
    expect(lang.value).toBe('pt')
    expect(t('forName', { name: 'Sam' })).toBe('Para Sam.')
    expect(document.documentElement.lang).toBe('pt-BR')
    setLang('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('remembers the language on this device', () => {
    setLang('pt')
    expect(localStorage.getItem('howler.lang')).toBe('pt')
  })
})

describe('errors in the chosen language', () => {
  it('say the same thing in Portuguese', () => {
    setLang('pt')
    expect(describeError(new RateLimitError(1))).toContain('1 segundo.')
    expect(describeError(new RateLimitError(30))).toContain('30 segundos')
    expect(describeError(new ValidationError('The message field is required.'))).toBe(dictionaries.pt.errInvalid)
  })

  it('keep the words of the server in English', () => {
    expect(describeError(new ValidationError('The message field is required.'))).toBe('The message field is required.')
  })
})
