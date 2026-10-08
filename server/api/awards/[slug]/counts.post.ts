import { z } from 'zod'
import { ownedAward, setHideCounts } from '../../../utils/awards'
import { requireUser } from '../../../utils/users'
import { parseOr400 } from '../../../utils/schema'

const body = z.object({ hidden: z.boolean() })

/** The host keeps the vote counts off the public page, or puts them back. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { hidden } = parseOr400(body, await readBody(event), 'Say hidden: true or false')
  const award = await ownedAward(getRouterParam(event, 'slug') ?? '', user.id, user.role)
  await setHideCounts(award.id, hidden)
  return { ok: true, hidden }
})
