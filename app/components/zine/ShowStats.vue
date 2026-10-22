<script setup lang="ts">
// The numbers under the show desk - Night v2 only (review 2026-10-08: "look at
// the shadcn dashboards, this can be more interesting"). The shadcn dashboard
// pattern, in the Fanzine's ink: four stat cards that each say which way they
// are going, the ballots-per-day chart with a range switch, and the categories
// as a table you can filter to the races that need you (ties, close calls) and
// open for the full standing.
//
// Same rule as the rest of the dashboard: every number is counted from the
// ballots - the changes compare real weeks, nothing is projected.
import { computed, ref } from 'vue'
import TrendArea from '~/components/ui/TrendArea.vue'
import RankBars, { type RankItem } from '~/components/ui/RankBars.vue'
import type { DayCount } from '~/composables/useVoting'

export interface Race {
  id: string
  title: string
  votes: number
  coverage: number
  tied: boolean
  margin: number
  leader: string
  items: RankItem[]
}
const { voters, totalVotes, trend, races, accent, freeMax = 0, daysLeft = null } = defineProps<{
  voters: number
  totalVotes: number
  trend: DayCount[]
  races: Race[]
  accent: string
  /** the free plan's voter ceiling; 0 on a paid show */
  freeMax?: number
  daysLeft?: number | null
}>()

const sum = (pts: DayCount[]) => pts.reduce((s, p) => s + p.votes, 0)
const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// this week against the week before, when there was one
const week = computed(() => {
  const now = sum(trend.slice(-7))
  const before = sum(trend.slice(-14, -7))
  if (trend.length < 14 || !before) return { badge: now ? `+${now} this week` : 'quiet week', up: now > 0 }
  const pct = Math.round(((now - before) / before) * 100)
  return { badge: `${pct >= 0 ? '+' : ''}${pct}% vs last week`, up: pct >= 0 }
})
const today = computed(() => trend[trend.length - 1]?.votes ?? 0)
const best = computed(() => trend.reduce<DayCount | null>((b, p) => (!b || p.votes > b.votes ? p : b), null))

const cards = computed(() => [
  { label: 'Voters', value: String(voters), badge: week.value.badge, up: week.value.up, foot: `${today.value} ${today.value === 1 ? 'ballot' : 'ballots'} today` },
  { label: 'Votes cast', value: String(totalVotes), badge: `${voters ? (totalVotes / voters).toFixed(1) : '0'} per ballot`, up: null, foot: `across ${races.length} categories` },
  { label: 'Busiest day', value: best.value ? String(best.value.votes) : '0', badge: best.value ? day(best.value.date) : 'no votes yet', up: null, foot: 'ballots in one day' },
  freeMax
    ? { label: 'Free ceiling', value: `${Math.round((voters / freeMax) * 100)}%`, badge: `${voters} of ${freeMax}`, up: voters >= freeMax * 0.8 ? false : null, foot: `voting stops at ${freeMax} voters` }
    : { label: 'Days left', value: daysLeft === null ? '-' : String(daysLeft), badge: 'paid plan', up: null, foot: daysLeft === null ? 'voting is closed' : 'until voting closes' },
])

// the chart's range: only the ranges shorter than what there is
const RANGES = [
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
  { id: 0, label: 'All' },
]
const ranges = computed(() => RANGES.filter((r) => r.id === 0 || r.id < trend.length))
const range = ref(0)
const shown = computed(() => (range.value ? trend.slice(-range.value) : trend))

// the races that need the host: ties first, then the close ones
const FILTERS = [
  { id: 'all', label: 'All', test: (_: Race) => true },
  { id: 'tied', label: 'Tied', test: (r: Race) => r.tied },
  { id: 'close', label: 'Close', test: (r: Race) => !r.tied && r.votes > 0 && r.margin <= 2 },
  { id: 'empty', label: 'No votes', test: (r: Race) => !r.votes },
] as const
const filter = ref<(typeof FILTERS)[number]['id']>('all')
const rows = computed(() => races.filter(FILTERS.find((f) => f.id === filter.value)!.test))
const count = (id: (typeof FILTERS)[number]['id']) => races.filter(FILTERS.find((f) => f.id === id)!.test).length
const open = ref<string | null>(null)
const weakest = computed(() => [...races].sort((a, b) => a.votes - b.votes)[0])
</script>

<template>
  <div class="ss">
    <!-- four numbers, each with which way it is going -->
    <dl class="ss-cards">
      <div v-for="c in cards" :key="c.label" class="ss-card">
        <dt class="label">{{ c.label }}</dt>
        <!-- an arrow only where there is a direction: this week against the last, the ceiling -->
        <dd class="ss-badge" :class="c.up === true ? 'is-up' : c.up === false && 'is-down'">{{ c.badge }}</dd>
        <dd class="ss-n tnum">{{ c.value }}</dd>
        <dd class="ss-foot">{{ c.foot }}</dd>
      </div>
    </dl>

    <!-- when the ballots came in -->
    <section class="ss-panel">
      <header class="ss-head">
        <div>
          <h2 class="ss-h">Ballots per day</h2>
          <p class="ss-sub">{{ sum(shown) }} {{ range ? `in the last ${range} days` : 'in total' }}<template v-if="best">, busiest {{ day(best.date) }}</template></p>
        </div>
        <div v-if="ranges.length > 1" class="ss-seg" role="group" aria-label="Range">
          <button v-for="r in ranges" :key="r.id" type="button" :aria-pressed="range === r.id" @click="range = r.id">{{ r.label }}</button>
        </div>
      </header>
      <TrendArea v-if="shown.length > 1" class="mt-5" bare :points="shown" :accent="accent" label="Ballots per day" />
      <p v-else class="mt-4 text-sm text-ink-2">Voting started today. The curve needs a second day before it says anything.</p>
    </section>

    <!-- the categories, as a table to filter and open -->
    <section class="ss-panel">
      <header class="ss-head">
        <div>
          <h2 class="ss-h">The standing</h2>
          <p class="ss-sub">Yours to see. Voters get these numbers when you publish.</p>
        </div>
        <div class="ss-seg" role="group" aria-label="Show">
          <button v-for="f in FILTERS" :key="f.id" type="button" :aria-pressed="filter === f.id" @click="filter = f.id">
            {{ f.label }} <span class="tnum">{{ count(f.id) }}</span>
          </button>
        </div>
      </header>

      <div class="ss-scroll">
        <table class="ss-table">
          <thead>
            <tr><th>Category</th><th>Leading</th><th class="num">Lead</th><th class="num">Votes</th><th>Reach</th></tr>
          </thead>
          <tbody>
            <template v-for="r in rows" :key="r.id">
              <tr>
                <td>
                  <button type="button" class="ss-row" :aria-expanded="open === r.id" @click="open = open === r.id ? null : r.id">
                    <span class="ss-caret" aria-hidden="true">{{ open === r.id ? '−' : '+' }}</span>{{ r.title }}
                  </button>
                </td>
                <td>
                  <span v-if="r.tied" class="ss-tag is-warn">Tied</span>
                  <span v-else-if="r.votes">{{ r.leader }}</span>
                  <span v-else class="text-ink-muted">-</span>
                </td>
                <td class="num tnum">{{ r.votes && !r.tied ? `+${r.margin}` : '-' }}</td>
                <td class="num tnum">{{ r.votes }}</td>
                <td>
                  <span class="ss-reach"><i :style="{ width: `${r.coverage}%`, background: accent }" /></span>
                  <span class="tnum text-xs text-ink-muted">{{ r.coverage }}%</span>
                </td>
              </tr>
              <tr v-if="open === r.id" class="ss-detail">
                <td colspan="5">
                  <RankBars v-if="r.votes" :items="r.items" :accent="accent" />
                  <p v-else class="text-sm text-ink-muted">Nobody has picked in this category yet.</p>
                </td>
              </tr>
            </template>
            <tr v-if="!rows.length"><td colspan="5" class="text-sm text-ink-muted">Nothing here.</td></tr>
          </tbody>
        </table>
      </div>
      <p v-if="weakest && weakest.coverage < 100 && voters" class="ss-note">
        <b>{{ weakest.title }}</b> is the one people skip - {{ weakest.coverage }}% of ballots pick in it. Usually the
        category name is doing the confusing, not the nominees.
      </p>
    </section>
  </div>
</template>

<style scoped>
.ss { display: grid; gap: 20px; margin-top: 24px; }
.ss-cards { display: grid; gap: 12px; margin: 0; }
@media (min-width: 640px) { .ss-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .ss-cards { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.ss-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 6px 8px; padding: 18px; border: 2px solid rgb(var(--ink)); background: rgb(var(--s1)); }
.ss-card dd { margin: 0; }
.ss-badge { justify-self: end; padding: 2px 8px; border: 1.5px solid rgb(var(--hair2)); font-size: 11px; font-weight: 700; white-space: nowrap; color: rgb(var(--ink-2)); }
.ss-badge.is-up::before { content: '↗ '; color: rgb(var(--live)); }
.ss-badge.is-down::before { content: '↘ '; color: rgb(var(--warn)); }
.ss-n { grid-column: 1 / -1; font: 900 40px/1 var(--font-display), sans-serif; font-stretch: 112%; color: rgb(var(--ink)); }
.ss-foot { grid-column: 1 / -1; font-size: 13px; color: rgb(var(--ink-muted)); }
.ss-panel { padding: 20px; border: 2px solid rgb(var(--ink)); background: rgb(var(--s1)); }
.ss-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; }
.ss-h { font: 900 20px/1.1 var(--font-display), sans-serif; font-stretch: 112%; text-transform: uppercase; }
.ss-sub { margin-top: 4px; font-size: 13px; color: rgb(var(--ink-muted)); }
.ss-seg { display: inline-flex; border: 2px solid rgb(var(--ink)); }
.ss-seg button { height: 34px; padding: 0 12px; font-size: 12px; font-weight: 800; color: rgb(var(--ink-2)); }
.ss-seg button + button { border-left: 2px solid rgb(var(--ink)); }
.ss-seg button[aria-pressed='true'] { background: rgb(var(--ink)); color: rgb(var(--canvas)); }
.ss-seg button:focus-visible { outline: 3px solid rgb(var(--gold)); outline-offset: 2px; }
.ss-seg .tnum { margin-left: 4px; opacity: 0.7; }
.ss-scroll { margin-top: 16px; overflow-x: auto; }
.ss-table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: 14px; }
.ss-table th { padding: 8px 10px; border-bottom: 2px solid rgb(var(--ink)); text-align: left; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: rgb(var(--ink-muted)); }
.ss-table td { padding: 10px; border-bottom: 1px solid rgb(var(--hair)); vertical-align: middle; }
.ss-table .num { text-align: right; }
.ss-row { display: flex; align-items: center; gap: 10px; font-weight: 700; text-align: left; color: rgb(var(--ink)); }
.ss-row:hover { color: rgb(var(--gold-text)); }
.ss-row:focus-visible { outline: 3px solid rgb(var(--gold)); outline-offset: 2px; }
.ss-caret { display: grid; place-items: center; width: 18px; height: 18px; border: 1.5px solid rgb(var(--ink)); font-size: 13px; line-height: 1; }
.ss-tag { padding: 2px 8px; border: 1.5px solid currentColor; font-size: 11px; font-weight: 800; text-transform: uppercase; }
.ss-tag.is-warn { color: rgb(var(--warn)); }
.ss-reach { display: inline-block; width: 90px; height: 8px; margin-right: 8px; border: 1.5px solid rgb(var(--ink)); vertical-align: middle; }
.ss-reach i { display: block; height: 100%; }
.ss-detail td { padding: 16px 10px 20px 38px; background: rgb(var(--s2)); }
.ss-note { margin-top: 14px; font-size: 14px; color: rgb(var(--ink-2)); }
</style>
