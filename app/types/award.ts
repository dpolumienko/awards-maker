export type Platform = 'twitch' | 'kick' | 'youtube'

export interface Channel {
  id: string
  name: string
  platform: Platform
  followers: number
  /** Live right now - the strongest signal that this is a streaming product. */
  live?: boolean
  /** What they are streaming, shown next to a live channel. */
  game?: string
}

/**
 * A nominee is a channel from the Streams Charts database, plain text, or - on the
 * paid tier - an image or a clip. That last one carries a name plus one source:
 * a file the streamer uploaded (`image`) or a link to a clip (`url`).
 */
export type Nominee =
  | { id: string; kind: 'channel'; channel: Channel }
  | { id: string; kind: 'text'; text: string }
  | { id: string; kind: 'media'; text: string; url?: string; image?: string }

/** Paid: the page carries the streamer's own look instead of the standard one. */
export interface AwardLook {
  theme?: string
  accent?: string
  font?: string
  coverUrl?: string
  logoUrl?: string
}

export interface Nomination {
  id: string
  title: string
  nominees: Nominee[]
}

export interface Partner {
  id: string
  name: string
  url: string
}

export interface Award {
  slug: string
  /** Which ready-made set this started from, so the builder can show it as chosen. */
  templateId?: string
  name: string
  description: string
  opensAt: string
  closesAt: string
  ceremonyAt: string
  nominations: Nomination[]
  partners: Partner[]
  look: AwardLook
  host: { name: string; platform: Platform }
  publishedAt?: string
}

/**
 * Free plan, release 1. Numbers come from knowledge/streamer_awards.md and live
 * in shared/ because the API enforces the same ones - a limit that only the
 * builder knows about is a limit a POST walks straight past.
 *
 * Nothing here is a hard stop in the builder: paid features stay usable and get
 * marked, and the choice between upgrading and stripping them happens at publish.
 */
export { FIELD, FREE, PUBLISH } from '#shared/limits'
