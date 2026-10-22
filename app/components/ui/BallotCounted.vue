<script setup lang="ts">
// The moment a ballot goes in (review 2026-10-08: "it reads like a footnote, and
// it is the biggest thing a viewer does here"). An admission stub in the show's
// colour: what was counted, when the winners come, and - if categories were
// skipped - that they stay open until voting closes. The stamp lands once.
const { picked, total, ceremony = '', closes = '', accent } = defineProps<{
  picked: number
  total: number
  /** formatted ceremony date, if one is set */
  ceremony?: string
  /** formatted closing date */
  closes?: string
  accent: string
}>()
const left = () => total - picked
</script>

<template>
  <div class="bc" :style="{ '--acc': accent }">
    <div class="bc-main">
      <p class="micro">Ballot counted</p>
      <p class="bc-h">Your vote is in</p>
      <p class="bc-line">
        {{ picked }} of {{ total }} {{ total === 1 ? 'category' : 'categories' }} counted.
        <template v-if="ceremony">The winners are announced {{ ceremony }}.</template>
      </p>
      <p v-if="left() > 0" class="bc-line bc-back">
        Skipped {{ left() === 1 ? 'one' : left() }}? Come back any time before voting closes{{ closes ? `, ${closes}` : '' }} - your picks so far are kept.
      </p>
    </div>
    <div class="bc-stub" aria-hidden="true">
      <span class="bc-stamp">Counted</span>
      <span class="bc-n tnum">{{ picked }}/{{ total }}</span>
    </div>
  </div>
</template>

<style scoped>
.bc { display: grid; grid-template-columns: minmax(0, 1fr) 132px; border: 2px solid var(--acc); border-left-width: 8px; border-radius: var(--r-card, 10px); background: rgb(var(--s1)); overflow: hidden; }
.bc-main { padding: 20px 22px; }
.bc-h { margin-top: 6px; font: 900 clamp(26px, 3vw, 34px)/1 var(--font-display, inherit), sans-serif; text-transform: uppercase; color: rgb(var(--ink)); }
.bc-line { margin-top: 10px; font-size: 14px; line-height: 1.5; color: rgb(var(--ink-2)); }
.bc-back { color: rgb(var(--ink)); font-weight: 600; }
/* the stub, torn off along a perforation */
.bc-stub { display: grid; place-content: center; justify-items: center; gap: 10px; border-left: 2px dashed rgb(var(--hair2)); }
.bc-stamp { padding: 3px 8px 2px; border: 3px double var(--acc); color: var(--acc); font: 800 13px/1.2 var(--font-display, inherit), sans-serif; letter-spacing: 0.06em; text-transform: uppercase; transform: rotate(-6deg); animation: bc-land 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }
.bc-n { font: 900 26px/1 var(--font-display, inherit), sans-serif; color: rgb(var(--ink)); }
@keyframes bc-land { from { opacity: 0; transform: rotate(-6deg) scale(1.8); } }
@media (max-width: 480px) { .bc { grid-template-columns: minmax(0, 1fr) 96px; } }
@media (prefers-reduced-motion: reduce) { .bc-stamp { animation: none; } }
</style>
