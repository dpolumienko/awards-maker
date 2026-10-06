<script setup lang="ts">
// A display headline printed on two plates: the first ink, then pink laid on
// top a few pixels off and multiplied, so the overlap prints navy - the way a
// risograph misregisters. Only for display moments (the landing's cover, an
// awards' masthead, the results); everywhere else headings are one ink.
// Outside the Fanzine it is the plain element with its text. The pink plate is a
// ::after reading data-text, not a second span: a span, even aria-hidden, put the
// title in the H1 twice for search (SEO audit 2026-10-06).
import { useVersion } from '~/composables/useVersion'

const { as = 'h1', text } = defineProps<{ as?: string; text: string }>()
const { isZine } = useVersion()
</script>

<template>
  <component :is="as" :class="isZine && 'zine-plate'" :data-text="isZine ? text : undefined">{{ text }}</component>
</template>
