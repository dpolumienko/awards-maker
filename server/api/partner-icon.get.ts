/**
 * A partner's icon, for the chips on an awards page (review 2026-10-06: Streams
 * Charts showed a bare "S" - its /favicon.ico is an empty file and the real one
 * sits on another host, named in a <link rel="icon"> a browser cannot read
 * cross-origin).
 *
 * Fetched here from DuckDuckGo's icon service, which follows those links, by
 * host name only. The visitor's browser only ever talks to us, and the one
 * outbound address is fixed, so a host name cannot steer this server anywhere
 * else. Unknown sites answer 404 and the chip falls back to the initial.
 */
const HOST = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

export default defineEventHandler(async (event) => {
  const host = String(getQuery(event).host ?? '').toLowerCase()
  if (!HOST.test(host)) throw createError({ statusCode: 400, statusMessage: 'Not a host name' })

  const res = await fetch(`https://icons.duckduckgo.com/ip3/${host}.ico`, { signal: AbortSignal.timeout(4000) }).catch(() => null)
  const body = res?.ok ? new Uint8Array(await res.arrayBuffer()) : null
  if (!body?.length) throw createError({ statusCode: 404, statusMessage: 'No icon' })

  setHeader(event, 'Content-Type', res!.headers.get('content-type') || 'image/x-icon')
  setHeader(event, 'Cache-Control', 'public, max-age=604800')
  return body
})
