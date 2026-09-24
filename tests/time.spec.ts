import { describe, expect, it } from 'vitest'
import {
  formatInZone,
  fromDbDateTime,
  isTimeZone,
  toDbDateTime,
  toInstant,
  utcToZoned,
  zonedToUtc,
} from '../shared/time'

describe('zonedToUtc / utcToZoned', () => {
  it('reads a wall-clock time in the show zone', () => {
    // Kyiv is UTC+2 in winter, UTC+3 in summer
    expect(zonedToUtc('2026-12-20', '21:00', 'Europe/Kyiv')).toBe('2026-12-20T19:00:00Z')
    expect(zonedToUtc('2026-07-01', '21:00', 'Europe/Kyiv')).toBe('2026-07-01T18:00:00Z')
    expect(zonedToUtc('2026-12-20', '21:00', 'America/New_York')).toBe('2026-12-21T02:00:00Z')
    expect(zonedToUtc('2026-12-20', '21:00', 'UTC')).toBe('2026-12-20T21:00:00Z')
  })

  it('round-trips, including across a clock change', () => {
    for (const [date, time, tz] of [
      ['2026-12-20', '21:00', 'Europe/Kyiv'],
      ['2026-03-29', '12:00', 'Europe/Kyiv'], // the day Kyiv moves to summer time
      ['2026-10-25', '12:00', 'Europe/Warsaw'], // the day Warsaw moves back
      ['2026-11-01', '09:30', 'America/Los_Angeles'],
      ['2026-06-15', '00:00', 'Asia/Tokyo'],
    ] as const) {
      expect(utcToZoned(zonedToUtc(date, time, tz), tz)).toEqual({ date, time })
    }
  })
})

describe('toInstant', () => {
  it('passes an ISO instant through, normalised to Z', () => {
    expect(toInstant('2026-12-20T21:00:00+02:00', 'UTC')).toBe('2026-12-20T19:00:00Z')
  })

  it('reads a bare day from an older builder as its start, or its last minute for a closing date', () => {
    expect(toInstant('2026-12-20', 'Europe/Kyiv', 'start')).toBe('2026-12-19T22:00:00Z')
    expect(toInstant('2026-12-20', 'Europe/Kyiv', 'end')).toBe('2026-12-20T21:59:00Z')
  })

  it('is null for nothing and for nonsense', () => {
    expect(toInstant('', 'UTC')).toBeNull()
    expect(toInstant(null, 'UTC')).toBeNull()
    expect(toInstant('soon', 'UTC')).toBeNull()
  })
})

describe('database round trip', () => {
  it('stores UTC and reads it back as the same instant', () => {
    const iso = '2026-12-20T19:00:00Z'
    expect(toDbDateTime(iso)).toBe('2026-12-20 19:00:00')
    expect(fromDbDateTime(toDbDateTime(iso))).toBe(iso)
    expect(fromDbDateTime(null)).toBe('')
  })
})

describe('formatInZone', () => {
  it('names the zone, so a reader elsewhere is not misled', () => {
    expect(formatInZone('2026-12-20T19:00:00Z', 'Europe/Kyiv')).toBe('20 December, 21:00 Kyiv time')
    expect(formatInZone('2026-12-20T19:00:00Z', 'America/New_York', { month: 'short' })).toBe('20 Dec, 14:00 New York time')
    expect(formatInZone('2026-12-20T19:00:00Z', 'Europe/Kyiv', { time: false })).toBe('20 December')
  })

  it('falls back to UTC for a zone it does not know rather than throwing', () => {
    expect(formatInZone('2026-12-20T19:00:00Z', 'Mars/Olympus')).toBe('20 December, 19:00 UTC')
  })
})

describe('canonical zone names', () => {
  it('prints Kyiv, not the old spelling some browsers still report', () => {
    expect(formatInZone('2026-12-20T19:00:00Z', 'Europe/Kiev')).toBe('20 December, 21:00 Kyiv time')
  })
})

describe('isTimeZone', () => {
  it('accepts IANA zones and refuses anything else', () => {
    expect(isTimeZone('Europe/Kyiv')).toBe(true)
    expect(isTimeZone('UTC')).toBe(true)
    expect(isTimeZone('Mars/Olympus')).toBe(false)
    expect(isTimeZone('')).toBe(false)
    expect(isTimeZone(42)).toBe(false)
  })
})
