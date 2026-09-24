import { draftFor, hydrate } from '../utils/awards'
import { requireUser } from '../utils/users'

/**
 * The one open draft this host has, created empty the first time they ask. The
 * builder used to keep it in localStorage, which meant it was tied to a browser
 * rather than to a person.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const row = await draftFor(user.id, { name: user.name, platform: 'twitch' })
  return { draft: await hydrate(row) }
})
