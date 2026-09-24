import { awardBySlug } from '../utils/awards'
import { insert } from '../utils/db'
import { isSameOriginRequest } from '../utils/same-origin'
import { parseOr400, reportSchema } from '../utils/schema'
import { currentUser } from '../utils/users'

/**
 * Reporting a show does not require an account - somebody who has just been
 * impersonated should not have to sign in to say so. With no session cookie to
 * lean on, the origin is what stops this being an open write endpoint.
 */
export default defineEventHandler(async (event) => {
  const site = useSiteConfig(event)
  if (!isSameOriginRequest(event, String(site.url))) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-origin report' })
  }

  const body = parseOr400(reportSchema, await readBody(event), 'Invalid report')
  const award = await awardBySlug(body.slug)
  if (!award) throw createError({ statusCode: 404, statusMessage: 'No such awards' })

  const user = await currentUser(event)
  await insert(`INSERT INTO reports (award_id, user_id, reason) VALUES (?, ?, ?)`, [
    award.id,
    user?.id ?? null,
    body.reason.trim(),
  ])
  return { ok: true }
})
