/** nuxt-auth-utils' default cookie name. */
const SESSION_COOKIE = 'nuxt-session'

const NEVER_CACHED = ['/api/', '/auth/', '/healthz']

/**
 * A page rendered for a signed-in host must not land in a shared cache where the
 * next anonymous visitor gets it. `Vary: Cookie` says so; `private, no-store`
 * says it again for the signed-in case, because a proxy that ignores Vary is a
 * proxy that serves one person's dashboard to everyone.
 */
export default defineEventHandler((event) => {
  const path = event.path || ''
  if (NEVER_CACHED.some((p) => path.startsWith(p))) {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    return
  }
  if (path.startsWith('/_nuxt/') || path.startsWith('/uploads/')) return

  const signedIn = Boolean(getCookie(event, SESSION_COOKIE))
  setResponseHeader(
    event,
    'Cache-Control',
    signedIn ? 'private, no-store' : 'public, max-age=0, s-maxage=600, stale-while-revalidate=60',
  )
  setResponseHeader(event, 'Vary', 'Cookie')
})
