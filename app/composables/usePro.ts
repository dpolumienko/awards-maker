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
  const { isAdmin } = useAccount()

  /** One fetch per page load, whoever asks first. */
  async function load(force = false) {
    if (loaded.value && !force) return
    loaded.value = true
    try {
      billing.value = await $fetch<Billing>('/api/billing/orders')
    } catch {
      // signed out, or the API is down: no orders is the safe reading
      billing.value = { orders: [], payments: false, comped: false }
    }
  }

  const paid = computed(() => billing.value.orders.some((o) => o.status === 'paid'))
  const pro = computed(() => isAdmin.value || billing.value.comped || paid.value)

  return { pro, paid, billing, load }
}
