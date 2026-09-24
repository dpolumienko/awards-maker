import { ownedAward } from '../../../utils/awards'
import { publishResults } from '../../../utils/votes'
import { requireUser } from '../../../utils/users'

/** Announcing the winners also closes voting, if the host had not already. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const award = await ownedAward(getRouterParam(event, 'slug') ?? '', user.id, user.role)
  await publishResults(award.id)
  return { ok: true }
})
