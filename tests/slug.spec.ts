import { describe, expect, it } from 'vitest'
import { slugify } from '../shared/slug'

describe('slugify', () => {
  it.each([
    ['Kai Cenat Awards 2026', 'kai-cenat-awards-2026'],
    // Ukrainian, KMU 2010: и is y, word-initial є/ї/й/ю/я get a y
    ['Премія Стрімерів України 2026', 'premiia-strimeriv-ukrainy-2026'],
    ['Юрій і Євген', 'yurii-i-yevhen'],
    ['Гра року і стрім', 'hra-roku-i-strim'],
    // no і/ї/є/ґ: indistinguishable from Russian, and read as Russian
    ['Гра року', 'gra-roku'],
    ["Об'єднання стрімерів", 'obiednannia-strimeriv'],
    // Russian: и is i, г is g
    ['Игра года', 'igra-goda'],
    ['Стример года — выбор чата', 'strimer-goda-vybor-chata'],
    // Polish, including the ł NFKD leaves alone
    ['Nagrody Społeczności Łódź', 'nagrody-spolecznosci-lodz'],
    ['Najlepszy Stream Roku, Edycja Świąteczna', 'najlepszy-stream-roku-edycja-swiateczna'],
    ['Straße Café Æsir', 'strasse-cafe-aesir'],
  ])('%s -> %s', (name, slug) => {
    expect(slugify(name)).toBe(slug)
  })

  it('cuts at 60 characters without leaving a trailing dash', () => {
    const slug = slugify('Nagrody Społeczności Łódź — Najlepszy Stream Roku, Edycja Świąteczna 2026')
    expect(slug.length).toBeLessThanOrEqual(60)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('returns an empty string when nothing is transliterable, for freeSlug to fill in', () => {
    expect(slugify('🏆🏆')).toBe('')
  })
})
