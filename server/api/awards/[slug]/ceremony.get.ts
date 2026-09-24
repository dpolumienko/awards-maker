import { awardBySlug } from '../../../utils/awards'
import { ceremonyFor } from '../../../utils/ceremony'

export default defineEventHandler(async (event) => {
  const award = await awardBySlug(getRouterParam(event, 'slug') ?? '')
  if (!award) throw createError({ statusCode: 404, statusMessage: 'No such awards' })
  return { ceremony: await ceremonyFor(award.id) }
})
