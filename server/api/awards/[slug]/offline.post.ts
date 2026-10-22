import { z } from 'zod'
import { ownedAward, setOffline } from '../../../utils/awards'
import { requireUser } from '../../../utils/users'
import { parseOr400 } from '../../../utils/schema'

const body = z.object({ offline: z.boolean() })

/** The host takes the show offline, or puts it back. Ballots and settings stay. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { offline } = parseOr400(body, await readBody(event), 'Say offline: true or false')
  const award = await ownedAward(getRouterParam(event, 'slug') ?? '', user.id, user.role)
  if (award.status !== 'published') throw createError({ statusCode: 409, statusMessage: 'Not published' })
  await setOffline(award.id, offline)
  return { ok: true, offline }
})
