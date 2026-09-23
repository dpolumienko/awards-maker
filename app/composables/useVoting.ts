import { ref } from 'vue'
import { FREE, type Award, type Nomination, type Nominee } from '~/types/award'

// Voting, still without a backend. A ballot and a tally live in localStorage
// under the same shapes the API will use: one ballot per voter per awards, one
// tally per awards. Counts start at zero and only move when somebody actually
// votes - the mockup once shipped "212 voted" on a brand new page and it read
// as a lie.
const VOTES_KEY = 'awards-maker:votes'
const TALLY_KEY = 'awards-maker:tally'

/** What one voter submitted: one nominee per nomination. */
export interface Ballot {
  picks: Record<string, string>
  at: string
}
export interface Tally {
  voters: number
  counts: Record<string, Record<string, number>>
  /**
   * Ballots per calendar day, `YYYY-MM-DD`. The only history kept, and the only
   * honest source for a trend - a chart drawn from a single total would be drawn
   * from nothing.
   */
  days?: Record<string, number>
  /** Set when the host stops voting before the closing date. */
  closedAt?: string
  /** Set when the host publishes the winners. Until then results stay hidden. */
  resultsAt?: string
}

/** One day of the trend. A day nobody voted is a zero, not a gap. */
export interface DayCount {
  date: string
  votes: number
}

/**
 * Where an awards page is in its life. Dates decide voting; the free voter cap
 * can cut it short, and the winners appear only when the host publishes them -
 * the ceremony date is an announcement, not a trigger.
 */
export type Phase = 'soon' | 'open' | 'capped' | 'counting' | 'revealed'

export interface Result {
  nominee: Nominee
  votes: number
  pct: number
  top: boolean
}

const ballots = ref<Record<string, Ballot>>({})
const tallies = ref<Record<string, Tally>>({})
let hydrated = false

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private window - the vote stays in memory for this session */
  }
}

const startOf = (d: string) => new Date(`${d}T00:00:00`).getTime()
/** Local calendar day, `YYYY-MM-DD`. toISOString() would shift a late-night vote to the next day. */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const endOf = (d: string) => new Date(`${d}T23:59:59`).getTime()

export const emptyTally = (): Tally => ({ voters: 0, counts: {}, days: {} })

export function useVoting() {
  if (import.meta.client && !hydrated) {
    hydrated = true
    ballots.value = read(VOTES_KEY, {})
    tallies.value = read(TALLY_KEY, {})
  }

  const ballotFor = (slug: string): Ballot | null => ballots.value[slug] ?? null
  const tallyFor = (slug: string): Tally => tallies.value[slug] ?? emptyTally()
  const votersFor = (slug: string) => tallyFor(slug).voters
  const countFor = (slug: string, nominationId: string, nomineeId: string) =>
    tallyFor(slug).counts[nominationId]?.[nomineeId] ?? 0

  /** One submit per voter: the whole ballot at once, the way the page asks for it. */
  function castBallot(slug: string, picks: Record<string, string>) {
    if (ballotFor(slug)) return false
    // A tally read back from storage is a reactive proxy, and structuredClone
    // refuses to clone one - the vote threw instead of counting. Copied by hand,
    // one level deeper than the counts map.
    const previous = tallyFor(slug)
    const tally: Tally = {
      ...previous,
      counts: Object.fromEntries(Object.entries(previous.counts).map(([id, row]) => [id, { ...row }])),
      days: { ...(previous.days ?? {}) },
    }
    for (const [nominationId, nomineeId] of Object.entries(picks)) {
      const row = (tally.counts[nominationId] ??= {})
      row[nomineeId] = (row[nomineeId] ?? 0) + 1
    }
    tally.voters += 1
    const today = dayKey(new Date())
    const days = (tally.days ??= {})
    days[today] = (days[today] ?? 0) + 1
    tallies.value = { ...tallies.value, [slug]: tally }
    ballots.value = { ...ballots.value, [slug]: { picks, at: new Date().toISOString() } }
    save(TALLY_KEY, tallies.value)
    save(VOTES_KEY, ballots.value)
    return true
  }

  /**
   * `override` is the demo hook: `/a/<slug>?state=revealed` shows a state the
   * dates have not reached yet, so the whole life of a page can be shown
   * without editing dates. It never affects a real visitor's page.
   */
  function phaseOf(award: Award, now = Date.now(), override?: string): Phase {
    const phases: Phase[] = ['soon', 'open', 'capped', 'counting', 'revealed']
    if (override && phases.includes(override as Phase)) return override as Phase
    if (tallyFor(award.slug).resultsAt) return 'revealed'
    if (tallyFor(award.slug).closedAt) return 'counting'
    if (award.closesAt && now > endOf(award.closesAt)) return 'counting'
    if (votersFor(award.slug) >= FREE.maxVoters) return 'capped'
    if (award.opensAt && now < startOf(award.opensAt)) return 'soon'
    return 'open'
  }

  /** Stop voting before the closing date. The counts stay private until published. */
  function closeVoting(slug: string) {
    const tally = { ...tallyFor(slug), closedAt: new Date().toISOString() }
    tallies.value = { ...tallies.value, [slug]: tally }
    save(TALLY_KEY, tallies.value)
  }

  /** The host's own move: counting stops being private and the page shows winners. */
  function publishResults(slug: string) {
    const tally = { ...tallyFor(slug), resultsAt: new Date().toISOString() }
    tallies.value = { ...tallies.value, [slug]: tally }
    save(TALLY_KEY, tallies.value)
  }

  /** Nominees of one nomination, most votes first, with the leader flagged. */
  function resultsOf(slug: string, nomination: Nomination): Result[] {
    const rows = nomination.nominees.map((nominee) => ({
      nominee,
      votes: countFor(slug, nomination.id, nominee.id),
    }))
    const total = rows.reduce((sum, r) => sum + r.votes, 0)
    const best = Math.max(0, ...rows.map((r) => r.votes))
    return rows
      .map((r) => ({ ...r, pct: total ? Math.round((r.votes / total) * 100) : 0, top: r.votes > 0 && r.votes === best }))
      .sort((a, b) => b.votes - a.votes)
  }

  const votesInOf = (slug: string, nomination: Nomination) =>
    nomination.nominees.reduce((sum, n) => sum + countFor(slug, nomination.id, n.id), 0)

  /**
   * Ballots per day between two dates, zeros included. The range is clamped to
   * the days that actually exist, so a page open for one day charts one day
   * instead of a month of empty axis.
   */
  function dailyOf(slug: string, from?: string, to?: string): DayCount[] {
    const days = tallyFor(slug).days ?? {}
    const keys = Object.keys(days).sort()
    const start = from && (!keys[0] || from < keys[0]) ? from : keys[0]
    const last = keys[keys.length - 1]
    const today = dayKey(new Date())
    // never past today, never past the closing date, never before the last vote
    const capped = to && to < today ? to : today
    const end = last && last > capped ? last : capped
    if (!start) return []

    const out: DayCount[] = []
    for (let d = new Date(`${start}T00:00:00`); dayKey(d) <= end; d.setDate(d.getDate() + 1)) {
      out.push({ date: dayKey(d), votes: days[dayKey(d)] ?? 0 })
      if (out.length > 370) break
    }
    return out
  }

  return {
    ballotFor,
    tallyFor,
    votersFor,
    countFor,
    castBallot,
    closeVoting,
    publishResults,
    phaseOf,
    resultsOf,
    votesInOf,
    dailyOf,
  }
}
