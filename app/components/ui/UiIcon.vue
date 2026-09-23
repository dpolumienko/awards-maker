<script setup lang="ts">
// The drawn icon set. Unicode glyphs (✓ ✕ ‹ › 📌) were standing in for these:
// they inherit the text font's shapes, sit on the text baseline and change
// weight with the font, which is why they never line up with anything.
// One 16px box, one 1.6 stroke, currentColor.
const { name, size = 16 } = defineProps<{
  name: 'check' | 'close' | 'chevron-left' | 'chevron-right' | 'pin'
  size?: number
}>()

const paths: Record<string, string> = {
  check: 'M3 8.5 6.2 12 13 4.5',
  close: 'M4 4l8 8M12 4l-8 8',
  'chevron-left': 'M10 3 5 8l5 5',
  'chevron-right': 'M6 3l5 5-5 5',
  // a push pin, head down
  pin: 'M6 2h4M8 2v4.2L5 9h6L8 6.2M8 11v3',
}
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    focusable="false"
    class="flex-none"
  >
    <path :d="paths[name]" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
