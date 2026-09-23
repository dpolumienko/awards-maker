<script setup lang="ts">
// Free-plan meter: the bar turns warn at 80%, the way DESIGN.md §4 describes it.
import { computed } from 'vue'

const { label, used, total, note = '' } = defineProps<{
  label: string
  used: number
  total: number
  note?: string
}>()

const pct = computed(() => Math.min(100, Math.round((used / total) * 100)))
const near = computed(() => used / total >= 0.8)
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm text-ink-2">{{ label }}</span>
      <span class="tnum text-sm" :class="near ? 'text-warn' : 'text-ink-muted'" aria-live="polite">
        {{ used }} / {{ total }}
      </span>
    </div>
    <span class="mt-2 block h-1.5 w-full overflow-hidden rounded-pill bg-s2">
      <span
        class="block h-full w-full origin-left rounded-pill transition-transform duration-500 ease-gala"
        :class="near ? 'bg-warn' : 'bg-gold'"
        :style="{ transform: `scaleX(${pct / 100})` }"
      />
    </span>
    <p v-if="note" class="mt-2 text-sm text-ink-muted">{{ note }}</p>
  </div>
</template>
