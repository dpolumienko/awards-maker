<script setup lang="ts">
// What this account has paid for. A short page on purpose: a receipts list is
// something people open twice a year, and the only question it has to answer is
// "did that go through".
import { computed, onMounted } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import { usePro } from '~/composables/usePro'

const { billing, pro, load } = usePro()
onMounted(() => load(true))

const orders = computed(() => billing.value.orders)

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'USD' }).format(cents / 100)

const when = (iso: string) =>
  new Date(iso.replace(' ', 'T')).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const TONE: Record<string, string> = {
  paid: 'text-live',
  pending: 'text-warn',
  failed: 'text-danger',
  refunded: 'text-ink-muted',
}

const checkoutError = ref('')
async function upgrade() {
  checkoutError.value = ''
  try {
    const { url } = await $fetch<{ url: string }>('/api/billing/checkout', { method: 'POST' })
    window.location.href = url
  } catch (error) {
    checkoutError.value =
      (error as { statusMessage?: string }).statusMessage || 'Could not start the checkout'
  }
}

useSeoMeta({ title: 'Payments', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="shell py-10">
    <h1 class="heading">Payments</h1>

    <div class="mt-6 rounded-card border p-5" :class="pro ? 'border-gold-24 bg-gold/[0.04]' : 'border-hair bg-s1'">
      <p class="font-semibold">
        {{ pro ? 'Your account has the paid tier.' : 'Your account is on the free plan.' }}
      </p>
      <p class="mt-1 text-sm text-ink-2">
        <template v-if="billing.comped">
          Comped - this is an admin account, so paid shows publish without a payment.
        </template>
        <template v-else-if="pro">
          Unlimited categories, your own look, and clips or images as nominees.
        </template>
        <template v-else>
          Five categories, 200 voters, one show at a time.
        </template>
      </p>

      <div v-if="!pro" class="mt-4 flex flex-wrap items-center gap-3">
        <UiButton size="sm" @click="upgrade">Upgrade this account</UiButton>
        <!-- says why rather than greying out a button with no explanation -->
        <p v-if="!billing.payments" class="text-sm text-ink-muted">
          Checkout is not switched on in this environment yet.
        </p>
      </div>
      <p v-if="checkoutError" class="mt-3 text-sm text-danger" role="alert">{{ checkoutError }}</p>
    </div>

    <h2 class="mt-10 text-xl font-semibold">Receipts</h2>

    <div v-if="orders.length" class="mt-4 overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-hair text-left">
            <th class="py-2 pr-4 font-semibold text-ink-2">Date</th>
            <th class="py-2 pr-4 font-semibold text-ink-2">What for</th>
            <th class="py-2 pr-4 font-semibold text-ink-2">Amount</th>
            <th class="py-2 pr-4 font-semibold text-ink-2">Status</th>
            <th class="py-2 font-semibold text-ink-2">Receipt</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id" class="border-b border-hair">
            <td class="py-3 pr-4 tnum">{{ when(o.created_at) }}</td>
            <td class="py-3 pr-4">{{ o.name || 'Paid tier' }}</td>
            <td class="py-3 pr-4 tnum">{{ money(o.amount_cents, o.currency) }}</td>
            <td class="py-3 pr-4 capitalize" :class="TONE[o.status]">{{ o.status }}</td>
            <td class="py-3">
              <a
                v-if="o.receipt_url"
                :href="o.receipt_url"
                target="_blank"
                rel="noopener"
                class="text-gold-text underline underline-offset-4"
              >Open</a>
              <span v-else class="text-ink-muted">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="mt-4 text-ink-2">Nothing yet. Payments show up here the moment one goes through.</p>

    <p class="mt-10 text-sm text-ink-muted">
      Questions about an invoice:
      <a href="mailto:sales@streamscharts.com" class="text-gold-text underline underline-offset-4">
        sales@streamscharts.com
      </a>
    </p>
  </div>
</template>
