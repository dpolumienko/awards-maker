import { ownedAward } from '../../../utils/awards'
import { closeVoting } from '../../../utils/votes'
import { requireUser } from '../../../utils/users'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const award = await ownedAward(getRouterParam(event, 'slug') ?? '', user.id, user.role)
  await closeVoting(award.id)
  return { ok: true }
})
