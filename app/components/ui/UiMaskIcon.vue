<script setup lang="ts">
// A one-colour SVG drawn as a mask and filled with the current text colour.
// The category icons in public/img/icons have the gold baked in and were
// loaded through <img>, which cannot inherit a colour - so under the SC Blue
// palette they stayed gold (design audit, 2026-09-24). Colour it with a text
// class instead: `text-gold`, `text-ink-muted`.
import { computed } from 'vue'

const { src } = defineProps<{ src: string }>()
const mask = computed(() => `url("${asset(src)}") center / contain no-repeat`)
</script>

<template>
  <span aria-hidden="true" class="inline-block bg-current" :style="{ mask, WebkitMask: mask }" />
</template>
