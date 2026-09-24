import { deleteAward, ownedAward } from '../../utils/awards'
import { requireUser } from '../../utils/users'

/** Takes a show down, with its ballots. Publishing used to be one-way. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const award = await ownedAward(getRouterParam(event, 'slug') ?? '', user.id, user.role)
  await deleteAward(award.id)
  return { ok: true }
})
