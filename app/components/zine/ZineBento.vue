<script setup lang="ts">
// What the tool does, as four small working scenes rather than four paragraphs
// (review 2026-10-06; reference: the tiles on streamscharts.com/api). Each tile
// is a title, one line and a loop: the nominee search types, a second ballot is
// refused, the share card flips from nominated to winner, the platforms light up
// in turn. One shared clock drives them all, only while the grid is on screen.
import { computed, ref } from 'vue'
import ZinePen from './ZinePen.vue'
import PlatformDot from '~/components/ui/PlatformDot.vue'
import { useLiveLoop } from '~/composables/useLiveLoop'

const root = ref<HTMLElement | null>(null)
const t = ref(0)
useLiveLoop(root, 450, () => (t.value += 1))

// 1. search: a query types itself, then its results drop in
const QUERIES = [
  { q: 'kai', hits: [{ name: 'KaiCenat', kind: 'Twitch', p: 'twitch' as const }] },
  { q: 'the 3am raid', hits: [{ name: 'the 3am raid', kind: 'Clip', p: null }, { name: 'the 3am raid', kind: 'Text', p: null }] },
  { q: 'speed', hits: [{ name: 'ishowspeed', kind: 'YouTube', p: 'youtube' as const }] },
]
const qi = computed(() => Math.floor(t.value / 14) % QUERIES.length)
const qt = computed(() => t.value % 14)
const query = computed(() => QUERIES[qi.value]!.q.slice(0, qt.value * 2))
const hits = computed(() => (qt.value >= 8 || t.value === 0 ? QUERIES[qi.value]!.hits : []))

// 2. one vote each: the second ballot gets the stamp
const refused = computed(() => t.value === 0 || t.value % 10 >= 5)

// 3. the share card flips
const won = computed(() => t.value === 0 || Math.floor(t.value / 7) % 2 === 1)

// 4. platforms light in turn
const PLATS = ['twitch', 'kick', 'youtube'] as const
const lit = computed(() => (t.value === 0 ? -1 : Math.floor(t.value / 3) % PLATS.length))
</script>

<template>
  <section ref="root" class="zb2">
    <div class="shell">
      <h2 class="zb2-h zine-display">Streamer awards for your community</h2>
      <div class="zb2-grid">
        <article class="zb2-tile zb2-wide">
          <h3>Nominate anyone</h3>
          <p>Any channel we track, a clip, an image, or a name typed in.</p>
          <div class="zb2-art" aria-hidden="true">
            <p class="zb2-search"><span>&#8981;</span>{{ query }}<i class="zb2-caret" /></p>
            <TransitionGroup name="zb2-drop" tag="ul" class="zb2-hits">
              <li v-for="h in hits" :key="qi + h.kind"><PlatformDot v-if="h.p" :platform="h.p" :label="false" :size="14" /><b>{{ h.name }}</b><small>{{ h.kind }}</small></li>
            </TransitionGroup>
          </div>
        </article>

        <article class="zb2-tile">
          <h3>One vote each</h3>
          <p>One account, one ballot. Always on.</p>
          <div class="zb2-art zb2-ballots zb2-pink" aria-hidden="true">
            <div class="zb2-ballot"><span class="zb2-box is-on" />Best emote</div>
            <div class="zb2-ballot zb2-second" :class="refused && 'is-refused'"><span class="zb2-box" />Best emote<span class="zb2-stamp">Refused</span></div>
          </div>
        </article>

        <article class="zb2-tile">
          <h3>Cards worth sharing</h3>
          <p>Every nominee and winner gets one.</p>
          <div class="zb2-art" aria-hidden="true">
            <div class="zb2-flip" :class="won && 'is-won'">
              <div class="zb2-face"><span>Nominated</span><b class="zine-display">QTCinderella</b></div>
              <div class="zb2-face zb2-back"><span>Winner</span><b class="zine-display"><ZinePen :on="won" :seed="5">QTCinderella</ZinePen></b></div>
            </div>
          </div>
        </article>

        <article class="zb2-tile zb2-wide">
          <h3>Twitch, Kick, YouTube</h3>
          <p>Nominees from all three, voters sign in with Twitch or Kick.</p>
          <div class="zb2-art zb2-plats zb2-ink" aria-hidden="true">
            <span v-for="(p, i) in PLATS" :key="p" class="zb2-plat" :class="lit === i && 'is-lit'"><PlatformDot :platform="p" /></span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.zb2 { padding: 72px 0; border-top: 2px solid rgb(var(--ink)); }
.zb2-h { max-width: 20ch; font-size: clamp(36px, 5vw, 60px); line-height: 0.9; text-transform: uppercase; color: rgb(var(--gold)); text-wrap: balance; }
.zb2-grid { display: grid; gap: 18px; margin-top: 36px; }
@media (min-width: 900px) { .zb2-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .zb2-wide { grid-column: span 2; } }
.zb2-tile { display: flex; flex-direction: column; padding: 20px; border: 2.5px solid rgb(var(--ink)); background: rgb(var(--canvas)); }
.zb2-tile h3 { font: 900 22px/1.05 var(--font-display), sans-serif; font-stretch: 120%; text-transform: uppercase; }
.zb2-tile > p { margin-top: 6px; font-size: 15px; color: rgb(var(--ink-2)); }
.zb2-art { position: relative; margin-top: 18px; flex: 1; min-height: 150px; padding: 16px; border: 2px solid rgb(var(--ink)); background: radial-gradient(circle, rgb(var(--gold) / 0.3) 46%, transparent 48%) 0 0 / 8px 8px, rgb(var(--s2)); overflow: hidden; }

/* backgrounds differ tile to tile: blue dots, pink dots, plain, solid ink */
.zb2-pink { background: radial-gradient(circle, rgb(var(--pink) / 0.35) 46%, transparent 48%) 0 0 / 8px 8px, rgb(var(--s2)); }
.zb2-ink { background: rgb(var(--ink)); }
.zb2-ink .zb2-plat { border-color: rgb(var(--canvas)); }
.zb2-ink .zb2-plat.is-lit { box-shadow: 6px 6px 0 rgb(var(--gold)); }
.zb2-search { display: flex; align-items: center; gap: 8px; height: 46px; padding: 0 14px; border: 2px solid rgb(var(--ink)); background: rgb(var(--canvas)); font: 700 18px/1 var(--font-body), sans-serif; }
.zb2-search span { color: rgb(var(--gold-text)); }
.zb2-caret { width: 2px; height: 20px; background: rgb(var(--ink)); animation: zb2-blink 0.8s steps(2) infinite; }
@keyframes zb2-blink { 50% { opacity: 0; } }
.zb2-hits { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.zb2-hits li { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border: 2px solid rgb(var(--ink)); background: rgb(var(--canvas)); }
.zb2-hits b { font-weight: 800; }
.zb2-hits small { margin-left: auto; font-size: 13px; color: rgb(var(--ink-muted)); }
.zb2-drop-enter-from { opacity: 0; transform: translateY(-8px); }
.zb2-drop-enter-active { transition: opacity 0.25s, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.zb2-drop-leave-active { display: none; }

.zb2-ballots { display: grid; align-content: center; gap: 10px; }
.zb2-ballot { position: relative; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 2px solid rgb(var(--ink)); background: rgb(var(--canvas)); font: 800 16px/1 var(--font-display), sans-serif; font-stretch: 112%; transition: opacity 0.3s; }
.zb2-box { width: 16px; height: 16px; border: 2px solid rgb(var(--ink)); }
.zb2-box.is-on { background: rgb(var(--ink)); }
.zb2-second.is-refused { opacity: 0.75; text-decoration: line-through; }
.zb2-stamp { position: absolute; right: 10px; top: 50%; padding: 4px 8px 3px; border: 3px double rgb(var(--danger)); color: rgb(var(--danger)); background: rgb(var(--canvas)); font: 800 12px/1 var(--font-display), sans-serif; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; transform: translateY(-50%) rotate(-8deg) scale(2.2); opacity: 0; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s; }
.is-refused .zb2-stamp { transform: translateY(-50%) rotate(-8deg) scale(1); opacity: 1; }

.zb2-flip { position: relative; height: 120px; perspective: 700px; }
.zb2-face { position: absolute; inset: 0; display: grid; align-content: center; gap: 8px; padding: 14px; border: 2px solid rgb(var(--ink)); background: rgb(var(--canvas)); backface-visibility: hidden; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.zb2-face span { font: 900 13px/1 var(--font-display), sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: rgb(var(--gold-text)); }
.zb2-face b { font-size: 22px; text-transform: uppercase; overflow-wrap: anywhere; }
.zb2-back { transform: rotateY(180deg); background: rgb(var(--gold)); color: #fff; }
.zb2-back span { color: #fff; }
.zb2-back :deep(.zine-pen-line) { mix-blend-mode: normal; }
.is-won .zb2-face:not(.zb2-back) { transform: rotateY(-180deg); }
.is-won .zb2-back { transform: rotateY(0); }

.zb2-plats { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }
.zb2-plat { display: grid; place-items: center; padding: 14px 20px; border: 2px solid rgb(var(--ink)); background: rgb(var(--canvas)); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s; }
.zb2-plat :deep(span) { font-size: 16px; font-weight: 800; }
.zb2-plat.is-lit { transform: translateY(-6px); box-shadow: 6px 6px 0 rgb(var(--ink)); }
@media (prefers-reduced-motion: reduce) { .zb2-face, .zb2-stamp, .zb2-plat { transition: none; } }
</style>
