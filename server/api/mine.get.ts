import { awardSummaries } from '../utils/awards'
import { requireUser } from '../utils/users'

/** The host's own shows, drafts included - this is their workspace, not a feed. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { awards: await awardSummaries(`a.owner_id = ?`, [user.id]) }
})
