import { awardBySlug } from '../../../utils/awards'
import { queryOne } from '../../../utils/db'
import { ogCopy, renderOgCard } from '../../../utils/og-card'

/**
 * Rendering takes a few hundred milliseconds, and an unfurl often means several
 * crawlers asking at once, so the PNG is cached. As base64: Nitro's cache
 * storage holds JSON, and a Buffer does not survive the round trip.
 */
const cachedCard = defineCachedFunction(
  async (slug: string, siteUrl: string, _version: string) => {
    const award = await awardBySlug(slug)
    if (!award) return null

    const categories = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM nominations WHERE award_id = ?`, [award.id])
    const look = typeof award.look === 'string' ? JSON.parse(award.look || '{}') : (award.look ?? {})
    const png = await renderOgCard({ copy: ogCopy(award, Number(categories?.n ?? 0), siteUrl), look })
    return png.toString('base64')
  },
  {
    name: 'og-award',
    maxAge: 60 * 60,
    getKey: (slug: string, _site: string, version: string) => `${slug}:${version}`,
  },
)

/**
 * /og/a/<slug>.png - the link card of one published awards.
 *
 * The page asks for it with `?v=`, which changes when the show moves phase
 * (open, closed, winners out). An unfurl cache that keys on the URL picks the
 * new card up at once; one that ignores the query still gets a fresh copy
 * within the hour.
 */
export default defineEventHandler(async (event) => {
  const file = String(getRouterParam(event, 'file') ?? '')
  if (!file.endsWith('.png')) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const version = String(getQuery(event).v ?? '').slice(0, 40)
  const card = await cachedCard(file.slice(0, -'.png'.length), String(useSiteConfig(event).url), version)
  if (!card) throw createError({ statusCode: 404, statusMessage: 'No such awards' })

  setResponseHeader(event, 'Content-Type', 'image/png')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  return Buffer.from(card, 'base64')
})
