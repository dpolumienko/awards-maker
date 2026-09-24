/**
 * Deliberately touches no data source. The container healthcheck reads this, and
 * a MySQL outage must not get the app killed and restart-looped on top of it.
 *
 * What it does check is configuration that would be silently wrong in
 * production: a site URL that is not the public https host puts localhost into
 * every canonical, the sitemap, robots.txt and each og:image (SEO audit,
 * 2026-09-24). Failing here stops deploy.sh instead of shipping that.
 */
export default defineEventHandler((event) => {
  const url = String(useSiteConfig(event).url || '')
  const production = process.env.NODE_ENV === 'production'
  if (production && !/^https:\/\/(?!localhost|127\.)/.test(url)) {
    setResponseStatus(event, 503)
    return { status: 'misconfigured', reason: `NUXT_PUBLIC_SITE_URL must be the public https host, got "${url}"` }
  }
  return { status: 'ok', uptime: Math.round(process.uptime()) }
})
