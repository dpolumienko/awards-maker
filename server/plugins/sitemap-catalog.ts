import { catalogStatus } from '../utils/catalog'

/**
 * /catalog redirects home until CATALOG.minAwards shows are published, and a
 * redirecting URL in a sitemap is a crawl error. It is taken out here rather
 * than with the module's `exclude`, which is static and would keep it out after
 * the catalog opens.
 */
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('sitemap:resolved', async (ctx) => {
    // the static demo has no database to ask; its sitemap is never crawled anyway
    if (useRuntimeConfig().public.demo) return
    if ((await catalogStatus()).open) return
    ctx.urls = ctx.urls.filter((u) => {
      const loc = typeof u === 'string' ? u : u.loc
      return new URL(String(loc), 'http://x').pathname.replace(/\/$/, '') !== '/catalog'
    })
  })
})
