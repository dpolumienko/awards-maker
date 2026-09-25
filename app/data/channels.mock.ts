import type { Channel } from '~/types/award'

// Stand-in for the Streams Charts channel search until the API is wired.
export const CHANNELS: Channel[] = [
  { id: 'c1', name: 'ishowspeed', platform: 'youtube', followers: 41_200_000, live: true, game: 'Just Chatting' },
  { id: 'c2', name: 'maryana', platform: 'twitch', followers: 98_400 },
  { id: 'c3', name: 'dzvin_tv', platform: 'kick', followers: 88_100, live: true, game: 'Counter-Strike 2' },
  { id: 'c4', name: 'n1ghtowl', platform: 'twitch', followers: 41_900 },
  { id: 'c5', name: 'pixelpete', platform: 'youtube', followers: 402_000, live: true, game: 'Minecraft' },
  { id: 'c6', name: 'sofi_x', platform: 'twitch', followers: 27_300 },
  { id: 'c7', name: 'ka1ra', platform: 'kick', followers: 15_800, live: true, game: 'IRL' },
  { id: 'c8', name: 'lvivlurker', platform: 'twitch', followers: 9_200 },
  { id: 'c9', name: 'hrytsko', platform: 'youtube', followers: 133_000 },
  { id: 'c10', name: 'mel0dy', platform: 'twitch', followers: 64_700, live: true, game: 'Music' },
  { id: 'c11', name: 'stinkyrat', platform: 'kick', followers: 51_200 },
  { id: 'c12', name: 'vika_plays', platform: 'twitch', followers: 188_000, live: true, game: 'Valorant' },
  { id: 'c13', name: 'nazar_speed', platform: 'youtube', followers: 76_500 },
  { id: 'c14', name: 'kolya', platform: 'twitch', followers: 12_400 },
  { id: 'c15', name: 'dmytro_irl', platform: 'kick', followers: 33_600 },
  { id: 'c16', name: 'lampa', platform: 'twitch', followers: 5_700 },
  { id: 'c17', name: 'quietkeys', platform: 'youtube', followers: 240_000, live: true, game: 'Elden Ring' },
  { id: 'c18', name: 'borshchgod', platform: 'twitch', followers: 71_800 },
  { id: 'c19', name: 'tinyraid', platform: 'kick', followers: 4_300 },
  { id: 'c20', name: 'oksana_fps', platform: 'twitch', followers: 155_000 },
]

export function searchChannels(q: string, limit = 6): Channel[] {
  const s = q.trim().toLowerCase()
  if (!s) return []
  return CHANNELS.filter((c) => c.name.toLowerCase().includes(s)).slice(0, limit)
}

export const fmtFollowers = (n: number) =>
  n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}M` : n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n)
