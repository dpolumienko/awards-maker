<script setup lang="ts">
// A still strip of numbers between the cover's live scene and the how-it-works
// scene (review 2026-10-08: two moving scenes on the first screen at once; the
// Current landing has the same strip). Every number is the product's own - the
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
.zs { border-top: 2px solid rgb(var(--ink)); }
.zs-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-block: 0; }
@media (min-width: 1024px) { .zs-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.zs-cell { display: flex; flex-direction: column; padding: 28px 20px 26px; border-left: 2px solid rgb(var(--ink)); }
.zs-cell:first-child, .zs-cell:nth-child(3) { border-left: 0; padding-left: 0; }
@media (min-width: 1024px) { .zs-cell:nth-child(3) { border-left: 2px solid rgb(var(--ink)); padding-left: 20px; } }
@media (max-width: 1023px) { .zs-cell:nth-child(n + 3) { border-top: 2px solid rgb(var(--ink)); } }
.zs-cell dt { order: 2; margin-top: 8px; font-weight: 800; font-size: 15px; }
.zs-cell dd { margin: 0; }
.zs-cell .zine-display { order: 1; font-size: clamp(48px, 6vw, 80px); line-height: 0.85; color: rgb(var(--gold)); }
.zs-sub { order: 3; margin-top: 4px; font-size: 13px; color: rgb(var(--ink-muted)); }
</style>
