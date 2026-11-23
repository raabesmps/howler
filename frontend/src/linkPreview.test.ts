import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { withSiteUrl } from '../vite.config'

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

describe('link preview', () => {
  it('shows only a generic closed envelope: the same for every link, never the message or the name', () => {
    expect(html).toContain('property="og:title" content="Someone sent you something"')
    expect(html).toContain('og:image:alt" content="A closed red envelope')
    expect(html).not.toContain('{{')
  })

  it('fills in absolute URLs from VITE_SITE_URL', () => {
    const out = withSiteUrl(html, 'https://howler.example.com/')
    expect(out).toContain('content="https://howler.example.com/og.png"')
    expect(out).toContain('content="https://howler.example.com/"')
    expect(out).not.toContain('__SITE_URL__')
  })

  it('drops the tags that need an absolute URL when no site URL is set, instead of shipping broken ones', () => {
    const out = withSiteUrl(html, undefined)
    expect(out).not.toContain('__SITE_URL__')
    expect(out).not.toContain('og:image"')
    expect(out).toContain('og:title')
  })
})
