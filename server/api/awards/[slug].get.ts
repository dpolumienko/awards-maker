import { awardBySlug, hydrate } from '../../utils/awards'
import { ballotFor, tallyFor } from '../../utils/votes'
import { currentUser } from '../../utils/users'
import { ranksOnly } from '#shared/tally'

/**
 * One published show, plus whatever this viewer is entitled to know about it:
 * their own ballot if they voted, and the counts only once the host has either
 * announced the winners or is the one asking. A host who hides the counts has
 * the public get places instead (shared/tally) - hidden, not just unprinted.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  // a show taken offline is still there for its host, and nobody else
  const row = await awardBySlug(slug, 'host')
  if (!row) throw createError({ statusCode: 404, statusMessage: 'No such awards' })
  const user = await currentUser(event)
  const isHost = !!user && (user.id === row.owner_id || user.role === 'admin')
  if (row.offline_at && !isHost) throw createError({ statusCode: 404, statusMessage: 'No such awards' })

  const award = await hydrate(row)

  const [ballot, tally] = await Promise.all([
    user ? ballotFor(row.id, user.id) : null,
    isHost || row.results_at ? tallyFor(row.id) : null,
  ])

  return {
    award,
    isHost,
    ballot,
    tally: tally && row.hide_counts && !isHost ? ranksOnly(tally) : tally,
    // always safe to publish: it is the number on the page already
    voters: tally?.voters ?? (await tallyFor(row.id)).voters,
  }
})
