import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// From the launch (CP11) the home page may be found by search engines. A howler link never can: its token sits after the
// # of the address, which a crawler never requests, so there is nothing of it to index.
describe('search engines', () => {
  it('may index the page and are told so in robots.txt', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    const robots = readFileSync(resolve(process.cwd(), 'public/robots.txt'), 'utf8')

    expect(html).not.toMatch(/noindex/i)
    expect(robots).toMatch(/User-agent: \*/)
    expect(robots).toMatch(/Allow: \//)
    expect(robots).not.toMatch(/Disallow: \/\s*$/m)
  })
})
