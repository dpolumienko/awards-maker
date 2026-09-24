<script setup lang="ts">
// The limit is the sales moment, not an apology. Same block wherever the free
// plan runs out, so the pitch reads the same in every place it appears.
import UiButton from './UiButton.vue'
import { FREE, PAID } from '~/types/award'

type Reason = 'nominations' | 'media' | 'look' | 'voters'
const { compact = false, reason = 'nominations' } = defineProps<{ compact?: boolean; reason?: Reason }>()

// The headline names the wall you just hit; the pitch under it is the same.
const headline: Record<Reason, string> = {
  nominations: `${FREE.maxNominations} nominations is where free stops`,
  media: 'Images and clips are a paid nominee type',
  look: 'Your own cover, colour and logo are paid',
  voters: `${FREE.maxVoters} voters is where free stops`,
}
const emit = defineEmits<{ dismiss: [] }>()
</script>

<template>
  <div class="relative overflow-hidden rounded-card border border-gold-24 bg-gold/[0.06]" :class="compact ? 'p-4' : 'p-5'">
    <span aria-hidden="true" class="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#D9A441,transparent)]" />

    <p class="micro text-gold-text">Paid version</p>
    <p class="mt-2 font-semibold" :class="!compact && 'text-lg'">{{ headline[reason] }}</p>
    <p class="mt-1 max-w-[52ch] text-sm text-ink-2">
      ${{ PAID.priceUsd }} once for this awards: no limits on categories or voters, and your own look on the page.
      You pay when you publish.
    </p>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <UiButton size="sm" variant="text" to="/plans">See the plans</UiButton>
      <button
        type="button"
        class="text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
        @click="emit('dismiss')"
      >
        Stay on free
      </button>
    </div>
  </div>
</template>
