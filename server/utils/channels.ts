import { CHANNELS } from '../../app/data/channels.mock'
import type { Channel } from '../../app/types/award'

/**
 * Channel lookup, shared by the builder's search and by publishing - one rule for
 * "this channel exists" (Ed, 2026-10-22: a channel that does not exist cannot be
 * nominated, and the check on publish is the one that enforces it).
 *
 * With STREAMS_CHARTS_CLIENT_ID and STREAMS_CHARTS_TOKEN set, a name is looked up
 * on each platform through the Streams Charts API (GET /api/v2/channels/{name}
 * ?platform=…, Client-ID and Token headers). The response is read defensively:
 * this was written without access to the API's own docs, so the field names below
 * are the likely ones, and anything missing leaves the channel out. Without the
 * keys the sample list of real channels answers.
 *
 * Every lookup costs credits, so answers are kept for ten minutes.
 */
const PLATFORMS = ['twitch', 'kick', 'youtube'] as const
const TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { at: number; channels: Channel[] }>()

const scKeys = () => {
  const { clientId, token } = useRuntimeConfig().streamsCharts
  return clientId && token ? { clientId: String(clientId), token: String(token) } : null
}

/** Channels matching a typed query: by name on every platform, or from the sample list. */
export async function findChannels(q: string): Promise<{ channels: Channel[]; source: 'streamscharts' | 'sample' }> {
  const keys = scKeys()
  if (!keys) {
    const s = q.toLowerCase()
    return { channels: CHANNELS.filter((c) => c.name.toLowerCase().includes(s)).slice(0, 6), source: 'sample' }
  }
  // a channel name is one token: "Kai Cenat" is looked up as "kaicenat"
  const name = q.toLowerCase().replace(/\s+/g, '')
  const hit = cache.get(name)
  if (hit && Date.now() - hit.at < TTL_MS) return { channels: hit.channels, source: 'streamscharts' }

  const found = await Promise.all(
    PLATFORMS.map(async (platform) => {
      try {
        const res = await $fetch<unknown>(`https://streamscharts.com/api/v2/channels/${encodeURIComponent(name)}`, {
          query: { platform },
          headers: { 'Client-ID': keys.clientId, Token: keys.token },
          timeout: 4000,
        })
        return readChannel(res, platform)
      } catch {
        // 404 is "no such channel on this platform"; anything else is treated the same
        return null
      }
    }),
  )
  const channels = found.filter((c): c is Channel => !!c)
  cache.set(name, { at: Date.now(), channels })
  return { channels, source: 'streamscharts' }
}

/** Whether this exact channel exists on this platform. */
export async function channelExists(name: string, platform: string): Promise<boolean> {
  const key = name.trim().toLowerCase().replace(/\s+/g, '')
  if (!key) return false
  const { channels } = await findChannels(name.trim())
  return channels.some((c) => c.platform === platform && c.name.toLowerCase().replace(/\s+/g, '') === key)
}

function readChannel(res: unknown, platform: Channel['platform']): Channel | null {
  const root = (res && typeof res === 'object' ? res : {}) as Record<string, unknown>
  const o = ((root.data && typeof root.data === 'object' ? root.data : root) ?? {}) as Record<string, unknown>
  const pick = (...keys: string[]) => keys.map((k) => o[k]).find((v) => v !== undefined && v !== null && v !== '')
  const name = pick('display_name', 'displayName', 'name', 'channel_name', 'username', 'login')
  if (typeof name !== 'string') return null
  const stats = (o.stats && typeof o.stats === 'object' ? o.stats : {}) as Record<string, unknown>
  const followers = Number(pick('followers', 'followers_count', 'followersCount') ?? stats.followers ?? 0)
  // the platform's own picture: Streams Charts' when it sends one, else our proxy
  // that reads it from the platform (api/channel-avatar.get.ts)
  const pic = pick('avatar', 'avatar_url', 'avatarUrl', 'profile_image_url', 'profile_pic', 'logo', 'image', 'thumbnail')
  const avatar = typeof pic === 'string' && /^https:\/\//.test(pic) ? pic : `/api/channel-avatar?platform=${platform}&name=${encodeURIComponent(name)}`
  return {
    id: `sc-${platform}-${String(pick('id', 'channel_id') ?? name).toLowerCase()}`,
    name,
    platform,
    followers: Number.isFinite(followers) ? followers : 0,
    live: Boolean(pick('is_live', 'live', 'online')),
    avatar,
  }
}
