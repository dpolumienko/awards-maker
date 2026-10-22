import type { Channel } from '~/types/award'

// Stand-in for the Streams Charts channel search until the API is wired: real
// channels only, each with its own avatar (Ed, 2026-10-22: nothing invented can be nominated).
export const CHANNELS: Channel[] = [
  // real channels with their own avatars (Ed, 2026-10-22), so the demo search finds the names people type
  { id: 'r1', name: 'xQc', platform: 'kick', followers: 1400000, avatar: '/img/avatars/kick-xqc.webp' },
  { id: 'r2', name: 'kaicenat', platform: 'twitch', followers: 14000000, avatar: '/img/avatars/twitch-kaicenat.webp' },
  { id: 'r3', name: 'pokimane', platform: 'twitch', followers: 9300000, avatar: '/img/avatars/twitch-pokimane.webp' },
  { id: 'r4', name: 'HasanAbi', platform: 'twitch', followers: 2900000, avatar: '/img/avatars/twitch-hasanabi.webp' },
  { id: 'r5', name: 'jynxzi', platform: 'twitch', followers: 7800000, avatar: '/img/avatars/twitch-jynxzi.webp' },
  { id: 'r6', name: 'caseoh_', platform: 'twitch', followers: 5100000, avatar: '/img/avatars/twitch-caseoh_.webp' },
  { id: 'r7', name: 'zackrawrr', platform: 'twitch', followers: 2000000, avatar: '/img/avatars/twitch-zackrawrr.webp' },
  { id: 'r8', name: 'ohnePixel', platform: 'twitch', followers: 1900000, avatar: '/img/avatars/twitch-ohnepixel.webp' },
  { id: 'r9', name: 'shroud', platform: 'twitch', followers: 11000000, avatar: '/img/avatars/twitch-shroud.webp' },
  { id: 'r10', name: 'Ibai', platform: 'twitch', followers: 19000000, avatar: '/img/avatars/twitch-ibai.webp' },
  { id: 'r11', name: 'TheGrefg', platform: 'twitch', followers: 12000000, avatar: '/img/avatars/twitch-thegrefg.webp' },
  { id: 'r12', name: 'auronplay', platform: 'twitch', followers: 17000000, avatar: '/img/avatars/twitch-auronplay.webp' },
  { id: 'r13', name: 'Gaules', platform: 'twitch', followers: 4400000, avatar: '/img/avatars/twitch-gaules.webp' },
  { id: 'r14', name: 'tarik', platform: 'twitch', followers: 3600000, avatar: '/img/avatars/twitch-tarik.webp' },
  { id: 'r15', name: 'Adin Ross', platform: 'kick', followers: 1900000, avatar: '/img/avatars/kick-adinross.webp' },
  { id: 'r16', name: 'Westcol', platform: 'kick', followers: 3000000, avatar: '/img/avatars/kick-westcol.webp' },
  { id: 'r17', name: 'IShowSpeed', platform: 'youtube', followers: 40000000, avatar: '/img/avatars/youtube-ishowspeed.webp' },
]

export function searchChannels(q: string, limit = 6): Channel[] {
  const s = q.trim().toLowerCase()
  if (!s) return []
  return CHANNELS.filter((c) => c.name.toLowerCase().includes(s)).slice(0, limit)
}

export const fmtFollowers = (n: number) =>
  n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}M` : n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n)

/** Whether a channel is one of the real ones above - the demo's stand-in for "exists". */
export const isListedChannel = (c: { name: string; platform: string }) =>
  CHANNELS.some((x) => x.platform === c.platform && x.name.toLowerCase() === c.name.trim().toLowerCase())
