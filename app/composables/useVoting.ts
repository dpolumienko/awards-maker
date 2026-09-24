import { FREE, type Award, type Nomination, type Nominee } from '~/types/award'
import type { Tally } from '~/composables/useAwards'

// What voting means, as functions over data somebody else fetched.
//
// This used to own the ballots and the counts in localStorage. It owns nothing
// now: the ballots are rows, the counts are a GROUP BY, and what is left here is
// the arithmetic - which phase a show is in, how a category ranks, how the daily
// series fills in its gaps. Same names, so the pages read the same.

export interface DayCount {
  date: string
  votes: number
}

export type Phase = 'soon' | 'open' | 'capped' | 'counting' | 'revealed'

export interface Result {
  nominee: Nominee
  votes: number
  pct: number
  top: boolean
}

export const emptyTally = (): Tally => ({ voters: 0, counts: {}, days: {} })

/** Local calendar day, not UTC: a vote at 01:00 in Kyiv is today, not yesterday. */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const startOf = (date: string) => new Date(`${date}T00:00:00`).getTime()
const endOf = (date: string) => new Date(`${date}T23:59:59`).getTime()

export function countFor(tally: Tally, nominationId: string, nomineeId: string): number {
  return tally.counts?.[nominationId]?.[nomineeId] ?? 0
}

/**
 * `override` is the demo hook: `/a/<slug>?state=revealed` shows a state the dates
 * have not reached yet, so the whole life of a page can be walked through without
 * editing dates. It never affects a real visitor's page.
 */
export function phaseOf(
  award: Award & { tier?: 'free' | 'paid'; closedAt?: string; resultsAt?: string },
  voters = 0,
  now = Date.now(),
  override?: string,
): Phase {
  const phases: Phase[] = ['soon', 'open', 'capped', 'counting', 'revealed']
  if (override && phases.includes(override as Phase)) return override as Phase
  if (award.resultsAt) return 'revealed'
  if (award.closedAt) return 'counting'
  if (award.closesAt && now > endOf(award.closesAt)) return 'counting'
  // the ceiling is a free-plan thing; a paid show has none
  if (award.tier !== 'paid' && voters >= FREE.maxVoters) return 'capped'
  if (award.opensAt && now < startOf(award.opensAt)) return 'soon'
  return 'open'
}

/** Nominees of one nomination, most votes first, with the leader flagged. */
export function resultsOf(tally: Tally, nomination: Nomination): Result[] {
  const rows = nomination.nominees.map((nominee) => ({
    nominee,
    votes: countFor(tally, nomination.id, nominee.id),
  }))
  const total = rows.reduce((sum, r) => sum + r.votes, 0)
  const best = Math.max(0, ...rows.map((r) => r.votes))
  return rows
    .map((r) => ({
      ...r,
      pct: total ? Math.round((r.votes / total) * 100) : 0,
      top: r.votes > 0 && r.votes === best,
    }))
    .sort((a, b) => b.votes - a.votes)
}

export function votesInOf(tally: Tally, nomination: Nomination): number {
  return nomination.nominees.reduce((sum, n) => sum + countFor(tally, nomination.id, n.id), 0)
}

/**
 * Ballots per day between two dates, zeros included. The range is clamped to the
 * days that actually exist, so a page open for one day charts one day instead of
 * a month of empty axis.
 */
export function dailyOf(tally: Tally, from?: string, to?: string): DayCount[] {
  const days = tally.days ?? {}
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

/** The writes. Each one is a POST; the caller refetches what it needs after. */
export function useVoting() {
  const castBallot = (slug: string, picks: Record<string, string>) =>
    $fetch<{ picks: number }>(`/api/awards/${encodeURIComponent(slug)}/ballot`, {
      method: 'POST',
      body: { picks },
    })

  const closeVoting = (slug: string) =>
    $fetch(`/api/awards/${encodeURIComponent(slug)}/close`, { method: 'POST' })

  const publishResults = (slug: string) =>
    $fetch(`/api/awards/${encodeURIComponent(slug)}/results`, { method: 'POST' })

  return { castBallot, closeVoting, publishResults }
}
