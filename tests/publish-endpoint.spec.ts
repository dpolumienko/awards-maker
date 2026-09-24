import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../server/utils/awards', () => ({
  draftFor: vi.fn(),
  freeSlug: vi.fn(),
  hydrate: vi.fn(),
  publishAward: vi.fn(),
  saveAward: vi.fn(),
  slugify: (s: string) => s.toLowerCase().replace(/\W+/g, '-'),
}))
vi.mock('../server/utils/billing', () => ({ paidFeaturesOf: vi.fn(), tierFor: vi.fn() }))
vi.mock('../server/utils/db', () => ({ queryOne: vi.fn() }))
vi.mock('../server/utils/users', () => ({ requireHost: vi.fn() }))

vi.stubGlobal('defineEventHandler', (h: (e: unknown) => unknown) => h)
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('createError', (o: { statusCode: number; statusMessage?: string }) =>
  Object.assign(new Error(o.statusMessage ?? 'error'), o),
)

const { draftFor, freeSlug, hydrate, publishAward, saveAward } = await import('../server/utils/awards')
const { paidFeaturesOf, tierFor } = await import('../server/utils/billing')
const { queryOne } = await import('../server/utils/db')
const { requireHost } = await import('../server/utils/users')
const handler = (await import('../server/api/draft/publish.post')).default as (
  e: unknown,
) => Promise<unknown>

const category = (i: number) => ({
  title: `Category ${i}`,
  nominees: [
    { kind: 'text', text: 'A' },
    { kind: 'text', text: 'B' },
  ],
})
const body = {
  name: 'Chat Awards 2026',
  description: 'a real description that is long enough',
  look: {},
  host: { name: 'ishowspeed', platform: 'twitch' },
  partners: [],
  nominations: [category(1), category(2), category(3)],
}

describe('POST /api/draft/publish', () => {
  beforeEach(() => {
    vi.mocked(requireHost).mockReset().mockResolvedValue({ id: 7, role: 'user' } as never)
    vi.mocked(readBody as never)
      .mockReset()
      .mockResolvedValue(body)
    vi.mocked(tierFor).mockReset().mockResolvedValue('free')
    vi.mocked(paidFeaturesOf).mockReset().mockReturnValue([])
    vi.mocked(queryOne).mockReset().mockResolvedValue({ n: 0 } as never)
    vi.mocked(draftFor).mockReset().mockResolvedValue({ id: 3 } as never)
    vi.mocked(freeSlug).mockReset().mockResolvedValue('chat-awards-2026')
    vi.mocked(hydrate).mockReset().mockResolvedValue({ slug: 'chat-awards-2026' } as never)
    vi.mocked(saveAward).mockReset()
    vi.mocked(publishAward).mockReset()
  })

  it('propagates the 403 for a session without the channel scopes', async () => {
    const err = Object.assign(new Error('Sign in with channel access'), { statusCode: 403 })
    vi.mocked(requireHost).mockRejectedValue(err)
    await expect(handler({})).rejects.toBe(err)
    expect(publishAward).not.toHaveBeenCalled()
  })

  it('refuses a nameless show', async () => {
    vi.mocked(readBody as never).mockResolvedValue({ ...body, name: '  ' })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
  })

  it('refuses fewer than three filled categories', async () => {
    vi.mocked(readBody as never).mockResolvedValue({
      ...body,
      nominations: [category(1), category(2)],
    })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(publishAward).not.toHaveBeenCalled()
  })

  it('does not count a category with one nominee', async () => {
    vi.mocked(readBody as never).mockResolvedValue({
      ...body,
      nominations: [
        category(1),
        category(2),
        { title: 'Thin', nominees: [{ kind: 'text', text: 'only' }] },
      ],
    })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
  })

  it('answers 402 when the show uses paid features on the free tier', async () => {
    vi.mocked(paidFeaturesOf).mockReturnValue(['your own look'])
    await expect(handler({})).rejects.toMatchObject({ statusCode: 402 })
    expect(publishAward).not.toHaveBeenCalled()
  })

  it('answers 402 on the free plan when a show is already live', async () => {
    vi.mocked(queryOne).mockResolvedValue({ n: 1 } as never)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 402 })
  })

  it('lets a paid account past the one-show ceiling', async () => {
    vi.mocked(tierFor).mockResolvedValue('paid')
    vi.mocked(queryOne).mockResolvedValue({ n: 3 } as never)
    await handler({})
    expect(publishAward).toHaveBeenCalledWith(3, 'chat-awards-2026', 'paid')
  })

  it('saves and publishes on the happy path', async () => {
    const out = (await handler({})) as { tier: string }
    expect(saveAward).toHaveBeenCalled()
    expect(publishAward).toHaveBeenCalledWith(3, 'chat-awards-2026', 'free')
    expect(out.tier).toBe('free')
  })
})
