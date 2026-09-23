/**
 * Absolute URL of a share card in `public/og/`.
 *
 * og:image has to be absolute: crawlers fetch it without the page's base, and a
 * relative path silently unfurls into nothing. The base comes from the site
 * config, so the subdomain decision changes it in one place.
 */
export const ogCard = (name: string) => `${useSiteConfig().url}/og/${name}.png`
