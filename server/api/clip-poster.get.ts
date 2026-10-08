import { clipSource } from '../../app/utils/clip'

/**
 * The frame of a Twitch clip, for previews on the ballot, in the builder and on
 * the ceremony slides (review 2026-10-06: clips had no preview, images did).
 *
 * Twitch publishes no thumbnail address a page could build - the clip page's
 * og:image is the Twitch logo - so it is asked through Helix,
 * GET /helix/clips?id=<slug> (https://dev.twitch.tv/docs/api/reference/#get-clips),
 * with an app token from the same Twitch application the sign-in uses
 * (client credentials). Answers with a redirect to Twitch's own CDN; the slug's
 * frame and the token are both kept in memory.
 */
const DAY = 24 * 60 * 60 * 1000
const frames = new Map<string, { url: string; at: number }>()
let token: { value: string; until: number } | null = null

async function appToken(clientId: string, clientSecret: string): Promise<string> {
  if (token && token.until > Date.now()) return token.value
  const res = await $fetch<{ access_token: string; expires_in: number }>('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    query: { client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' },
  })
  token = { value: res.access_token, until: Date.now() + (res.expires_in - 300) * 1000 }
  return token.value
}

export default defineEventHandler(async (event) => {
  const clip = clipSource(String(getQuery(event).url ?? ''), 'localhost')
  const slug = clip?.platform === 'twitch' ? new URL(clip.embed!).searchParams.get('clip') : null
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Not a Twitch clip' })

  const cached = frames.get(slug)
  if (cached && Date.now() - cached.at < DAY) return sendRedirect(event, cached.url, 302)

  const { clientId, clientSecret } = useRuntimeConfig().oauth?.twitch ?? {}
  if (!clientId || !clientSecret) throw createError({ statusCode: 404, statusMessage: 'No Twitch app' })
  try {
    const res = await $fetch<{ data: { thumbnail_url: string }[] }>('https://api.twitch.tv/helix/clips', {
      query: { id: slug },
      headers: { 'Client-Id': clientId, Authorization: `Bearer ${await appToken(clientId, clientSecret)}` },
    })
    const url = res.data?.[0]?.thumbnail_url
    if (!url) throw new Error('no clip')
    frames.set(slug, { url, at: Date.now() })
    setHeader(event, 'Cache-Control', 'public, max-age=86400')
    return sendRedirect(event, url, 302)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'No frame' })
  }
})
