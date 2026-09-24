import { AlreadyVoted, castBallot } from '../../../utils/votes'
import { awardBySlug } from '../../../utils/awards'
import { ballotSchema, parseOr400 } from '../../../utils/schema'
import { requireUser } from '../../../utils/users'
import { FREE } from '#shared/limits'
import { fromDbDateTime } from '#shared/time'
import { queryOne } from '../../../utils/db'

/**
 * One ballot per person per show, enforced by a unique index rather than by this
 * handler - two requests racing each other end with one row and the loser is
 * told. Until now "you already voted" meant "this browser has a localStorage
 * key", which a private window defeated.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { picks } = parseOr400(ballotSchema, await readBody(event), 'Invalid ballot')

  const award = await awardBySlug(getRouterParam(event, 'slug') ?? '')
  if (!award) throw createError({ statusCode: 404, statusMessage: 'No such awards' })

  // opens_at / closes_at are UTC instants (migration 002), not calendar days
  const now = Date.now()
  const at = (v: string | null) => (v ? Date.parse(fromDbDateTime(v)) : NaN)
  if (award.closed_at || at(award.closes_at) < now) {
    throw createError({ statusCode: 409, statusMessage: 'Voting is closed' })
  }
  if (at(award.opens_at) > now) {
    throw createError({ statusCode: 409, statusMessage: 'Voting has not opened yet' })
  }

  if (award.tier === 'free') {
    const voters = await queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ballots WHERE award_id = ?`,
      [award.id],
    )
    if (Number(voters?.n ?? 0) >= FREE.maxVoters) {
      throw createError({ statusCode: 409, statusMessage: 'This show has reached its free ceiling' })
    }
  }

  try {
    return await castBallot(award.id, user.id, picks)
  } catch (error) {
    if (error instanceof AlreadyVoted) {
      throw createError({ statusCode: 409, statusMessage: 'You have already voted here' })
    }
    throw error
  }
})
