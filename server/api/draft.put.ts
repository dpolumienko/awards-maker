import { draftFor, saveAward } from '../utils/awards'
import { awardInputSchema, parseOr400 } from '../utils/schema'
import { requireUser } from '../utils/users'

/** Autosave. The builder debounces; this just writes what it is given. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseOr400(awardInputSchema, await readBody(event), 'Invalid draft')
  const row = await draftFor(user.id, { name: user.name, platform: 'twitch' })
  await saveAward(row.id, input)
  return { ok: true }
})
