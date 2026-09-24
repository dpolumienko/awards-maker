import { FREE, PUBLISH } from '#shared/limits'
import { draftFor, freeSlug, hydrate, publishAward, saveAward, slugify } from '../../utils/awards'
import { awardInputSchema, parseOr400 } from '../../utils/schema'
import { claimOrder, paidFeaturesOf, tierFor } from '../../utils/billing'
import { queryOne } from '../../utils/db'
import { DEFAULT_TIME_ZONE, toInstant } from '#shared/time'
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

  // The same channel twice in one category splits its own votes (QA P2): the
  // second copy goes, and the category is counted as what is left.
  const filled = input.nominations
    .map((n) => {
      const seen = new Set<string>()
      return {
        ...n,
        nominees: n.nominees.filter((x) => {
          const key = x.kind === 'channel' && x.channel
            ? `c:${x.channel.platform}:${x.channel.name.trim().toLowerCase()}`
            : `${x.kind}:${(x.url || x.image || x.text || '').trim().toLowerCase()}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }),
      }
    })
    .filter((n) => n.title.trim() && n.nominees.length >= PUBLISH.minNomineesPerNomination)
  if (filled.length < PUBLISH.minNominations) {
    throw createError({
      statusCode: 400,
      statusMessage: `A show needs ${PUBLISH.minNominations} categories with ${PUBLISH.minNomineesPerNomination} nominees each`,
    })
  }

  // opens before it closes, and no ceremony before the last vote is in
  const zone = input.timezone || DEFAULT_TIME_ZONE
  const at = (v: string | null | undefined, edge: 'start' | 'end') => {
    const iso = toInstant(v, zone, edge)
    return iso ? Date.parse(iso) : null
  }
  const opens = at(input.opensAt, 'start')
  const closes = at(input.closesAt, 'end')
  const ceremony = at(input.ceremonyAt, 'start')
  if (opens !== null && closes !== null && closes <= opens) {
    throw createError({ statusCode: 400, statusMessage: 'Voting has to close after it opens' })
  }
  if (closes !== null && ceremony !== null && ceremony < closes) {
    throw createError({ statusCode: 400, statusMessage: 'The ceremony has to come after voting closes' })
  }

  const tier = await tierFor(user, { ...input, nominations: filled })
  const paid = paidFeaturesOf({ ...input, nominations: filled })
  if (tier === 'free' && paid.length) {
    throw createError({
      statusCode: 402,
      statusMessage: `The free plan does not cover ${paid.join(', ')}`,
    })
  }

  // One live show at a time on free - the ceiling the plans page names. A show
  // whose winners are out is finished, not live: it must not block the next
  // season (QA P1 - the host had to delete last year's results to run again).
  if (tier === 'free') {
    const live = await queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM awards
        WHERE owner_id = ? AND status = 'published' AND results_at IS NULL`,
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
  // a paid show spends one order; an admin's is on the house
  if (tier === 'paid' && user.role !== 'admin' && !(await claimOrder(user.id, row.id))) {
    throw createError({ statusCode: 402, statusMessage: 'This show needs its own $50 payment' })
  }
  await saveAward(row.id, { ...input, nominations: filled })
  const slug = await freeSlug(slugify(input.name), row.id)
  await publishAward(row.id, slug, tier)

  return { award: await hydrate({ ...row, slug, status: 'published', tier }), tier }
})
