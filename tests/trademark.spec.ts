import { describe, expect, it } from 'vitest'
import { TRADEMARK, isIndexable } from '../shared/indexable'

describe('TRADEMARK', () => {
  it('catches the show name and its spellings', () => {
    for (const n of ['Streamer Awards 2026', "Streamer's Awards", 'Streamers Awards', 'StreamerAwards']) expect(TRADEMARK.test(n)).toBe(true)
  })
  it('leaves other names alone', () => {
    for (const n of ['Chat Awards 2026', 'Stream Awards', 'Best Streamer of the Year']) expect(TRADEMARK.test(n)).toBe(false)
  })
  it('keeps a trademark name out of search', () => {
    const show = { description: 'x'.repeat(100), categories: 5, minNominees: 3 }
    expect(isIndexable({ ...show, name: 'Chat Awards' })).toBe(true)
    expect(isIndexable({ ...show, name: 'Streamers Awards' })).toBe(false)
  })
})
