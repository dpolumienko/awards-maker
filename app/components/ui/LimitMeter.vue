<script setup lang="ts">
// Free-plan meter: the bar turns warn at 80%, the way DESIGN.md §4 describes it.
import { computed } from 'vue'
import { useVersion } from '~/composables/useVersion'

const { label, used, total, note = '' } = defineProps<{
  label: string
  used: number
  total: number
  note?: string
}>()

const pct = computed(() => Math.min(100, Math.round((used / total) * 100)))
const near = computed(() => used / total >= 0.8)
// The Fanzine prints the ceiling as a print run: one square per voter the plan
// allows, inked as ballots come in. Past a few hundred squares it is a smudge, so
// a bigger ceiling keeps the bar.
const { isZine } = useVersion()
const run = computed(() => isZine.value && total <= 400)
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm text-ink-2">{{ label }}</span>
      <span class="tnum text-sm" :class="near ? 'text-warn' : 'text-ink-muted'" aria-live="polite">
        {{ used }} / {{ total }}
      </span>
    </div>
    <span v-if="run" class="lm-run mt-3" role="img" :aria-label="`${used} of ${total}`">
      <i v-for="n in total" :key="n" :class="n <= used && (near ? 'is-near' : 'is-on')" />
    </span>
    <span v-else class="mt-2 block h-1.5 w-full overflow-hidden rounded-pill bg-s2">
      <span
        class="block h-full w-full origin-left rounded-pill transition-transform duration-500 ease-gala"
        :class="near ? 'bg-warn' : 'bg-gold'"
        :style="{ transform: `scaleX(${pct / 100})` }"
      />
    </span>
    <p v-if="note" class="mt-2 text-sm text-ink-muted">{{ note }}</p>
  </div>
</template>

<style scoped>
.lm-run {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9px, 1fr));
  gap: 3px;
}
.lm-run i {
  aspect-ratio: 1;
  border: 1.5px solid rgb(var(--hair));
}
.lm-run i.is-on {
  background: rgb(var(--gold));
  border-color: rgb(var(--gold));
}
.lm-run i.is-near {
  background: rgb(var(--warn));
  border-color: rgb(var(--warn));
}
</style>
