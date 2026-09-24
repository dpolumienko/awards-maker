import { createHmac, timingSafeEqual } from 'node:crypto'
import { applyPaymentEvent } from '../../utils/billing'

/**
 * Stripe's webhook, verified by hand.
 *
 * The signature check is the whole security of this endpoint: it is the one
 * route on the site that takes an unauthenticated POST and moves money state, so
 * an unsigned body is a 400 before anything is read out of it. The scheme is
 * `t=<unix>,v1=<hmac>` over `<t>.<raw body>` with sha256 - twenty lines, against
 * a dependency that brings its own HTTP client.
 */
const TOLERANCE_SECONDS = 300

function verify(raw: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, ...rest] = p.split('=')
      return [k?.trim() ?? '', rest.join('=')]
    }),
  )
  const timestamp = Number(parts.t)
  const signature = parts.v1
  if (!timestamp || !signature) return false

  // a replayed delivery from last week must not be accepted as new
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false

  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export default defineEventHandler(async (event) => {
  const { stripe } = useRuntimeConfig()
  if (!stripe.webhookSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Webhooks are not switched on' })
  }

  const raw = (await readRawBody(event, 'utf8')) ?? ''
  const header = getRequestHeader(event, 'stripe-signature') ?? ''
  if (!verify(raw, header, String(stripe.webhookSecret))) {
    throw createError({ statusCode: 400, statusMessage: 'Bad signature' })
  }

  const body = JSON.parse(raw) as {
    id: string
    type: string
    data?: { object?: Record<string, unknown> }
  }
  const object = body.data?.object ?? {}
  const orderId = Number(
    (object.metadata as Record<string, string> | undefined)?.order_id ?? object.client_reference_id ?? 0,
  )

  const result = await applyPaymentEvent(
    body.id,
    body.type,
    body,
    orderId || null,
    Number(object.amount_total ?? 0),
    String(object.currency ?? 'usd'),
    (object.receipt_url as string) ?? null,
  )

  // 200 either way: a duplicate is not an error, and a non-2xx makes Stripe retry
  return { received: true, applied: result.applied }
})
