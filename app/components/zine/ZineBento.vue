<script setup lang="ts">
// What the tool does, in three tiles (review 2026-10-08: four looping tiles were
// too much in one block, and "one vote each" is obvious). One tile moves - the
// nominee search types and its results land - and the other two hold still: the
// share card turns over when you point at it, the platforms just sit there.
// The search's results area has a fixed height, so nothing below it shifts
// while it types (it used to grow by a row and push the page). Then one result is
// pointed at and picked (review 2026-10-08: the scene stopped at the results),
// and the platforms get the pen when pointed at.
import { computed, ref } from 'vue'
import ZinePen from './ZinePen.vue'
import PlatformDot from '~/components/ui/PlatformDot.vue'
import { useLiveLoop } from '~/composables/useLiveLoop'

const root = ref<HTMLElement | null>(null)
const t = ref(0)
useLiveLoop(root, 370, () => (t.value += 1))

// a query types itself, then its results land; t = 0 is the resting state
// a channel, a clip, an image - every kind of nominee shows up in turn
// (review 2026-10-08: clips and images were not visible as options)
type Hit = { name: string; kind: string; p?: 'twitch' | 'kick' | 'youtube'; thumb?: 'clip' | 'image' }
const QUERIES: { q: string; hits: Hit[]; pick: number }[] = [
  { q: 'the 3am raid', hits: [{ name: 'The 3am raid', kind: 'Clip', thumb: 'clip' }, { name: 'the 3am raid', kind: 'Text' }], pick: 0 },
  { q: 'kai', hits: [{ name: 'KaiCenat', kind: 'Twitch', p: 'twitch' }, { name: 'kai_clutch.png', kind: 'Image', thumb: 'image' }], pick: 1 },
  { q: 'pogfrog', hits: [{ name: 'PogFrog', kind: 'Image', thumb: 'image' }, { name: 'PogFrog moment', kind: 'Clip', thumb: 'clip' }], pick: 0 },
]
// one query a cycle: types (0-7), results land (8), one is pointed at (11), picked (13), held
const CYCLE = 20
const qi = computed(() => Math.floor(t.value / CYCLE) % QUERIES.length)
const qt = computed(() => (t.value === 0 ? CYCLE - 1 : t.value % CYCLE))
const query = computed(() => QUERIES[qi.value]!.q.slice(0, qt.value * 2))
const hits = computed(() => (qt.value >= 8 ? QUERIES[qi.value]!.hits : []))
const hitState = (k: number) => (k !== QUERIES[qi.value]!.pick ? '' : qt.value >= 13 ? 'is-picked' : qt.value >= 11 ? 'is-pointed' : '')

const PLATS = ['twitch', 'kick', 'youtube'] as const
const hovered = ref<string | null>(null)
</script>

<template>
  <section ref="root" class="zb2">
    <div class="shell">
      <h2 class="zb2-h zine-display">Streamer awards for your community</h2>
      <div class="zb2-grid">
        <article class="zb2-tile zb2-tall">
          <h3>Nominate anyone</h3>
          <p>Any channel we track, a clip, an image, or a name typed in.</p>
          <div class="zb2-art" aria-hidden="true">
            <p class="zb2-search"><span>&#8981;</span>{{ query }}<i class="zb2-caret" /></p>
            <TransitionGroup name="zb2-drop" tag="ul" class="zb2-hits">
              <li v-for="(h, k) in hits" :key="qi + h.kind" :class="hitState(k)">
                <span v-if="h.thumb" class="zb2-thumb" :class="`is-${h.thumb}`" />
                <PlatformDot v-else-if="h.p" :platform="h.p" :label="false" :size="14" />
                <b>{{ h.name }}</b><small>{{ hitState(k) === 'is-picked' ? 'Nominated' : h.kind }}</small>
              </li>
            </TransitionGroup>
          </div>
        </article>

        <article class="zb2-tile zb2-card">
          <h3>Cards worth sharing</h3>
          <p>Every nominee and winner gets one.</p>
          <div class="zb2-art" aria-hidden="true">
            <div class="zb2-flip">
              <div class="zb2-face"><span>Nominated</span><b class="zine-display">QTCinderella</b></div>
              <div class="zb2-face zb2-back"><span>Winner</span><b class="zine-display"><ZinePen :seed="5">QTCinderella</ZinePen></b></div>
            </div>
          </div>
        </article>

        <article class="zb2-tile">
          <h3>Twitch, Kick, YouTube</h3>
          <p>Nominees from all three. Voters sign in with Twitch or Kick.</p>
          <div class="zb2-art zb2-plats zb2-ink" aria-hidden="true">
            <span v-for="p in PLATS" :key="p" class="zb2-plat" @mouseenter="hovered = p" @mouseleave="hovered = null">
              <ZinePen :on="hovered === p"><PlatformDot :platform="p" /></ZinePen>
            </span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.zb2 { padding: 72px 0; border-top: 2px solid rgb(var(--ink)); }
.zb2-h { max-width: 20ch; font-size: clamp(36px, 5vw, 60px); line-height: 0.9; text-transform: uppercase; color: rgb(var(--gold)); text-wrap: balance; }
/* an asymmetric trio: the one moving tile tall on the left, two still ones stacked right */
.zb2-grid { display: grid; gap: 18px; margin-top: 36px; }
@media (min-width: 900px) { .zb2-grid { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); } .zb2-tall { grid-row: span 2; } }
.zb2-tile { display: flex; flex-direction: column; padding: 20px; border: 2.5px solid rgb(var(--ink)); background: rgb(var(--canvas)); }
.zb2-tile h3 { font: 900 22px/1.05 var(--font-display), sans-serif; font-stretch: 120%; text-transform: uppercase; }
.zb2-tile > p { margin-top: 6px; font-size: 15px; color: rgb(var(--ink-2)); }
.zb2-art { position: relative; margin-top: 18px; flex: 1; padding: 16px; border: 2px solid rgb(var(--ink)); background: radial-gradient(circle, rgb(var(--gold) / 0.3) 46%, transparent 48%) 0 0 / 8px 8px, rgb(var(--s2)); overflow: hidden; }
.zb2-ink { background: rgb(var(--ink)); }
.zb2-tall .zb2-art { display: flex; flex-direction: column; justify-content: center; }

.zb2-search { display: flex; align-items: center; gap: 8px; height: 46px; padding: 0 14px; border: 2px solid rgb(var(--ink)); background: rgb(var(--canvas)); font: 700 18px/1 var(--font-body), sans-serif; }
.zb2-search span { color: rgb(var(--gold-text)); }
.zb2-caret { width: 2px; height: 20px; background: rgb(var(--ink)); animation: zb2-blink 0.8s steps(2) infinite; }
@keyframes zb2-blink { 50% { opacity: 0; } }
/* room for two results whether there are 0, 1 or 2: the tile never changes height */
.zb2-hits { height: 104px; margin: 8px 0 0; padding: 0; list-style: none; display: grid; align-content: start; gap: 6px; }
.zb2-hits li { display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 14px; border: 2px solid rgb(var(--ink)); background: rgb(var(--canvas)); }
.zb2-hits b { font-weight: 800; }
/* a clip and an image get a frame of their own, like in the builder */
.zb2-thumb { width: 44px; height: 26px; flex: none; border: 1.5px solid rgb(var(--ink)); }
.zb2-thumb.is-image { background: radial-gradient(circle, rgb(var(--pink)) 46%, transparent 48%) 0 0 / 6px 6px, rgb(var(--gold) / 0.3); }
.zb2-thumb.is-clip { display: grid; place-items: center; background: #0b0b0d; }
.zb2-thumb.is-clip::after { content: ''; border-left: 8px solid #f2f2ec; border-block: 5px solid transparent; }
.zb2-hits small { margin-left: auto; font-size: 13px; color: rgb(var(--ink-muted)); }
.zb2-hits li { transition: background-color 0.2s, color 0.2s, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.zb2-hits li.is-pointed { outline: 3px solid rgb(var(--gold)); outline-offset: -1px; transform: translateX(4px); }
.zb2-hits li.is-picked { background: rgb(var(--ink)); color: rgb(var(--canvas)); transform: translateX(4px); }
.zb2-hits li.is-picked small { color: rgb(var(--canvas)); font-weight: 800; }
.zb2-hits li.is-picked small::before { content: 'OK'; margin-right: 8px; padding: 1px 5px; border: 3px double currentColor; font: 800 10px/1.2 var(--font-display), sans-serif; }
.zb2-drop-enter-from { opacity: 0; transform: translateY(-8px); }
.zb2-drop-enter-active { transition: opacity 0.25s, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.zb2-drop-leave-active { display: none; }

/* the card turns over only when pointed at: feedback, not a loop */
.zb2-flip { position: relative; height: 120px; perspective: 700px; }
.zb2-face { position: absolute; inset: 0; display: grid; align-content: center; gap: 8px; padding: 14px; border: 2px solid rgb(var(--ink)); background: rgb(var(--canvas)); backface-visibility: hidden; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.zb2-face > span { font: 900 13px/1 var(--font-display), sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: rgb(var(--gold-text)); }
.zb2-face b { font-size: 22px; text-transform: uppercase; overflow-wrap: anywhere; }
.zb2-back { transform: rotateY(180deg); background: rgb(var(--gold)); color: #fff; }
.zb2-back > span { color: #fff; }
.zb2-back :deep(.zine-pen-line) { mix-blend-mode: normal; }
.zb2-card:hover .zb2-face:not(.zb2-back) { transform: rotateY(-180deg); }
.zb2-card:hover .zb2-back { transform: rotateY(0); }

.zb2-plats { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
.zb2-plat { display: grid; place-items: center; padding: 12px 18px; border: 2px solid rgb(var(--canvas)); background: rgb(var(--canvas)); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.zb2-plat:hover { transform: translateY(-4px) rotate(-2deg); }
.zb2-plat :deep(span) { font-size: 16px; font-weight: 800; }
@media (prefers-reduced-motion: reduce) { .zb2-face, .zb2-plat, .zb2-hits li { transition: none; } .zb2-plat:hover { transform: none; } }
</style>
