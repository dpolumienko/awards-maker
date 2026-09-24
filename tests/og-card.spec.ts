import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'

// The fonts come from Nitro's server-assets storage in the app; here, straight
// off disk from the same directory.
vi.stubGlobal('useStorage', () => ({
  getItemRaw: (key: string) => readFile(new URL(`../server/assets/${key}`, import.meta.url)).catch(() => null),
}))
vi.stubGlobal('useRuntimeConfig', () => ({ uploadsDir: '/nonexistent' }))

const { ogCopy, renderOgCard, safeAccent, stageSvg } = await import('../server/utils/og-card')

const award = (over: Record<string, string | null> = {}) => ({
  name: 'Kai Cenat Awards',
  host_name: 'kaicenat',
  slug: 'kai-cenat-awards',
  opens_at: null,
  closes_at: '2026-12-20',
  ceremony_at: null,
  closed_at: null,
  results_at: null,
  ...over,
})
const NOW = new Date('2026-10-01T12:00:00Z')

describe('ogCopy', () => {
  it('asks for a vote while voting is open', () => {
    const c = ogCopy(award(), 4, 'https://awards.streamscharts.com', NOW)
    expect(c.kicker).toBe('kaicenat presents')
    expect(c.sub).toBe('4 categories, voted by chat · closes 20 Dec')
    expect(c.cta).toBe('Vote now')
    expect(c.url).toBe('awards.streamscharts.com/a/kai-cenat-awards')
  })

  it('says when voting opens, and asks for nothing, before it does', () => {
    const c = ogCopy(award({ opens_at: '2026-11-01' }), 1, 'https://x.test', NOW)
    expect(c.sub).toBe('1 category, voted by chat · opens 1 Nov')
    expect(c.cta).toBe('')
  })

  it('stops asking for votes once voting has closed, by date or by the host', () => {
    expect(ogCopy(award({ closes_at: '2026-09-01' }), 3, 'https://x.test', NOW).cta).toBe('')
    const closed = ogCopy(award({ closed_at: '2026-09-30 10:00:00', ceremony_at: '2026-12-30' }), 3, 'https://x.test', NOW)
    expect(closed.sub).toBe('Voting closed · winners on 30 Dec')
    expect(closed.cta).toBe('')
  })

  it('offers the winners once they are out', () => {
    const c = ogCopy(award({ closed_at: '2026-09-30 10:00:00', results_at: '2026-09-30 11:00:00' }), 5, 'https://x.test', NOW)
    expect(c.sub).toBe('Winners announced · 5 categories')
    expect(c.cta).toBe('See the winners')
  })
})

describe('safeAccent', () => {
  it('passes a hex colour and replaces anything else with the house gold', () => {
    expect(safeAccent('#ff00AA')).toBe('#ff00AA')
    // look is host input and lands inside an SVG attribute
    expect(safeAccent('#fff"/><script>')).toBe('#D9A441')
    expect(safeAccent('red')).toBe('#D9A441')
    expect(safeAccent(undefined)).toBe('#D9A441')
  })
})

describe('stageSvg', () => {
  it.each(['plain', 'stage', 'glow', 'rays', 'spotlights', 'grid', 'unknown'])('draws %s as a complete SVG', (theme) => {
    const svg = stageSvg(theme, '#3FB8AF')
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
  })
})

describe('renderOgCard', () => {
  const size = (png: Buffer) => ({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) })

  it('renders a 1200x630 PNG for Latin, Polish and Cyrillic names', async () => {
    for (const headline of ['Kai Cenat Awards', 'Nagrody Społeczności Łódź', 'Премія Стрімерів України']) {
      const png = await renderOgCard({
        copy: { kicker: 'host presents', headline, sub: '4 categories', cta: 'Vote now', url: 'x.test/a/y' },
        look: { theme: 'glow', accent: '#9B6DFF', font: 'Playfair Display' },
      })
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(size(png)).toEqual({ w: 1200, h: 630 })
    }
  }, 30_000)
})
