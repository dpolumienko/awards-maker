/**
 * A channel's own avatar, from the platform it streams on (Ed, 2026-10-22: the
 * nominees' pictures come from the streaming platforms, not initials).
 *
 * Used when the Streams Charts answer carries no avatar of its own. The visitor's
 * browser only ever talks to us, as with partner-icon: Kick is read from its public
 * channel API, Twitch and YouTube through unavatar.io, which resolves a channel name
 * to its profile picture. The outbound hosts are fixed and the name is checked, so a
 * request cannot steer this server anywhere else. Unknown channels answer 404 and
 * the page falls back to initials.
 */
import { createHash } from 'node:crypto'

const NAME = /^[a-z0-9_.-]{2,60}$/i
/** md5 of unavatar's stand-in images for unknown channels (the platform logos) */
const NOT_FOUND = new Set(['2f24198d9412386b8b9f39726f107c92'])
const PLATFORMS = ['twitch', 'kick', 'youtube'] as const
type Platform = (typeof PLATFORMS)[number]

async function kickPic(name: string): Promise<string> {
  const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(name)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(4000),
  }).catch(() => null)
  if (!res?.ok) return ''
  const j = (await res.json().catch(() => null)) as { user?: { profile_pic?: string } } | null
  const url = j?.user?.profile_pic ?? ''
  return /^https:\/\/[^/]*kick\.com\//.test(url) ? url : ''
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const name = String(q.name ?? '').replace(/\s+/g, '')
  const platform = String(q.platform ?? '') as Platform
  if (!NAME.test(name) || !PLATFORMS.includes(platform)) throw createError({ statusCode: 400, statusMessage: 'Bad channel' })

  const src =
    platform === 'kick'
      ? await kickPic(name)
      : `https://unavatar.io/${platform}/${encodeURIComponent(name)}?fallback=false`
  if (!src) throw createError({ statusCode: 404, statusMessage: 'No avatar' })

  const res = await fetch(src, { signal: AbortSignal.timeout(5000) }).catch(() => null)
  const type = res?.headers.get('content-type') ?? ''
  const body = res?.ok && type.startsWith('image/') ? new Uint8Array(await res.arrayBuffer()) : null
  // for a channel that does not exist unavatar answers with the platform's logo
  // instead of a 404 (fallback=false is ignored) - that is not an avatar
  if (!body?.length || NOT_FOUND.has(createHash('md5').update(body).digest('hex'))) throw createError({ statusCode: 404, statusMessage: 'No avatar' })

  setHeader(event, 'Content-Type', type)
  setHeader(event, 'Cache-Control', 'public, max-age=86400')
  return body
})
