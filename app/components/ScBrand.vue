<script setup lang="ts">
// The product mark: Streams Charts' logo, a rule, and the product's name. It
// used to be a standalone "AWARDS.MAKER" wordmark, which read as a separate
// company - the review asked for SC's logo with Awards played next to it.
const { size = 'md' } = defineProps<{ size?: 'md' | 'lg' }>()
</script>

<template>
  <NuxtLink to="/" class="flex items-center gap-3 no-underline" aria-label="Streams Charts Awards, home">
    <img
      :src="asset('/img/logos/streamscharts-light.svg')"
      alt=""
      width="135"
      height="46"
      :class="size === 'lg' ? 'h-9 w-auto' : 'h-7 w-auto sm:h-8'"
    />
    <span aria-hidden="true" class="h-6 w-px bg-hair2" />
    <span
      aria-hidden="true"
      class="font-extrabold uppercase tracking-display text-gold"
      :class="size === 'lg' ? 'text-2xl' : 'text-lg sm:text-xl'"
    >Awards</span>
  </NuxtLink>
</template>
