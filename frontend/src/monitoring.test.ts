import { describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { initMonitoring, scrubReport, scrubText, scrubUrl, TOKEN } from './monitoring'

// a real token has this shape: 43 characters of URL-safe base64
const token = 'xwKd8KRsGLooXU16N6irtWqQG9vlOpSxlfAbCdEfGhI'

describe('scrubUrl and scrubText', () => {
  it('drops the fragment (where the token lives), the query, and anything token-shaped', () => {
    expect(scrubUrl(`https://howler.example.com/#/h/${token}`)).toBe('https://howler.example.com/')
    expect(scrubUrl(`https://howler.example.com/?a=1#/h/${token}`)).toBe('https://howler.example.com/')
    expect(scrubUrl(`https://howler.example.com/api/howlers/${token}/open`)).toBe(`https://howler.example.com/api/howlers/${TOKEN}/open`)
  })

  it('blanks a token wherever it appears in text, and leaves ordinary words alone', () => {
    expect(scrubText(`failed for ${token} twice`)).toBe(`failed for ${TOKEN} twice`)
    expect(scrubText('/h/anything-here')).toBe(`/h/${TOKEN}`)
    expect(scrubText('howler is burned')).toBe('howler is burned')
  })
})

describe('scrubReport', () => {
  const event = () => ({
    request: { url: `https://howler.example.com/#/h/${token}`, headers: { Referer: `https://howler.example.com/#/h/${token}`, Cookie: 'x=1' }, cookies: { a: 'b' }, data: { message: 'SECRET MESSAGE' } },
    user: { ip_address: '203.0.113.9' },
    breadcrumbs: [{ category: 'ui.click', message: 'div.words > span' }, { category: 'navigation', data: { from: `/h/${token}` } }],
    extra: { props: { message: 'SECRET MESSAGE' } },
    transaction: `/h/${token}`,
    message: `could not open ${token}`,
    exception: { values: [{ value: `No howler for ${token}` }] },
  })

  it('leaves nothing secret in the report', () => {
    const everything = JSON.stringify(scrubReport(event()))
    expect(everything).not.toContain(token)
    expect(everything).not.toContain('SECRET MESSAGE')
    expect(everything).not.toContain('203.0.113.9')
    expect(everything).not.toContain('Cookie')
  })

  it('keeps what finds the bug and never drops the report', () => {
    const clean = scrubReport(event())
    expect(clean.request).toEqual({ url: 'https://howler.example.com/' })
    expect(clean.exception?.values?.[0]?.value).toBe(`No howler for ${TOKEN}`)
    expect(clean.transaction).toBe(`/h/${TOKEN}`)
    expect(scrubReport({})).toEqual({})
  })
})

describe('initMonitoring', () => {
  it('does nothing without a DSN: nothing is loaded or sent', async () => {
    expect(await initMonitoring(createApp({}), undefined)).toBe(false)
    expect(await initMonitoring(createApp({}), '')).toBe(false)
  })
})
