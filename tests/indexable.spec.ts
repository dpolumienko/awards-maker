import { describe, expect, it } from 'vitest'
import { INDEX, isIndexable } from '../shared/indexable'

const good = {
  name: 'Night Owl Awards 2026',
  description: 'The end of year awards for the Night Owl community: five categories, voted by the people who were there at 3 am.',
  categories: 5,
  minNominees: 3,
}

describe('isIndexable - one rule for the page robots tag and the sitemap', () => {
  it('lets a real show in', () => {
    expect(isIndexable(good)).toBe(true)
  })

  it('keeps thin shows out', () => {
    expect(isIndexable({ ...good, categories: 2 })).toBe(false)
    expect(isIndexable({ ...good, minNominees: 1 })).toBe(false)
    expect(isIndexable({ ...good, description: 'Seed' })).toBe(false)
    expect(isIndexable({ ...good, description: 'x'.repeat(INDEX.minDescription - 1) })).toBe(false)
  })

  it('keeps names trading on a show we do not own out', () => {
    expect(isIndexable({ ...good, name: 'My Streamer Awards 2026' })).toBe(false)
  })
})
