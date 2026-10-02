<script setup lang="ts">
// A display headline printed on two plates: the first ink, then pink laid on
// top a few pixels off and multiplied, so the overlap prints navy - the way a
// risograph misregisters. Only for display moments (the landing's cover, an
// awards' masthead, the results); everywhere else headings are one ink.
// Outside the Fanzine it is the plain element with its text.
import { useVersion } from '~/composables/useVersion'

const { as = 'h1', text } = defineProps<{ as?: string; text: string }>()
const { isZine } = useVersion()
</script>

<template>
  <component :is="as" :class="isZine && 'zine-plate'">
    <template v-if="isZine">
      <span class="zine-plate-1">{{ text }}</span>
      <span class="zine-plate-2" aria-hidden="true">{{ text }}</span>
    </template>
    <template v-else>{{ text }}</template>
  </component>
</template>
