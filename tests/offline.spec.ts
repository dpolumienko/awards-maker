import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../server/utils/awards', () => ({ awardBySlug: vi.fn(), hydrate: vi.fn(async () => ({ name: 'Chat Awards' })) }))
vi.mock('../server/utils/votes', () => ({ ballotFor: vi.fn(async () => null), tallyFor: vi.fn(async () => ({ voters: 3 })) }))
vi.mock('../server/utils/users', () => ({ currentUser: vi.fn() }))

vi.stubGlobal('defineEventHandler', (h: (e: unknown) => unknown) => h)
vi.stubGlobal('getRouterParam', () => 'chat-awards-2026')
vi.stubGlobal('createError', (o: { statusCode: number; statusMessage?: string }) => Object.assign(new Error(o.statusMessage ?? 'error'), o))

const { awardBySlug } = await import('../server/utils/awards')
const { currentUser } = await import('../server/utils/users')
const handler = (await import('../server/api/awards/[slug].get')).default as (e: unknown) => Promise<{ isHost: boolean }>

const show = (offline: boolean) => ({ id: 1, owner_id: 9, results_at: null, offline_at: offline ? '2026-10-08 10:00:00' : null })

describe('GET /api/awards/:slug for a show taken offline', () => {
  beforeEach(() => vi.clearAllMocks())

  it('answers its host', async () => {
    vi.mocked(awardBySlug).mockResolvedValue(show(true) as never)
    vi.mocked(currentUser).mockResolvedValue({ id: 9, role: 'user' } as never)
    expect((await handler({})).isHost).toBe(true)
    expect(awardBySlug).toHaveBeenCalledWith('chat-awards-2026', 'host')
  })

  it('is a 404 to everybody else', async () => {
    vi.mocked(awardBySlug).mockResolvedValue(show(true) as never)
    vi.mocked(currentUser).mockResolvedValue({ id: 5, role: 'user' } as never)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
    vi.mocked(currentUser).mockResolvedValue(null as never)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
  })

  it('stays open to everybody while online', async () => {
    vi.mocked(awardBySlug).mockResolvedValue(show(false) as never)
    vi.mocked(currentUser).mockResolvedValue(null as never)
    expect((await handler({})).isHost).toBe(false)
  })
})
