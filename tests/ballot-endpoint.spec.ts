import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../server/utils/awards', () => ({ awardBySlug: vi.fn() }))
vi.mock('../server/utils/votes', () => ({
  castBallot: vi.fn(),
  AlreadyVoted: class AlreadyVoted extends Error {},
}))
vi.mock('../server/utils/users', () => ({ requireUser: vi.fn() }))
vi.mock('../server/utils/db', () => ({ queryOne: vi.fn() }))

vi.stubGlobal('defineEventHandler', (h: (e: unknown) => unknown) => h)
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('getRouterParam', () => 'chat-awards-2026')
vi.stubGlobal('createError', (o: { statusCode: number; statusMessage?: string }) =>
  Object.assign(new Error(o.statusMessage ?? 'error'), o),
)

const { awardBySlug } = await import('../server/utils/awards')
const { castBallot, AlreadyVoted } = await import('../server/utils/votes')
const { requireUser } = await import('../server/utils/users')
const { queryOne } = await import('../server/utils/db')
const handler = (await import('../server/api/awards/[slug]/ballot.post')).default as (
  e: unknown,
) => Promise<unknown>

// as mysql2 hands a DATETIME back (UTC, dateStrings)
const dbAt = (ms: number) => new Date(Date.now() + ms).toISOString().slice(0, 19).replace('T', ' ')
const tomorrow = dbAt(86_400_000)
const yesterday = dbAt(-86_400_000)

const openAward = {
  id: 1,
  owner_id: 9,
  tier: 'paid' as const,
  opens_at: yesterday,
  closes_at: tomorrow,
  closed_at: null,
}

describe('POST /api/awards/:slug/ballot', () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset().mockResolvedValue({ id: 7 } as never)
    vi.mocked(readBody as never).mockReset().mockResolvedValue({ picks: { '10': '20' } })
    vi.mocked(awardBySlug).mockReset().mockResolvedValue(openAward as never)
    vi.mocked(castBallot).mockReset().mockResolvedValue({ picks: 1 })
    vi.mocked(queryOne).mockReset().mockResolvedValue({ n: 0 } as never)
  })

  it('propagates the 401 for an anonymous caller', async () => {
    const err = Object.assign(new Error('Sign in first'), { statusCode: 401 })
    vi.mocked(requireUser).mockRejectedValue(err)
    await expect(handler({})).rejects.toBe(err)
    expect(castBallot).not.toHaveBeenCalled()
  })

  it('rejects a body that is not a map of numeric ids', async () => {
    vi.mocked(readBody as never).mockResolvedValue({ picks: { cat: 'not-a-number' } })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(castBallot).not.toHaveBeenCalled()
  })

  it('404s when the slug does not resolve', async () => {
    vi.mocked(awardBySlug).mockResolvedValue(null)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
  })

  it('refuses once the host has closed voting', async () => {
    vi.mocked(awardBySlug).mockResolvedValue({ ...openAward, closed_at: '2026-01-01 00:00:00' } as never)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
    expect(castBallot).not.toHaveBeenCalled()
  })

  it('refuses after the closing date', async () => {
    vi.mocked(awardBySlug).mockResolvedValue({ ...openAward, closes_at: yesterday } as never)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
  })

  it('closes at the hour the host set, not at the end of that day', async () => {
    vi.mocked(awardBySlug).mockResolvedValue({ ...openAward, closes_at: dbAt(-3_600_000) } as never)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
  })

  it('opens at the hour the host set, not at the start of that day', async () => {
    vi.mocked(awardBySlug).mockResolvedValue({ ...openAward, opens_at: dbAt(3_600_000) } as never)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
  })

  it('refuses before the opening date', async () => {
    vi.mocked(awardBySlug).mockResolvedValue({ ...openAward, opens_at: tomorrow } as never)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
  })

  it('turns a second ballot from the same person into a 409', async () => {
    vi.mocked(castBallot).mockRejectedValue(new AlreadyVoted())
    await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
  })

  it('stops a free show at its voter ceiling', async () => {
    vi.mocked(awardBySlug).mockResolvedValue({ ...openAward, tier: 'free' } as never)
    vi.mocked(queryOne).mockResolvedValue({ n: 200 } as never)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
    expect(castBallot).not.toHaveBeenCalled()
  })

  it('casts the ballot for the session user, never for an id from the body', async () => {
    const result = await handler({})
    expect(castBallot).toHaveBeenCalledWith(1, 7, { '10': '20' })
    expect(result).toEqual({ picks: 1 })
  })
})
