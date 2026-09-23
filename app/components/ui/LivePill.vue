<script setup lang="ts">
// The broadcast convention: a red dot and the word. On-air red is its own token
// in DESIGN.md, deliberately not the error red.
defineProps<{ game?: string }>()
</script>

<template>
  <span class="inline-flex items-center gap-1.5 rounded-pill border border-onair/60 px-2 py-0.5 text-[11px] font-bold uppercase tracking-micro text-onair">
    <span aria-hidden="true" class="block h-1.5 w-1.5 rounded-pill bg-onair motion-safe:animate-pulse" />
    Live<template v-if="game"> · <span class="font-semibold normal-case tracking-normal text-ink-2">{{ game }}</span></template>
  </span>
</template>
