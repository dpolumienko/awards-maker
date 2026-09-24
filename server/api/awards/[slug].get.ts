import { awardBySlug, hydrate } from '../../utils/awards'
import { ballotFor, tallyFor } from '../../utils/votes'
import { currentUser } from '../../utils/users'

/**
 * One published show, plus whatever this viewer is entitled to know about it:
 * their own ballot if they voted, and the counts only once the host has either
 * announced the winners or is the one asking.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const row = await awardBySlug(slug)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'No such awards' })

  const award = await hydrate(row)
  const user = await currentUser(event)
  const isHost = !!user && (user.id === row.owner_id || user.role === 'admin')

  const [ballot, tally] = await Promise.all([
    user ? ballotFor(row.id, user.id) : null,
    isHost || row.results_at ? tallyFor(row.id) : null,
  ])

  return {
    award,
    isHost,
    ballot,
    tally,
    // always safe to publish: it is the number on the page already
    voters: tally?.voters ?? (await tallyFor(row.id)).voters,
  }
})
