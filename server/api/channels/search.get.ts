import { CHANNELS } from '../../../app/data/channels.mock'
import type { Channel } from '../../../app/types/award'

/**
 * Nominee search in the builder (review 2026-09-25: search the Streams Charts
 * channel base, not a sample list).
 *
 * With STREAMS_CHARTS_CLIENT_ID and STREAMS_CHARTS_TOKEN set, the query is
 * looked up as a channel on each platform through the Streams Charts API
 * (GET /api/v2/channels/{name}?platform=…, Client-ID and Token headers). The
 * response is read defensively: this was written without access to the API's
 * own docs, so the field names below are the likely ones, and anything missing
 * leaves the channel out rather than breaking the list. Without the keys the
 * sample channels answer, as before.
 *
 * Every lookup costs credits, so answers are kept for ten minutes.
 */
const PLATFORMS = ['twitch', 'kick', 'youtube'] as const
const TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { at: number; channels: Channel[] }>()

export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q ?? '').trim()
  if (q.length < 2 || q.length > 50) return { channels: [], source: 'none' }

  const { clientId, token } = useRuntimeConfig().streamsCharts
  if (!clientId || !token) {
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
          headers: { 'Client-ID': String(clientId), Token: String(token) },
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
})

function readChannel(res: unknown, platform: Channel['platform']): Channel | null {
  const root = (res && typeof res === 'object' ? res : {}) as Record<string, unknown>
  const o = ((root.data && typeof root.data === 'object' ? root.data : root) ?? {}) as Record<string, unknown>
  const pick = (...keys: string[]) => keys.map((k) => o[k]).find((v) => v !== undefined && v !== null && v !== '')
  const name = pick('display_name', 'displayName', 'name', 'channel_name', 'username', 'login')
  if (typeof name !== 'string') return null
  const stats = (o.stats && typeof o.stats === 'object' ? o.stats : {}) as Record<string, unknown>
  const followers = Number(pick('followers', 'followers_count', 'followersCount') ?? stats.followers ?? 0)
  return {
    id: `sc-${platform}-${String(pick('id', 'channel_id') ?? name).toLowerCase()}`,
    name,
    platform,
    followers: Number.isFinite(followers) ? followers : 0,
    live: Boolean(pick('is_live', 'live', 'online')),
  }
}
