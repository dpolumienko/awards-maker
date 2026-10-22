import { describe, expect, it } from 'vitest'
import { ranksOnly } from '../shared/tally'

// A host who hides the counts must not leak them through the API: the public
// response carries places, which still order the results and name the winner.
describe('ranksOnly', () => {
  const tally = { voters: 61, counts: { '1': { a: 38, b: 14, c: 9 }, '2': { d: 20, e: 20, f: 3 } }, days: { '2026-10-01': 12 } }
  const out = ranksOnly(tally)

  it('keeps the order and the winner', () => {
    expect(out.counts['1']).toEqual({ a: 3, b: 2, c: 1 })
  })

  it('keeps a tie a tie', () => {
    expect(out.counts['2']!.d).toBe(out.counts['2']!.e)
    expect(out.counts['2']!.d).toBeGreaterThan(out.counts['2']!.f!)
  })

  it('says nothing about how many votes or when', () => {
    const numbers = Object.values(out.counts).flatMap((r) => Object.values(r))
    expect(Math.max(...numbers)).toBeLessThanOrEqual(3)
    expect(out.days).toEqual({})
  })
})
