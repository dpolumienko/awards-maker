<script setup lang="ts">
// The three plan cards. Same cards on the landing and on /plans, so a price or a
// limit changes in one place - data/plans.ts.
//
// The highlighted card is the paid tier, not the free one: highlighting free was
// pointing every reader at the cheapest option. Free stays first and stays honest
// about what it covers; the paid card carries the accent, the badge and the only
// gold button in the group.
import UiButton from './UiButton.vue'
import UiIcon from './UiIcon.vue'
import { PLANS } from '~/data/plans'
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-3">
    <div
      v-for="p in PLANS"
      :key="p.id"
      class="js-reveal relative flex flex-col rounded-card border p-6"
      :class="p.featured ? 'border-gold-24 bg-gold/[0.06] lg:-mt-4 lg:pb-10 lg:pt-10' : 'border-hair bg-s1'"
    >
      <span
        v-if="p.featured"
        aria-hidden="true"
        class="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#D9A441,transparent)]"
      />
      <span
        v-if="p.badge"
        class="mb-3 inline-flex w-fit rounded-pill border border-gold-24 px-3 py-1 text-[11px] font-bold uppercase tracking-micro text-gold-text"
      >
        {{ p.badge }}
      </span>
      <h3 class="text-xl font-semibold">{{ p.name }}</h3>
      <p class="mt-1 text-sm" :class="p.featured ? 'text-gold-text' : 'text-ink-muted'">{{ p.price }}</p>
      <p class="mt-3 text-sm text-ink-2">{{ p.blurb }}</p>

      <ul class="mt-5 list-none space-y-2.5 p-0">
        <li v-for="f in p.features" :key="f" class="flex items-start gap-3 text-sm text-ink-2">
          <span
            aria-hidden="true"
            class="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-btn border text-[12px] font-extrabold"
            :class="p.featured ? 'border-gold-24 text-gold-text' : 'border-hair text-ink-muted'"
          ><UiIcon name="check" :size="12" /></span>
          {{ f }}
        </li>
      </ul>

      <div class="mt-6 pt-2">
        <UiButton :to="p.cta.to" :variant="p.cta.variant" size="sm">{{ p.cta.label }}</UiButton>
        <p v-if="p.note" class="mt-3 text-sm text-ink-muted">{{ p.note }}</p>
      </div>
    </div>
  </div>
</template>
