<script setup lang="ts">
// The last ask on a content page (/ideas, /plans): a title, a line, two buttons.
// One component instead of the same panel copied page to page. In the Fanzine
// versions it is the landing's admission ticket (review 2026-10-08: the pages
// still wore the old soft card while the landing had moved on).
import { useVersion } from '~/composables/useVersion'

defineProps<{ title: string }>()
const { isZine } = useVersion()
</script>

<template>
  <div class="relative mt-12 p-6 sm:p-8" :class="isZine ? 'zine-ticket' : 'rounded-card border border-gold-24 bg-gold/[0.06]'">
    <span v-if="isZine" class="zine-ticket-tag" aria-hidden="true">Admit one</span>
    <h2 class="text-2xl font-bold">{{ title }}</h2>
    <p class="mt-3 max-w-copy text-ink-2"><slot /></p>
    <div class="mt-6 flex flex-wrap gap-3"><slot name="actions" /></div>
  </div>
</template>
