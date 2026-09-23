// Turning a clip link into something that plays inside our page.
//
// Kick - our own player. Streams Charts already plays Kick clips straight from
//   Kick's CDN as HLS, and so do we: `clips.kick.com/clips/<shard>/<id>/playlist.m3u8`,
//   with `thumbnail.webp` next to it as the poster. The CDN answers
//   `Access-Control-Allow-Origin: *` [V 2026-09-16], so it plays cross-origin.
//   A link copied from streamscharts.com/clips already carries the shard in the id
//   (`b5__clip_01M2H9...` -> shard `b5`), so nothing has to be fetched. A raw
//   kick.com clip link does not, and `kick.com/api/v2/clips/<id>` fills in the
//   rest - it answers from the browser [V 2026-09-16] and returns `clip_url` and
//   `thumbnail_url`. Kick has no documented clip embed at all: their help covers
//   the live player, and `player.kick.com/<channel>?clip=` ignores the parameter
//   and plays the live stream [V 2026-09-16].
// Twitch - the documented embed (https://dev.twitch.tv/docs/embed/video-and-clips/):
//   `clips.twitch.tv/embed?clip=<slug>&parent=<host>`, where `parent` is our host.
// YouTube - the standard `/embed/<id>`.
//
// Anything else gets no player, only the link out. Every modal keeps that link
// anyway, so a platform that changes its mind is never a dead end.

export type ClipSource = {
  platform: 'twitch' | 'kick' | 'youtube' | 'other'
  /** iframe src (Twitch, YouTube). */
  embed?: string
  /** HLS playlist we play ourselves (Kick). */
  hls?: string
  poster?: string
  /** Kick clip id, when the playlist still has to be resolved through the API. */
  kickId?: string
  /** Where the clip lives, always. */
  href: string
  label: string
}

const HOST_LABEL: Record<ClipSource['platform'], string> = {
  twitch: 'Twitch',
  kick: 'Kick',
  youtube: 'YouTube',
  other: 'the source',
}

const kickFromShard = (shard: string, id: string, href: string): ClipSource => ({
  platform: 'kick',
  hls: `https://clips.kick.com/clips/${shard}/${id}/playlist.m3u8`,
  poster: `https://clips.kick.com/clips/${shard}/${id}/thumbnail.webp`,
  href,
  label: HOST_LABEL.kick,
})

export function clipSource(rawUrl: string, parentHost?: string): ClipSource | null {
  const raw = rawUrl?.trim()
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')
  const parts = url.pathname.split('/').filter(Boolean)
  const parent = parentHost || (import.meta.client ? window.location.hostname : '')

  const twitchEmbed = (slug: string): ClipSource => ({
    platform: 'twitch',
    embed: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(slug)}&parent=${encodeURIComponent(parent)}&autoplay=false`,
    href: raw,
    label: HOST_LABEL.twitch,
  })

  // a link copied from our own clips page: platform, channel and a sharded id
  if (host === 'streamscharts.com' && parts[0] === 'clips') {
    const platform = url.searchParams.get('platform')
    const clip = url.searchParams.get('clip') || ''
    const [shard, id] = clip.includes('__') ? clip.split('__') : ['', clip]
    if (platform === 'kick' && id) {
      return shard
        ? kickFromShard(shard, id, raw)
        : { platform: 'kick', kickId: id, href: raw, label: HOST_LABEL.kick }
    }
    if (platform === 'twitch' && id) return twitchEmbed(id)
  }

  // twitch.tv/<channel>/clip/<slug> and clips.twitch.tv/<slug>
  if (host === 'twitch.tv' || host === 'm.twitch.tv' || host === 'clips.twitch.tv') {
    const slug = host === 'clips.twitch.tv' ? parts[0] : parts[1] === 'clip' ? parts[2] : undefined
    if (slug) return twitchEmbed(slug)
  }

  // kick.com/<channel>/clips/<id> - the shard comes from the API
  if (host === 'kick.com' && parts[1] === 'clips' && parts[2]) {
    return { platform: 'kick', kickId: parts[2], href: raw, label: HOST_LABEL.kick }
  }

  // youtube.com/watch?v=<id>, youtu.be/<id>, /shorts/<id>
  if (host === 'youtube.com' || host === 'youtu.be') {
    const id = host === 'youtu.be' ? parts[0] : url.searchParams.get('v') || (parts[0] === 'shorts' ? parts[1] : undefined)
    if (id) {
      return { platform: 'youtube', embed: `https://www.youtube.com/embed/${encodeURIComponent(id)}`, href: raw, label: HOST_LABEL.youtube }
    }
  }

  return { platform: 'other', href: raw, label: HOST_LABEL.other }
}

/** Fills in the playlist for a Kick clip we only know by id. */
export async function resolveKickClip(id: string): Promise<{ hls: string; poster?: string } | null> {
  try {
    const res = await fetch(`https://kick.com/api/v2/clips/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    const clip = data?.clip ?? data
    const hls = clip?.clip_url || clip?.video_url
    return hls ? { hls, poster: clip?.thumbnail_url } : null
  } catch {
    return null
  }
}
