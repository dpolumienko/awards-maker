<script setup lang="ts">
// Votes per day. Shape ported from the "Active Users Area Chart" on 21st.dev
// (gradient fill, 2px curve, horizontal grid only, no axis lines, peak in the
// caption) - drawn by hand in SVG rather than through its chart library, which
// is React-only, and because a chart library for one curve is a dependency we
// would carry forever.
//
// The geometry lives in a stretched 0..100 viewBox and everything that must not
// stretch - labels, gridlines, the hover dot - is HTML on top of it.
import { computed, ref, useId } from 'vue'
import type { DayCount } from '~/composables/useVoting'

const { points, accent = '#D9A441', label } = defineProps<{
  points: DayCount[]
  accent?: string
  /** What the curve counts, for the screen-reader table and the hover tooltip. */
  label: string
}>()

// one gradient per instance; two charts on a page must not share a fill
const gradientId = `trend-fill-${useId()}`

const max = computed(() => {
  const top = Math.max(...points.map((p) => p.votes), 1)
  // round to something a person reads off an axis: 1,2,5 x 10^n
  const pow = 10 ** Math.floor(Math.log10(top))
  const step = [1, 2, 5, 10].find((s) => s * pow >= top)! * pow
  return step
})
const total = computed(() => points.reduce((sum, p) => sum + p.votes, 0))
const peak = computed(() => points.reduce((best, p) => (p.votes > best.votes ? p : best), points[0]!))

const x = (i: number) => (points.length < 2 ? 0 : (i / (points.length - 1)) * 100)
const y = (v: number) => 100 - (v / max.value) * 100

/**
 * Monotone cubic (Fritsch-Carlson), the same curve type the original chart uses.
 * A plain spline overshoots: a quiet day between two busy ones bulges the line
 * below zero, and a chart that dips under zero is drawing votes nobody cast.
 */
const curve = computed(() => {
  const xs = points.map((_, i) => x(i))
  const ys = points.map((p) => y(p.votes))
  const n = points.length
  if (n < 2) return ''

  const delta = xs.slice(0, -1).map((_, i) => (ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!))
  const m = ys.map((_, i) =>
    i === 0 ? delta[0]! : i === n - 1 ? delta[n - 2]! : (delta[i - 1]! + delta[i]!) / 2,
  )
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i]! / delta[i]!
    const b = m[i + 1]! / delta[i]!
    if (a < 0 || b < 0) {
      if (a < 0) m[i] = 0
      if (b < 0) m[i + 1] = 0
      continue
    }
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * delta[i]!
      m[i + 1] = t * b * delta[i]!
    }
  }

  let d = `M ${xs[0]} ${ys[0]}`
  for (let i = 0; i < n - 1; i++) {
    const dx = (xs[i + 1]! - xs[i]!) / 3
    d += ` C ${xs[i]! + dx} ${ys[i]! + m[i]! * dx}, ${xs[i + 1]! - dx} ${ys[i + 1]! - m[i + 1]! * dx}, ${xs[i + 1]} ${ys[i + 1]}`
  }
  return d
})
const area = computed(() => (curve.value ? `${curve.value} L 100 100 L 0 100 Z` : ''))

// Hover reads the nearest day; it is a convenience on top of the table below,
// not the only way to the numbers.
const hover = ref<number | null>(null)
function onMove(e: MouseEvent) {
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const fraction = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
  hover.value = Math.round(fraction * (points.length - 1))
}

const day = (iso: string, long = false) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(long ? { weekday: 'short' } : {}),
  })

/** First, middle and last - three labels fit on a phone, ten do not. */
const ticks = computed(() => {
  if (points.length < 2) return []
  const idx = points.length >= 5 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0, points.length - 1]
  return idx.map((i) => ({ i, at: x(i), text: day(points[i]!.date) }))
})
</script>

<template>
  <figure v-if="points.length >= 2" class="m-0">
    <figcaption class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <span class="label">{{ label }}</span>
      <span class="tnum text-sm text-ink-muted">
        Busiest day {{ day(peak.date) }} · {{ peak.votes }}
      </span>
    </figcaption>

    <div
      class="relative mt-4 h-44 w-full"
      @mousemove="onMove"
      @mouseleave="hover = null"
    >
      <!-- grid: three lines, values on the left, no axis rules -->
      <div v-for="(g, i) in [max, Math.round(max / 2), 0]" :key="i" class="pointer-events-none absolute inset-x-0 flex items-center gap-2" :style="{ top: `${i * 50}%` }">
        <span class="tnum w-6 flex-none text-right text-[11px] leading-none text-ink-muted">{{ g }}</span>
        <span class="h-px flex-1 bg-hair" />
      </div>

      <svg
        class="absolute inset-y-0 right-0 h-full w-[calc(100%-2rem)] overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="accent" stop-opacity="0.34" />
            <stop offset="100%" :stop-color="accent" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g class="js-trend">
          <path :d="area" :fill="`url(#${gradientId})`" />
          <path
            :d="curve"
            fill="none"
            :stroke="accent"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </g>
      </svg>

      <!-- hover marker: HTML, so a circle stays a circle in a stretched viewBox -->
      <div
        v-if="hover !== null && points[hover]"
        class="pointer-events-none absolute bottom-0 top-0 w-px bg-hair2"
        :style="{ left: `calc(2rem + ${x(hover)}% - ${x(hover) / 100} * 2rem)` }"
      >
        <span
          class="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-pill ring-2 ring-canvas"
          :style="{ top: `${y(points[hover]!.votes)}%`, background: accent }"
        />
        <span
          class="tnum absolute -top-1 left-1/2 w-max -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-btn border border-hair bg-s2 px-2.5 py-1.5 text-xs"
        >
          {{ day(points[hover]!.date, true) }} · <span class="font-semibold">{{ points[hover]!.votes }}</span>
        </span>
      </div>
    </div>

    <div class="relative ml-8 mt-2 h-4">
      <span
        v-for="t in ticks"
        :key="t.i"
        class="tnum absolute whitespace-nowrap text-[11px] text-ink-muted"
        :style="{ left: `${t.at}%`, transform: t.at === 0 ? 'none' : t.at === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }"
      >{{ t.text }}</span>
    </div>

    <!-- the same numbers, readable without the picture -->
    <table class="sr-only">
      <caption>{{ label }}: {{ total }} in total</caption>
      <thead><tr><th scope="col">Day</th><th scope="col">Votes</th></tr></thead>
      <tbody>
        <tr v-for="p in points" :key="p.date"><th scope="row">{{ day(p.date, true) }}</th><td>{{ p.votes }}</td></tr>
      </tbody>
    </table>
  </figure>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .js-trend {
    animation: trend-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes trend-in {
    from {
      clip-path: inset(0 100% 0 0);
    }
  }
}
</style>
