<script setup lang="ts">
// Ranking bars: name, zero-based bar, value, with the leader in the award's own
// accent. Ported from "Rank Bars" on 21st.dev (vizcn) - same idea, no chart
// library, bars grow from the left with a per-row delay - re-laid out for our
// dark cards and for nominee names that are longer than a 200px column.
//
// The bar is decorative: every number it draws is also written next to it.
import { DEFAULT_ACCENT } from '~/utils/accent'
import { computed } from 'vue'

export interface RankItem {
  label: string
  /** Second line: the channel handle, the platform, a note. */
  sub?: string
  value: number
  /** What to print instead of the bare number, e.g. "12 · 41%". */
  valueLabel?: string
  /** The leader. Takes the accent; everything else stays grey. */
  highlight?: boolean
}

const { items, accent = DEFAULT_ACCENT, max } = defineProps<{
  items: RankItem[]
  accent?: string
  /** Shared ceiling, so two lists can be compared. Defaults to the biggest row. */
  max?: number
}>()

const ceiling = computed(() => max ?? Math.max(...items.map((i) => i.value), 1))
const width = (v: number) => (v <= 0 ? 0 : Math.max(2, Math.round((v / ceiling.value) * 100)))
</script>

<template>
  <ul class="js-rank m-0 list-none space-y-2.5 p-0">
    <li
      v-for="(item, i) in items"
      :key="item.label"
      class="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] sm:items-center sm:gap-x-4"
      :style="{ '--i': i }"
    >
      <span class="col-start-1 row-start-1 min-w-0">
        <span class="block truncate text-sm" :class="item.highlight ? 'font-semibold text-ink' : 'text-ink-2'">
          {{ item.label }}
        </span>
        <span v-if="item.sub" class="block truncate text-xs text-ink-muted">{{ item.sub }}</span>
      </span>

      <span
        aria-hidden="true"
        class="col-span-2 col-start-1 row-start-2 block h-4 overflow-hidden rounded-[0_4px_4px_0] bg-s2 sm:col-span-1 sm:col-start-2 sm:row-start-1"
      >
        <span
          class="js-rank-bar block h-full rounded-[0_4px_4px_0] transition-[width] duration-500 ease-gala"
          :style="{ width: `${width(item.value)}%`, background: item.highlight ? accent : '#3A3A40' }"
        />
      </span>

      <span
        class="tnum col-start-2 row-start-1 whitespace-nowrap text-right text-sm sm:col-start-3"
        :class="item.highlight ? 'font-semibold text-ink' : 'text-ink-2'"
      >
        {{ item.valueLabel ?? item.value }}
      </span>
    </li>
  </ul>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .js-rank-bar {
    transform-origin: left;
    animation: rank-grow 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) both;
    animation-delay: calc(var(--i) * 45ms);
  }
  @keyframes rank-grow {
    from {
      transform: scaleX(0);
    }
  }
}
</style>
