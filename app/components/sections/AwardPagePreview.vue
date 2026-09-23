<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import SectionShell from './SectionShell.vue'
import UiBadge from '../ui/UiBadge.vue'
import PlatformDot from '../ui/PlatformDot.vue'
import { prefersReducedMotion } from '~/composables/useReveal'
import UiIcon from '../ui/UiIcon.vue'

// A mock of a published awards page. Votes tick so it reads as live, which is
// what the product actually is.
const categories = ref([
  { name: 'Best moment of the year', votes: 612 },
  { name: 'Mod MVP', votes: 548 },
  { name: 'Best emote', votes: 501 },
  { name: 'Rage quit of the year', votes: 436 },
])
const topVotes = computed(() => Math.max(...categories.value.map((c) => c.votes)))
const picked = ref(1)
const flashed = ref(-1)
const votersNow = ref(218)
const nominees = [
  { name: 'ishowspeed', sub: 'YouTube · 41.2M followers', initial: 'I' },
  { name: 'maryana', sub: 'Twitch · 98K followers', initial: 'M' },
  { name: 'The 3am raid', sub: 'Clip · 2026', initial: '3' },
]

let ticker: ReturnType<typeof setInterval> | undefined
// WCAG 2.2.2: the demo settles after a few updates rather than ticking forever.
const MAX_TICKS = 6
let ticks = 0
onMounted(() => {
  if (prefersReducedMotion()) return
  ticker = setInterval(() => {
    if (++ticks > MAX_TICKS) return clearInterval(ticker)
    const i = Math.floor(Math.random() * categories.value.length)
    categories.value[i]!.votes += 1
    votersNow.value += Math.random() > 0.6 ? 1 : 0
    flashed.value = i
    setTimeout(() => (flashed.value = -1), 900)
  }, 1600)
})
onBeforeUnmount(() => clearInterval(ticker))
</script>

<template>
  <SectionShell
    id="page"
    heading="This is the page your awards get"
    intro="Publishing gives you a page like this one: your nominees, a live vote count, the ceremony date, and the winners once you announce them. It stays online after the show and Google can index it."
  >
<!-- live example of a published awards page -->
    <div class="js-reveal mt-6 grid overflow-hidden rounded-card border border-hair bg-s1 lg:grid-cols-[1.1fr_1fr]">
      <div class="border-b border-hair lg:border-b-0 lg:border-r">
        <!-- cover band: category art under a scrim, the way a published page looks -->
        <div class="relative h-28 overflow-hidden border-b border-hair bg-[linear-gradient(135deg,#2a2118,#0E0E10)]">
          <img :src="asset('/img/icons/cat-clip.svg')" alt="" aria-hidden="true" class="absolute -right-4 -top-3 h-32 w-32 text-gold opacity-20" />
          <span aria-hidden="true" class="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.85))]" />
          <span class="absolute bottom-3 left-8 flex items-center gap-2">
            <span class="grid h-7 w-7 place-items-center rounded-pill bg-s3 text-[11px] font-bold text-ink-muted">ST</span>
            <span class="micro">ishowspeed</span>
          </span>
        </div>
        <div class="p-8">
        <UiBadge tone="live">Voting open</UiBadge>
        <p class="mt-4 text-[32px] font-bold uppercase leading-[1.05] tracking-heading">Chat Awards 2026</p>
        <p class="text-ink-2">Hosted by ishowspeed · 5 categories · closes 12 Dec</p>

        <p class="label mt-8">Best moment of the year</p>
        <div class="mt-3 flex flex-col gap-2">
          <button
            v-for="(n, i) in nominees"
            :key="n.name"
            type="button"
            :aria-pressed="picked === i"
            :class="[
              'flex w-full items-center gap-3 rounded-btn border p-3 text-left transition-[background-color,border-color] duration-200',
              picked === i ? 'border-gold bg-gold/[0.12]' : 'border-hair bg-s1 hover:border-hair2 hover:bg-s2',
            ]"
            @click="picked = i"
          >
            <span class="grid h-8 w-8 flex-none place-items-center rounded-pill bg-s3 text-[13px] font-bold text-ink-muted">
              {{ n.initial }}
            </span>
            <span>
              <span class="block font-semibold">{{ n.name }}</span>
              <span class="block text-sm text-ink-2">{{ n.sub }}</span>
            </span>
            <span
              aria-hidden="true"
              :class="[
                'ml-auto grid h-5 w-5 place-items-center rounded-btn bg-gold text-[13px] font-extrabold text-canvas transition-transform duration-300 ease-gala',
                picked === i ? 'scale-100' : 'scale-0',
              ]"
            ><UiIcon name="check" :size="12" /></span>
          </button>
        </div>
        <p class="mt-4 text-sm text-ink-muted">One vote per category, Twitch login on submit</p>
        </div>
      </div>

      <div class="flex flex-col gap-3 bg-canvas p-8">
        <p class="label">Voting closes in</p>
        <div class="flex gap-3">
          <div v-for="[n, u] in [['04', 'Days'], ['11', 'Hrs'], ['38', 'Min']]" :key="u" class="min-w-[70px] rounded-btn border border-hair p-3 text-center">
            <b class="tnum block text-[28px] font-bold leading-none">{{ n }}</b>
            <span class="micro">{{ u }}</span>
          </div>
        </div>
        <div class="mt-6 flex items-center justify-between gap-3">
            <p class="label">Categories</p>
            <span class="rounded-pill border border-hair px-2.5 py-0.5 text-[11px] uppercase tracking-micro text-ink-muted">Host view</span>
          </div>
        <ul class="m-0 list-none p-0">
          <li
            v-for="(c, i) in categories"
            :key="c.name"
            class="border-b border-hair py-3 transition-colors duration-500 last:border-b-0"
            :class="flashed === i && 'bg-gold/[0.07]'"
          >
            <span class="flex items-center justify-between">
            <span>{{ c.name }}</span>
            <span class="flex items-center gap-2">
              <span
                class="micro tnum transition-colors duration-500"
                :class="flashed === i ? 'text-gold-text' : 'text-ink-muted'"
              >{{ c.votes }} votes</span>
              <span
                class="micro text-live transition-opacity duration-300"
                :class="flashed === i ? 'opacity-100' : 'opacity-0'"
              >+1</span>
            </span>
            </span>
            <span class="mt-2 block h-1.5 w-full overflow-hidden rounded-pill bg-s2">
              <span
                class="block h-full w-full origin-left rounded-pill bg-gold transition-transform duration-700 ease-gala"
                :style="{ transform: `scaleX(${(c.votes / topVotes).toFixed(3)})` }"
              />
            </span>
          </li>
        </ul>
        <p class="micro mt-4 flex items-center gap-2">
          <span class="block h-1.5 w-1.5 rounded-pill bg-live" />
          <span class="tnum text-live">{{ votersNow }}</span> voting right now
        </p>
        <p class="mt-auto pt-4 text-sm text-ink-muted">Example of a published awards page</p>
      </div>
    </div>
  </SectionShell>
</template>
