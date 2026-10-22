<script setup lang="ts">
// A still strip of numbers under the cover, below the fold (review 2026-10-08:
// two moving scenes on the first screen at once; the Current landing has the same
// strip). Quiet on purpose - ink, not the accent, and room around it - so it is a
// rest between two loud blocks, not a third one. Every number is the product's own - the
// platforms we nominate from, the ideas on /ideas, the free plan's limits - no
// invented growth figures. It does not count up: the point is a rest.
import { IDEA_TOTAL } from '~/data/ideas'
import { FREE } from '~/types/award'

const STATS = [
  { n: '3', label: 'Platforms to nominate from', sub: 'Twitch, Kick, YouTube' },
  { n: String(IDEA_TOTAL), label: 'Category ideas to start from', sub: 'Funny ones included' },
  { n: String(FREE.maxNominations), label: 'Categories free', sub: 'More on a paid show' },
  { n: String(FREE.maxVoters), label: 'Voters on the free plan', sub: 'One ballot each' },
]
</script>

<template>
  <section class="zs" aria-label="Awards Maker in numbers">
    <dl class="shell zs-grid">
      <div v-for="s in STATS" :key="s.label" class="zs-cell">
        <dt>{{ s.label }}</dt>
        <dd class="zine-display tnum">{{ s.n }}</dd>
        <dd class="zs-sub">{{ s.sub }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.zs { padding: 72px 0; }
.zs-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-block: 0; }
@media (min-width: 1024px) { .zs-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.zs-cell { display: flex; flex-direction: column; padding: 4px 24px; border-left: 1px solid rgb(var(--hair)); }
.zs-cell:first-child, .zs-cell:nth-child(3) { border-left: 0; padding-left: 0; }
@media (min-width: 1024px) { .zs-cell:nth-child(3) { border-left: 1px solid rgb(var(--hair)); padding-left: 24px; } }
@media (max-width: 1023px) { .zs-cell:nth-child(n + 3) { margin-top: 32px; } }
.zs-cell dt { order: 2; margin-top: 8px; font-weight: 800; font-size: 15px; }
.zs-cell dd { margin: 0; }
.zs-cell .zine-display { order: 1; font-size: clamp(36px, 3.6vw, 48px); line-height: 0.9; color: rgb(var(--ink)); }
.zs-sub { order: 3; margin-top: 4px; font-size: 13px; color: rgb(var(--ink-muted)); }
</style>
