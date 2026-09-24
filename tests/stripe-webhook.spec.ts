import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The signature check is the whole security of this endpoint - it is the one
// route that takes an unauthenticated POST and moves money state - so it is
// tested against the four ways it can be wrong, not only the happy path.

vi.mock('../server/utils/billing', () => ({ applyPaymentEvent: vi.fn() }))

const SECRET = 'whsec_test_secret'
const runtime = { stripe: { webhookSecret: SECRET } }
const headers: Record<string, string> = {}
const raw = { value: '' }

vi.stubGlobal('defineEventHandler', (h: (e: unknown) => unknown) => h)
vi.stubGlobal('useRuntimeConfig', () => runtime)
vi.stubGlobal('readRawBody', async () => raw.value)
vi.stubGlobal('getRequestHeader', (_e: unknown, name: string) => headers[name])
vi.stubGlobal('createError', (o: { statusCode: number; statusMessage?: string }) =>
  Object.assign(new Error(o.statusMessage ?? 'error'), o),
)

const { applyPaymentEvent } = await import('../server/utils/billing')
const handler = (await import('../server/api/webhooks/stripe.post')).default as (
  e: unknown,
) => Promise<unknown>

function sign(body: string, secret = SECRET, at = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac('sha256', secret).update(`${at}.${body}`).digest('hex')
  return `t=${at},v1=${v1}`
}

const event = JSON.stringify({
  id: 'evt_1',
  type: 'checkout.session.completed',
  data: { object: { metadata: { order_id: '42' }, amount_total: 2900, currency: 'usd' } },
})

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    runtime.stripe.webhookSecret = SECRET
    raw.value = event
    headers['stripe-signature'] = sign(event)
    vi.mocked(applyPaymentEvent).mockReset().mockResolvedValue({ applied: true })
  })

  it('refuses an unsigned body', async () => {
    delete headers['stripe-signature']
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(applyPaymentEvent).not.toHaveBeenCalled()
  })

  it('refuses a signature made with another secret', async () => {
    headers['stripe-signature'] = sign(event, 'whsec_someone_else')
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(applyPaymentEvent).not.toHaveBeenCalled()
  })

  it('refuses a body that was altered after signing', async () => {
    raw.value = event.replace('2900', '1')
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
  })

  it('refuses a replay from outside the tolerance window', async () => {
    headers['stripe-signature'] = sign(event, SECRET, Math.floor(Date.now() / 1000) - 3600)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
  })

  it('503s when no webhook secret is configured', async () => {
    runtime.stripe.webhookSecret = ''
    await expect(handler({})).rejects.toMatchObject({ statusCode: 503 })
  })

  it('applies a properly signed event against the order in its metadata', async () => {
    const out = (await handler({})) as { received: boolean; applied: boolean }
    expect(applyPaymentEvent).toHaveBeenCalledWith(
      'evt_1',
      'checkout.session.completed',
      expect.objectContaining({ id: 'evt_1' }),
      42,
      2900,
      'usd',
      null,
    )
    expect(out).toEqual({ received: true, applied: true })
  })

  it('answers 200 for a duplicate delivery so Stripe stops retrying', async () => {
    vi.mocked(applyPaymentEvent).mockResolvedValue({ applied: false })
    await expect(handler({})).resolves.toEqual({ received: true, applied: false })
  })
})
