import { awardSummaries } from '../../utils/awards'
import { PUBLISH } from '#shared/limits'

/**
 * Award pages in the sitemap. There was no dynamic source before - the module
 * only ever saw the static routes - so the pages the catalog exists to promote
 * were the ones missing from it.
 *
 * The indexing bar is the publishing bar: a show below it is thin, and a thin
 * page in a sitemap is a page that drags the rest down. Anything trading on the
 * name of the show we do not own stays out too.
 */
export default defineSitemapEventHandler(async () => {
  const awards = await awardSummaries(`a.status = 'published'`)
  return awards
    .filter((a) => a.categories >= PUBLISH.minNominations && !/streamer\s+awards/i.test(a.name))
    .map((a) => ({
      loc: `/a/${a.slug}`,
      lastmod: a.resultsAt ?? a.publishedAt,
      changefreq: a.resultsAt ? ('monthly' as const) : ('daily' as const),
    }))
})
