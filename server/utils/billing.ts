import { FREE } from '#shared/limits'
import { insert, query, queryOne } from './db'
import type { AwardInputPayload } from './schema'
import type { SessionUser } from './users'

// Payments, with Stripe behind an interface it does not get to define.
//
// Nothing here talks to Stripe unless a secret key is configured: without one
// checkout answers 503 and says why, so the rest of the product is testable and
// turning payments on is one environment variable rather than a deployment.

export interface CheckoutSession {
  url: string
  orderId: number
  providerRef: string
}

/** What a show is using that the free plan does not cover. */
export function paidFeaturesOf(input: AwardInputPayload): string[] {
  const out: string[] = []
  if (input.nominations.length > FREE.maxNominations) {
    out.push(`${input.nominations.length} categories`)
  }
  const look = input.look ?? {}
  if (look.theme || look.accent || look.font || look.coverUrl || look.logoUrl) {
    out.push('your own look')
  }
  if (input.nominations.some((n) => n.nominees.some((x) => x.kind === 'media'))) {
    out.push('clips and images as nominees')
  }
  return out
}

/**
 * Which tier this show publishes on.
 *
 * An admin gets `paid` for nothing - that is the whole point of the admin flag,
 * so the paid product can be exercised without a card. Everyone else gets what
 * they have paid for, and `free` otherwise.
 */
export async function tierFor(user: SessionUser, input: AwardInputPayload): Promise<'free' | 'paid'> {
  if (user.role === 'admin') return 'paid'
  if (!paidFeaturesOf(input).length) return 'free'

  const paid = await queryOne<{ id: number }>(
    `SELECT id FROM orders
      WHERE user_id = ? AND status = 'paid' AND award_id IS NULL
      ORDER BY id LIMIT 1`,
    [user.id],
  )
  return paid ? 'paid' : 'free'
}

export function ordersFor(userId: number) {
  return query<{
    id: number
    award_id: number | null
    slug: string | null
    name: string | null
    tier: string
    amount_cents: number
    currency: string
    status: string
    provider: string
    receipt_url: string | null
    created_at: string
  }>(
    `SELECT o.id, o.award_id, a.slug, a.name, o.tier, o.amount_cents, o.currency,
            o.status, o.provider, o.receipt_url, o.created_at
       FROM orders o
       LEFT JOIN awards a ON a.id = o.award_id
      WHERE o.user_id = ?
      ORDER BY o.id DESC`,
    [userId],
  )
}

export function stripeConfigured(): boolean {
  const { stripe } = useRuntimeConfig()
  return Boolean(stripe.secretKey && stripe.priceId)
}

/**
 * Creates the pending order and asks Stripe for a hosted checkout.
 *
 * The order exists before Stripe is called, so a webhook that arrives before
 * the browser comes back still has a row to attach itself to. Stripe is reached
 * over its REST API with `$fetch` rather than the SDK: one endpoint, one shape,
 * and no dependency that ships its own fetch.
 */
export async function createCheckout(
  userId: number,
  origin: string,
): Promise<CheckoutSession> {
  const { stripe } = useRuntimeConfig()
  if (!stripeConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Payments are not switched on yet. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.',
    })
  }

  const orderId = await insert(
    `INSERT INTO orders (user_id, tier, status, provider) VALUES (?, 'paid', 'pending', 'stripe')`,
    [userId],
  )

  const session = await $fetch<{ id: string; url: string }>(
    'https://api.stripe.com/v1/checkout/sessions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripe.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'payment',
        'line_items[0][price]': String(stripe.priceId),
        'line_items[0][quantity]': '1',
        success_url: `${origin}/my-awards/billing?paid=1`,
        cancel_url: `${origin}/plans?cancelled=1`,
        client_reference_id: String(orderId),
        'metadata[order_id]': String(orderId),
        'metadata[user_id]': String(userId),
      }).toString(),
    },
  )

  await query(`UPDATE orders SET provider_ref = ? WHERE id = ?`, [session.id, orderId])
  return { url: session.url, orderId, providerRef: session.id }
}

/**
 * Applies a verified webhook. Idempotent by the unique index on
 * (provider, event_id): Stripe retries, and a retry must not pay twice.
 */
export async function applyPaymentEvent(
  eventId: string,
  kind: string,
  payload: unknown,
  orderId: number | null,
  amountCents: number,
  currency: string,
  receiptUrl: string | null,
): Promise<{ applied: boolean }> {
  try {
    await query(
      `INSERT INTO payment_events (order_id, provider, event_id, kind, payload)
       VALUES (?, 'stripe', ?, ?, ?)`,
      [orderId, eventId, kind, JSON.stringify(payload ?? null)],
    )
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return { applied: false }
    throw error
  }

  if (orderId && kind === 'checkout.session.completed') {
    await query(
      `UPDATE orders SET status = 'paid', amount_cents = ?, currency = ?, receipt_url = ?
        WHERE id = ? AND status <> 'paid'`,
      [amountCents, currency.toUpperCase(), receiptUrl, orderId],
    )
  }
  return { applied: true }
}
