import { awardBySlug } from '../../../utils/awards'
import { tallyFor } from '../../../utils/votes'
import { currentUser } from '../../../utils/users'

/**
 * Counts. The host sees them whenever they ask - it is their show and the
 * dashboard is the reason they came back. Everyone else sees them once the
 * winners have been announced, because a live leaderboard turns a vote into a
 * bandwagon.
 */
export default defineEventHandler(async (event) => {
  const award = await awardBySlug(getRouterParam(event, 'slug') ?? '')
  if (!award) throw createError({ statusCode: 404, statusMessage: 'No such awards' })

  const user = await currentUser(event)
  const isHost = !!user && (user.id === award.owner_id || user.role === 'admin')
  if (!isHost && !award.results_at) {
    throw createError({ statusCode: 403, statusMessage: 'Results are not out yet' })
  }

  return { tally: await tallyFor(award.id), isHost }
})
