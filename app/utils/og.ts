/**
 * Absolute URL of a share card in `public/og/`.
 *
 * og:image has to be absolute: crawlers fetch it without the page's base, and a
 * relative path silently unfurls into nothing. The base comes from the site
 * config, so the subdomain decision changes it in one place.
 */
export const ogCard = (name: string) => `${useSiteConfig().url}/og/${name}.png`

/**
 * The server-drawn link card of one published awards (server/routes/og/a).
 *
 * `v` is the show's phase at render time, so the card URL changes when voting
 * opens, closes or the winners go out - X and Discord key their unfurl cache
 * on the URL and would otherwise keep showing "Vote now" after the ceremony.
 *
 * Takes the site URL rather than reading it: useSeoMeta calls its getters
 * outside the component's setup, where useSiteConfig() has no Nuxt instance.
 */
export const awardOgImage = (siteUrl: string, slug: string, phase: string, publishedAt?: string) =>
  `${siteUrl}/og/a/${encodeURIComponent(slug)}.png?v=${phase}-${
    publishedAt ? new Date(publishedAt).getTime().toString(36) : '0'
  }`
