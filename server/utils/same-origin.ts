import { getRequestHeader, getRequestHost } from 'h3'
import type { H3Event } from 'h3'

// Ported from streamawards. Imported from h3 explicitly rather than relying on
// the auto-import so the unit tests can call it with a hand-made event.

export function requestOrigin(event: H3Event): string | null {
  const origin = getRequestHeader(event, 'origin')
  if (origin) return origin
  const referer = getRequestHeader(event, 'referer')
  if (!referer) return null
  try {
    return new URL(referer).origin
  } catch {
    return null
  }
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).host
  } catch {
    return null
  }
}

/**
 * The endpoints that carry a session do not need this: the cookie is SameSite=Lax
 * and a browser will not attach it to a cross-site POST. Reports accept an
 * anonymous submission on purpose, so they have no cookie to lean on and the
 * origin is checked directly.
 */
export function isSameOriginRequest(event: H3Event, siteUrl: string): boolean {
  const origin = requestOrigin(event)
  if (!origin) return false
  const originHost = hostOf(origin)
  if (!originHost) return false

  const allowed = new Set<string>()
  // xForwardedHost so a proxied deployment compares against the public host the
  // browser actually used, not the container name nginx talks to.
  const requestHost = getRequestHost(event, { xForwardedHost: true })
  if (requestHost) allowed.add(requestHost)
  const siteHost = hostOf(siteUrl)
  if (siteHost) allowed.add(siteHost)

  return allowed.has(originHost)
}
