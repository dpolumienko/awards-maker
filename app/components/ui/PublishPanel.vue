<script setup lang="ts">
// The last step: what is still missing, the Free limits, the rules, the button.
// The checklist items are the publishing rules and the indexing thresholds at once.
import { ref } from 'vue'
import UiButton from './UiButton.vue'
import LimitMeter from './LimitMeter.vue'
import { FREE, PAID } from '~/types/award'
import { SC } from '~/data/sc'
import UiIcon from './UiIcon.vue'

const { checks, canPublish, nominationsUsed, paidFeatures, error = '' } = defineProps<{
  checks: { id: string; label: string; ok: boolean }[]
  canPublish: boolean
  nominationsUsed: number
  paidFeatures: { id: string; label: string; detail: string }[]
  /** What the server said when it refused - the paywall and the scope check. */
  error?: string
}>()
const emit = defineEmits<{ publish: []; upgrade: []; downgrade: [] }>()

// `pro` is an account fact now - comped for an admin, earned by a paid order -
// not a switch in this browser. The panel still only explains the limit; the
// refusal happens on the server at publish.
const { pro } = usePro()

const agreed = ref(false)
</script>

<template>
  <div class="rounded-card border border-hair bg-s1 p-6">
    <h2 class="text-xl font-semibold">Ready to publish?</h2>
    <p class="mt-1 text-sm text-ink-2">
      These are also the rules for search: below them the page stays out of Google.
    </p>

    <ul class="mt-5 list-none space-y-2 p-0">
      <li v-for="c in checks" :key="c.id" class="flex items-center gap-3 text-sm">
        <span
          aria-hidden="true"
          class="grid h-5 w-5 flex-none place-items-center rounded-btn border text-[12px] font-extrabold"
          :class="c.ok ? 'border-live text-live' : 'border-hair2 text-ink-muted'"
        ><UiIcon v-if="c.ok" name="check" :size="12" /><span v-else aria-hidden="true" class="block h-1 w-1 rounded-pill bg-current" /></span>
        <span :class="c.ok ? 'text-ink-2' : 'text-ink-muted'">{{ c.label }}</span>
      </li>
    </ul>

    <!-- what is in the draft that free does not cover -->
    <div v-if="paidFeatures.length" class="mt-6 overflow-hidden rounded-card border border-gold-24 bg-gold/[0.06] p-5">
      <span aria-hidden="true" class="mb-3 block h-px w-full bg-[linear-gradient(90deg,transparent,#D9A441,transparent)]" />
      <p class="micro text-gold-text">Paid features in this draft</p>
      <ul class="mt-3 list-none space-y-2 p-0">
        <li v-for="f in paidFeatures" :key="f.id" class="text-sm">
          <span class="font-semibold">{{ f.label }}</span>
          <span class="text-ink-2"> - {{ f.detail }}</span>
        </li>
      </ul>
      <p v-if="pro" class="mt-3 text-sm text-ink-2">
        The paid tier is unlocked in this browser, so these go out as they are.
      </p>
      <template v-else>
        <p class="mt-3 text-sm text-ink-2">
          Keep them and the awards go out on the paid tier - ${{ PAID.priceUsd }} once, no subscription. Or drop them and
          publish free right now; everything else you set stays.
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <UiButton size="sm" @click="emit('upgrade')">Upgrade and keep everything</UiButton>
          <button
            type="button"
            class="text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
            @click="emit('downgrade')"
          >
            Remove paid features and publish free
          </button>
        </div>
      </template>
    </div>

    <div class="mt-6 space-y-4 border-t border-hair pt-6">
      <LimitMeter label="Nominations" :used="nominationsUsed" :total="FREE.maxNominations" />
      <LimitMeter
        label="Unique voters"
        :used="0"
        :total="FREE.maxVoters"
        note="On the free plan voting closes at 200 voters. Votes already cast are kept."
      />
    </div>

    <label class="mt-6 flex cursor-pointer items-start gap-3 text-sm text-ink-2">
      <input
        v-model="agreed"
        type="checkbox"
        class="mt-0.5 h-5 w-5 flex-none rounded-btn border border-hair2 bg-s2 accent-gold focus:shadow-focus focus:outline-none"
      />
      <span>
        I have read the
        <a :href="SC.terms" target="_blank" rel="noopener" class="text-ink underline underline-offset-4">rules</a>
        and the nominees are not impersonating anyone.
      </span>
    </label>

    <div class="mt-5">
      <UiButton
        :variant="paidFeatures.length && !pro ? 'ghost' : 'primary'"
        :class="!(canPublish && agreed) && 'pointer-events-none opacity-40'"
        @click="canPublish && agreed && emit(paidFeatures.length && !pro ? 'downgrade' : 'publish')"
      >
        {{ paidFeatures.length && !pro ? 'Publish the free version' : 'Publish awards' }}
      </UiButton>
    </div>
    <p v-if="!canPublish" class="mt-3 text-sm text-ink-muted">
      Finish the unchecked items above to publish.
    </p>
    <p v-else-if="paidFeatures.length && !pro" class="mt-3 text-sm text-ink-muted">
      Publishing free drops the paid features listed above. Nothing else changes.
    </p>

    <p class="mt-6 border-t border-hair pt-4 text-sm text-ink-muted">
      <template v-if="pro">
        Your account has the paid tier.
        <NuxtLink to="/my-awards/billing" class="underline underline-offset-4 hover:text-ink">
          See your payments
        </NuxtLink>
      </template>
      <template v-else>
        Need more than the free plan?
        <NuxtLink to="/plans" class="underline underline-offset-4 hover:text-ink">
          What the paid tier covers
        </NuxtLink>
      </template>
    </p>
    <p v-if="error" class="mt-3 text-sm text-danger" role="alert">{{ error }}</p>
  </div>
</template>
