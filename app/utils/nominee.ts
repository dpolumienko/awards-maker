import { fmtFollowers } from '~/data/channels.mock'
import type { Nominee } from '~/types/award'

// One place decides how a nominee reads, so the builder preview and the public
// ballot can never drift apart.
export const nomineeName = (n: Nominee) => (n.kind === 'channel' ? n.channel.name : n.text)

export const nomineeSub = (n: Nominee) =>
  n.kind === 'channel'
    ? `${fmtFollowers(n.channel.followers)} followers`
    : n.kind === 'media'
      ? n.image
        ? 'Image'
        : 'Clip'
      : 'Text nominee'

export const nomineeInitials = (n: Nominee) => nomineeName(n).slice(0, 2).toUpperCase()
