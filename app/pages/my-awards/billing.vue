<script setup lang="ts">
// What this account has paid for. A short page on purpose: a receipts list is
// something people open twice a year, and the only question it has to answer is
// "did that go through".
import { computed, onMounted } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import { usePro } from '~/composables/usePro'
import '~/assets/css/envelope-pages.css'

const { billing, pro, credits, load, checkout, checkoutError } = usePro()
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

const upgrade = checkout

useSeoMeta({ title: 'Payments', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="shell env-pg">
    <nav class="pg-crumbs" aria-label="Breadcrumb">
      <NuxtLink to="/">Awards Maker</NuxtLink><span aria-hidden="true">/</span>
      <NuxtLink to="/my-awards">Your awards</NuxtLink><span aria-hidden="true">/</span>
      <span aria-current="page">Payments</span>
    </nav>
    <div class="pg-head">
      <div>
        <h1>Payments</h1>
        <p class="pg-sub">Each paid show is a one-off $50. No subscription, nothing renews.</p>
      </div>
    </div>

    <section class="bl-card">
      <div>
        <b>
          <template v-if="billing.comped">Paid shows publish free on this account.</template>
          <template v-else-if="credits">{{ credits }} paid {{ credits === 1 ? 'show' : 'shows' }} ready to publish.</template>
          <template v-else>No paid show waiting - $50 buys the next one.</template>
        </b>
        <p>
          <template v-if="billing.comped">Comped - this is an admin account, so paid shows publish without a payment.</template>
          <template v-else-if="pro">The next show you publish gets unlimited categories, your own look, and clips or images as nominees.</template>
          <template v-else>Five categories, 200 voters, one show at a time.</template>
        </p>
        <!-- says why rather than greying out a button with no explanation -->
        <p v-if="!billing.payments">Checkout is not switched on in this environment yet.</p>
        <p v-if="checkoutError" class="bl-err" role="alert">{{ checkoutError }}</p>
      </div>
      <UiButton v-if="!billing.comped" @click="upgrade">Pay $50 for one show</UiButton>
    </section>

    <h2 class="bl-h">Receipts</h2>
    <div v-if="orders.length" class="bl-table" role="region" aria-label="Receipts" tabindex="0">
      <table>
        <thead>
          <tr><th>Date</th><th>What for</th><th>Amount</th><th>Status</th><th>Receipt</th></tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td class="tnum">{{ when(o.created_at) }}</td>
            <td>{{ o.name || 'Paid tier' }}</td>
            <td class="tnum">{{ money(o.amount_cents, o.currency) }}</td>
            <td><span class="bl-st" :class="o.status">{{ o.status }}</span></td>
            <td>
              <a v-if="o.receipt_url" :href="o.receipt_url" target="_blank" rel="noopener">Open</a>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="pg-note">Nothing yet. Payments show up here the moment one goes through.</p>

    <p class="pg-note">Questions about an invoice: <a href="mailto:sales@streamscharts.com">sales@streamscharts.com</a></p>
  </div>
</template>
