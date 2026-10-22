import { PLATFORM_NAMES } from '~/data/platforms'
import { clipSource } from '~/utils/clip'
import { asset } from '~/utils/asset'
import type { Nominee } from '~/types/award'

// One place decides how a nominee reads, so the builder preview and the public
// ballot can never drift apart.
export const nomineeName = (n: Nominee) => (n.kind === 'channel' ? n.channel.name : n.text)

// A channel reads as its platform, not a follower count: channel search still
// runs on a demo list (data/channels.mock.ts), and its invented numbers were
// being saved with the nominee and shown on public ballots (QA P1). Follower
// counts come back when search reads Streams Charts.
export const nomineeSub = (n: Nominee) =>
  n.kind === 'channel'
    ? `${PLATFORM_NAMES[n.channel.platform] ?? 'Twitch'} channel`
    : n.kind === 'media'
      ? n.image
        ? 'Image'
        : 'Clip'
      : 'Text nominee'

export const nomineeInitials = (n: Nominee) => nomineeName(n).slice(0, 2).toUpperCase()

/** A nominee without a picture gets its own colour behind its initials, the same on every visit. */
export function nomineeTint(n: Nominee) {
  let h = 0
  for (const ch of nomineeName(n)) h = (h * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${h} 55% 32%)`
}

/**
 * The picture that stands for a nominee: an uploaded image, or the poster frame
 * of the clip. Channels and plain text have none - those fall back to initials.
 *
 * A ceremony slide showing "12" where the host put a clip is the screen telling
 * the audience nothing.
 */
export function nomineeImage(n: Nominee): string {
  if (n.kind !== 'media') return ''
  if (n.image) return n.image
  if (!n.url) return ''
  // clipSource returns null for anything it cannot parse, and a nominee whose
  // link is a typo used to throw right here and take the page with it.
  const clip = clipSource(n.url)
  if (!clip) return ''
  if (clip.poster) return clip.poster
  // YouTube publishes a thumbnail for every video id at a fixed address
  const yt = /youtube\.com\/embed\/([\w-]+)/.exec(clip.embed ?? '')
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`
  // Twitch only tells its API, which our server asks (server/api/clip-poster);
  // the static demo has no server - NomineeThumb shows the embed there instead
  return clip.platform === 'twitch' && !isDemo() ? `/api/clip-poster?url=${encodeURIComponent(n.url)}` : ''
}

function isDemo(): boolean {
  try {
    return !!useRuntimeConfig().public.demo
  } catch {
    return false
  }
}

/**
 * A channel's picture: the avatar it was saved with, or else the platform's own,
 * read through our proxy (server/api/channel-avatar) - Ed, 2026-10-22: nominee
 * pictures come from the streaming platforms, also for shows saved before that.
 */
export function channelAvatar(ch: { name: string; platform: string; avatar?: string }): string {
  if (ch.avatar) return asset(ch.avatar)
  return asset(`/api/channel-avatar?platform=${ch.platform}&name=${encodeURIComponent(ch.name)}`)
}

/** When a picture cannot load: the initials, drawn as a small SVG in its place. */
export function avatarFallback(e: Event, name: string) {
  const img = e.target as HTMLImageElement
  if (img.dataset.fallback) return
  img.dataset.fallback = '1'
  const t = name.slice(0, 2).toUpperCase().replace(/[<&>"]/g, '')
  img.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#2A2A27"/><text x="20" y="25" text-anchor="middle" font-family="Hanken Grotesk,Arial,sans-serif" font-size="14" font-weight="700" fill="#F6F4EE">${t}</text></svg>`)}`
}
