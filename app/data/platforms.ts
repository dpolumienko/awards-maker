// Platform colours in one place: Tailwind reads them for the `twitch` / `kick` /
// `youtube` tokens, components read them when a colour has to be inline.
export const PLATFORM_COLORS = {
  twitch: '#9147FF',
  kick: '#53FC18',
  youtube: '#FF4E45',
} as const

export const PLATFORM_NAMES = {
  twitch: 'Twitch',
  kick: 'Kick',
  youtube: 'YouTube',
} as const

export type PlatformId = keyof typeof PLATFORM_COLORS
