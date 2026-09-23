<script setup lang="ts">
type Tone = 'live' | 'results' | 'ended'
const { tone = 'live' } = defineProps<{ tone?: Tone }>()

// The capsule is gone: a pill with a border, a dot and neon type reads as a
// generated status chip. The state is one word in its own colour, with the
// broadcast dot in front of it.
const tones: Record<Tone, string> = {
  live: 'text-live',
  results: 'text-gold-text',
  ended: 'text-ink-muted',
}
const dots: Record<Tone, string> = {
  live: 'bg-live',
  results: 'bg-gold',
  ended: 'bg-ink-muted',
}
</script>

<template>
  <span
    :class="[
      'inline-flex h-6 items-center gap-2 text-[11px] font-semibold uppercase tracking-micro',
      tones[tone],
    ]"
  >
    <span aria-hidden="true" class="block h-1.5 w-1.5 flex-none rounded-pill" :class="dots[tone]" />
    <slot />
  </span>
</template>
