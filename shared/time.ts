// Dates in Awards Maker are instants with a time zone, not calendar days.
//
// Until review 2026-09-24 (item 13) a show had three DATE columns: voting
// opened at 00:00 and closed at 23:59:59 in whatever zone the server happened
// to run, and a host in Kyiv announcing "voting closes at 21:00" could not say
// so. Now every date is stored as a UTC instant, the host picks the zone the
// show runs in, and every page shows times in that zone and names it.
//
// Both sides read this file: the builder converts what the host typed into an
// instant, the API validates and stores it, and the pages format it back.

export const DEFAULT_TIME_ZONE = 'UTC'

/** An IANA zone the runtime knows ("Europe/Kyiv"), or false. */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/**
 * Old names some engines still report - Chromium hands a browser in Kyiv back
 * as "Europe/Kiev", which would print "Kiev time" on a Ukrainian streamer's
 * page. Mapped to the current IANA name wherever a zone comes in.
 */
const RENAMED: Record<string, string> = {
  'Europe/Kiev': 'Europe/Kyiv',
  'Europe/Uzhgorod': 'Europe/Kyiv',
  'Europe/Zaporozhye': 'Europe/Kyiv',
}

export function canonicalZone(timeZone: string): string {
  return RENAMED[timeZone] ?? timeZone
}

/** The zone of the browser or server running this, if it names one. */
export function localTimeZone(): string {
  try {
    const tz = canonicalZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    return isTimeZone(tz) ? tz : DEFAULT_TIME_ZONE
  } catch {
    return DEFAULT_TIME_ZONE
  }
}

/** The wall-clock parts of an instant in a zone. */
function partsIn(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') % 24, min: get('minute'), s: get('second') }
}

/** How far a zone is ahead of UTC at a given instant, in milliseconds. */
function offsetAt(instant: Date, timeZone: string): number {
  const p = partsIn(instant, timeZone)
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(instant.getTime() / 1000) * 1000
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * A wall-clock date and time in a zone, as a UTC ISO string.
 * `date` is YYYY-MM-DD, `time` HH:mm. Two passes, so a time on the day a zone
 * changes its clocks lands on the right side of the change.
 */
export function zonedToUtc(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = (time || '00:00').split(':').map(Number)
  const wall = Date.UTC(y!, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0)
  let guess = wall - offsetAt(new Date(wall), timeZone)
  guess = wall - offsetAt(new Date(guess), timeZone)
  return new Date(guess).toISOString().replace('.000Z', 'Z')
}

/** An instant as the date and time a clock in that zone shows. */
export function utcToZoned(iso: string, timeZone: string): { date: string; time: string } {
  const p = partsIn(new Date(iso), timeZone)
  return { date: `${p.y}-${pad(p.m)}-${pad(p.d)}`, time: `${pad(p.h)}:${pad(p.min)}` }
}

/**
 * What the API accepts for a date, as a UTC ISO string or null.
 *
 * An ISO instant passes through. A bare YYYY-MM-DD - what a builder before this
 * change sends - is read in the show's zone as the start of that day, or its
 * last minute for a closing date, which is what a day used to mean here.
 */
export function toInstant(value: string | null | undefined, timeZone: string, edge: 'start' | 'end' = 'start'): string | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return zonedToUtc(value, edge === 'end' ? '23:59' : '00:00', timeZone)
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : new Date(t).toISOString().replace('.000Z', 'Z')
}

/** ISO instant -> MySQL DATETIME, in UTC. */
export function toDbDateTime(iso: string | null): string | null {
  return iso ? new Date(iso).toISOString().slice(0, 19).replace('T', ' ') : null
}

/** MySQL DATETIME (UTC, as mysql2 hands it back with dateStrings) -> ISO instant. */
export function fromDbDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const s = String(value)
  return s.includes('T') ? s : `${s.replace(' ', 'T').slice(0, 19)}Z`
}

/** The city part of a zone id: "Europe/Kyiv" -> "Kyiv", "America/New_York" -> "New York". */
export function zoneCity(timeZone: string): string {
  if (timeZone === 'UTC' || timeZone === 'Etc/UTC') return 'UTC'
  return (canonicalZone(timeZone).split('/').pop() ?? timeZone).replace(/_/g, ' ')
}

/** "GMT+2" for a zone at an instant (offsets move with daylight saving). */
export function zoneOffset(timeZone: string, iso?: string): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(iso ? new Date(iso) : new Date())
      .find((p) => p.type === 'timeZoneName')
    return part?.value ?? 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * An instant for people: "20 Dec, 21:00 Kyiv time". The zone is named every
 * time, because the reader of a streamer's page is rarely in the streamer's zone.
 */
export function formatInZone(
  iso: string | null | undefined,
  timeZone: string,
  opts: { time?: boolean; zone?: boolean; year?: boolean; month?: 'long' | 'short' } = {},
): string {
  if (!iso) return ''
  const { time = true, zone = true, year = false, month = 'long' } = opts
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const tz = isTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month, ...(year ? { year: 'numeric' } : {}), timeZone: tz })
  if (!time) return date
  const clock = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz })
  const city = zoneCity(tz)
  return `${date}, ${clock}${zone ? (city === 'UTC' ? ' UTC' : ` ${city} time`) : ''}`
}

/** The day an instant falls on in a zone, YYYY-MM-DD - for day-bucketed charts. */
export function dayIn(iso: string, timeZone: string): string {
  return utcToZoned(iso, timeZone).date
}

/**
 * The zones offered in the builder: the ones this audience lives in first, then
 * every zone the runtime knows. `supportedValuesOf` is missing on older engines,
 * where the short list is all there is.
 */
export const COMMON_TIME_ZONES = [
  'Europe/Kyiv',
  'Europe/Warsaw',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'UTC',
]

export function allTimeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  const all = (intl.supportedValuesOf?.('timeZone') ?? []).map(canonicalZone)
  return [...new Set([...COMMON_TIME_ZONES, ...all])]
}
