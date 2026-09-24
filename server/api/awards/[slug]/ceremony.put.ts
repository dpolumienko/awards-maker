import { ownedAward } from '../../../utils/awards'
import { saveCeremony } from '../../../utils/ceremony'
import { ceremonySchema, parseOr400 } from '../../../utils/schema'
import { requireUser } from '../../../utils/users'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const award = await ownedAward(getRouterParam(event, 'slug') ?? '', user.id, user.role)
  const settings = parseOr400(ceremonySchema, await readBody(event), 'Invalid ceremony settings')
  await saveCeremony(award.id, settings)
  return { ok: true }
})
