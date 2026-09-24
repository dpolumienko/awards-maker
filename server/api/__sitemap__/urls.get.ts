import { isIndexable } from '#shared/indexable'
import { fromDbDateTime } from '#shared/time'
import { query } from '../../utils/db'

/**
 * Award pages in the sitemap - exactly the ones whose page says index, by the
 * same rule (shared/indexable.ts). One query: the category count and the
 * smallest category are aggregated here rather than hydrating every show.
 */
export default defineSitemapEventHandler(async () => {
  const rows = await query<{
    slug: string
    name: string
    description: string
    published_at: string | null
    results_at: string | null
    categories: number | null
    min_nominees: number | null
  }>(
    `SELECT a.slug, a.name, a.description, a.published_at, a.results_at,
            s.categories, s.min_nominees
       FROM awards a
       LEFT JOIN (
         SELECT award_id, COUNT(*) AS categories, MIN(nominees) AS min_nominees
           FROM (SELECT m.award_id, COUNT(n.id) AS nominees
                   FROM nominations m LEFT JOIN nominees n ON n.nomination_id = m.id
                  GROUP BY m.award_id, m.id) per_category
          GROUP BY award_id
       ) s ON s.award_id = a.id
      WHERE a.status = 'published'`,
  )
  return rows
    .filter((r) =>
      isIndexable({
        name: r.name,
        description: r.description,
        categories: Number(r.categories ?? 0),
        minNominees: Number(r.min_nominees ?? 0),
      }),
    )
    .map((r) => ({
      loc: `/a/${r.slug}`,
      // W3C dates only - the module drops a MySQL DATETIME string silently
      lastmod: fromDbDateTime(r.results_at ?? r.published_at) || undefined,
      changefreq: r.results_at ? ('monthly' as const) : ('daily' as const),
    }))
})
