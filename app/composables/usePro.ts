import { computed, ref } from 'vue'

/**
 * Whether this account may publish a paid show.
 *
 * This used to be a switch in localStorage, default on, flipped with `?pro=1` -
 * a stand-in from before there was anything to buy. It is an account fact now:
 * an admin is comped, everyone else has it once an order is paid.
 *
 * The builder still only *warns* about paid features. The refusal happens at
 * publish, on the server, because that is the only copy of the rule a POST
 * cannot walk past.
 */
export interface Order {
  id: number
  /** the show this payment was spent on; null while it is still unspent */
  award_id: number | null
  slug: string | null
  name: string | null
  tier: string
  amount_cents: number
  currency: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  provider: string
  receipt_url: string | null
  created_at: string
}

interface Billing {
  orders: Order[]
  /** False when Stripe has no key yet, so the page can say why, not just grey out. */
  payments: boolean
  comped: boolean
}

const billing = ref<Billing>({ orders: [], payments: false, comped: false })
const loaded = ref(false)

export function usePro() {
  const { isAdmin, signedIn } = useAccount()

  /** One fetch per page load, whoever asks first. Nothing to fetch signed out. */
  async function load(force = false) {
    if ((loaded.value && !force) || !signedIn.value) return
    loaded.value = true
    try {
      billing.value = await $fetch<Billing>('/api/billing/orders')
    } catch {
      // signed out, or the API is down: no orders is the safe reading
      billing.value = { orders: [], payments: false, comped: false }
    }
  }

  // $50 buys one show: a payment counts until a published show has spent it
  // (server/utils/billing.ts claimOrder)
  const credits = computed(() => billing.value.orders.filter((o) => o.status === 'paid' && !o.award_id).length)
  const paid = computed(() => credits.value > 0)
  const pro = computed(() => isAdmin.value || billing.value.comped || paid.value)

  const checkoutError = ref('')
  /** Off to Stripe. Comes back to the builder, where the draft is waiting. */
  async function checkout() {
    checkoutError.value = ''
    try {
      const { url } = await $fetch<{ url: string }>('/api/billing/checkout', { method: 'POST' })
      window.location.href = url
    } catch (error) {
      checkoutError.value = (error as { statusMessage?: string }).statusMessage || 'Could not start the checkout'
    }
  }

  return { pro, paid, credits, billing, load, checkout, checkoutError }
}
