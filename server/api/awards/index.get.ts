import { awardSummaries } from '../../utils/awards'

/** The public catalog. Anonymous, cacheable, and the reason /catalog is SSR again. */
export default defineEventHandler(async () => ({
  awards: await awardSummaries(`a.status = 'published'`),
}))
