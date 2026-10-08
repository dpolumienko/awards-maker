/**
 * The counts with the numbers taken out (review 2026-10-08: a host can publish
 * the winners without the vote counts). Each nominee's count becomes its place,
 * highest score first, a tie kept a tie - so a page can still order the results
 * and name the winner, and nothing in the response says by how much. The days
 * go entirely. Used by the server and by the static demo's stand-in for it.
 */
export function ranksOnly<T extends { counts: Record<string, Record<string, number>>; days?: Record<string, number> }>(tally: T): T {
  const counts: T['counts'] = {}
  for (const [nomination, row] of Object.entries(tally.counts)) {
    const levels = [...new Set(Object.values(row))].sort((a, b) => b - a)
    counts[nomination] = Object.fromEntries(Object.entries(row).map(([nominee, votes]) => [nominee, levels.length - levels.indexOf(votes)]))
  }
  return { ...tally, counts, days: {} }
}
