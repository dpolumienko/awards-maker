import { PLATFORM_NAMES } from '~/data/platforms'
import { clipSource } from '~/utils/clip'
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
  return yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : ''
}
