import { FREE, PUBLISH } from '#shared/limits'
import { draftFor, freeSlug, hydrate, publishAward, saveAward, slugify } from '../../utils/awards'
import { awardInputSchema, parseOr400 } from '../../utils/schema'
import { paidFeaturesOf, tierFor } from '../../utils/billing'
import { queryOne } from '../../utils/db'
import { requireHost } from '../../utils/users'

/**
 * Turns the draft into a live show.
 *
 * Every rule the builder explains is checked again here, because a POST does not
 * have to come from the builder. The builder's copy exists to warn before the
 * limit bites; this one exists because it is the only copy that is enforcement.
 */
export default defineEventHandler(async (event) => {
  const user = await requireHost(event)
  const input = parseOr400(awardInputSchema, await readBody(event), 'Invalid awards')

  if (!input.name.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Give the show a name' })
  }

  const filled = input.nominations.filter(
    (n) => n.title.trim() && n.nominees.length >= PUBLISH.minNomineesPerNomination,
  )
  if (filled.length < PUBLISH.minNominations) {
    throw createError({
      statusCode: 400,
      statusMessage: `A show needs ${PUBLISH.minNominations} categories with ${PUBLISH.minNomineesPerNomination} nominees each`,
    })
  }

  const tier = await tierFor(user, { ...input, nominations: filled })
  const paid = paidFeaturesOf({ ...input, nominations: filled })
  if (tier === 'free' && paid.length) {
    throw createError({
      statusCode: 402,
      statusMessage: `The free plan does not cover ${paid.join(', ')}`,
    })
  }

  // One live show at a time on free - the ceiling the plans page names.
  if (tier === 'free') {
    const live = await queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM awards WHERE owner_id = ? AND status = 'published'`,
      [user.id],
    )
    if (Number(live?.n ?? 0) >= FREE.maxActiveAwards) {
      throw createError({
        statusCode: 402,
        statusMessage: 'The free plan runs one show at a time. Take the old one down or upgrade.',
      })
    }
  }

  const row = await draftFor(user.id, { name: user.name, platform: 'twitch' })
  await saveAward(row.id, { ...input, nominations: filled })
  const slug = await freeSlug(slugify(input.name), row.id)
  await publishAward(row.id, slug, tier)

  return { award: await hydrate({ ...row, slug, status: 'published', tier }), tier }
})
