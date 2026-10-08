<script setup lang="ts">
// "How an awards gets made", shown instead of told (review 2026-10-06): three
// steps on the left, one stage on the right that plays the step you are on -
// the builder fills itself in, the link unfurls in chat, the ceremony counts
// down to a winner. Steps advance on their own while the block is on screen and
// jump on a click. The step titles and lines are the page's text for search.
import { computed, ref, watch } from 'vue'
import ZinePen from './ZinePen.vue'
import { useLiveLoop } from '~/composables/useLiveLoop'

const STEPS = [
  { id: 'build', title: 'Build it', line: 'Name it, fill the categories, set the dates and the look. Five short steps.' },
  { id: 'share', title: 'Share the link', line: 'One page per awards. Paste it in chat, it unfolds into a card.' },
  { id: 'reveal', title: 'Reveal it live', line: 'Close voting, then announce each winner on stream.' },
] as const
const CATEGORY = 'Streamer of the year'
// the builder's own steps, walked through two beats each (review 2026-10-08: the
// scene showed typing nominees, the builder is a run of steps)
const BUILD = ['The show', 'Categories', 'Schedule', 'Look', 'Publish'] as const
const CATS = ['Streamer of the year', 'Clip of the year', 'Best emote']
const INKS = ['0 120 191', '255 72 176', '0 169 92', '255 108 47']

const root = ref<HTMLElement | null>(null)
const step = ref(0)
// each step runs on beats: the stage reads `beat` to know how far its scene is
const beat = ref(99)
// beats per step: the ceremony gets the longest, each count a full second and
// more (review 2026-10-08: 3-2-1 went by too fast to read)
const BEATS = [11, 9, 14]
const URL = 'awards.streamscharts.com/a/chat-awards-2026'

const buildAt = computed(() => Math.min(BUILD.length - 1, Math.floor(beat.value / 2)))
const count = computed(() => Math.max(0, 3 - Math.floor(beat.value / 2)))
const link = computed(() => URL.slice(0, beat.value * 12))

function go(i: number) {
  step.value = i
  beat.value = 0
}
// plays only once it is mostly on screen: one moving scene at a time
const { running } = useLiveLoop(root, 550, () => {
  beat.value += 1
  if (beat.value > BEATS[step.value]!) go((step.value + 1) % STEPS.length)
}, 0.5)
// with reduced motion (or before the first tick) every scene sits at its last
// beat; once the block is on screen the step plays from the top
watch(running, (on) => (beat.value = on ? 0 : 99))
</script>

<template>
  <section ref="root" class="zh">
    <div class="shell zh-grid">
      <div>
        <h2 class="zh-h zine-display">How an awards gets made</h2>
        <ol class="zh-steps">
          <li v-for="(s, i) in STEPS" :key="s.id">
            <button type="button" :aria-pressed="step === i" @click="go(i)">
              <span><b>{{ s.title }}</b><span>{{ s.line }}</span></span>
              <span v-if="step === i && running" class="zh-tape" :style="{ animationDuration: `${(BEATS[i]! + 1) * 0.55}s` }" />
            </button>
          </li>
        </ol>
      </div>

      <div class="zh-stage" aria-hidden="true">
        <!-- 01: the builder's steps, as tickets, each panel filling in -->
        <div v-if="step === 0" class="zh-scene zh-build">
          <ol class="zh-tix">
            <li v-for="(t, i) in BUILD" :key="t" :class="{ 'is-on': i === buildAt, 'is-done': i < buildAt }"><span class="tnum">0{{ i + 1 }}</span>{{ t }}</li>
          </ol>
          <div :key="buildAt" class="zh-panel zh-in">
            <template v-if="buildAt === 0">
              <p class="zh-label">Awards name</p>
              <p class="zh-typed">Chat Awards 2026</p>
            </template>
            <ul v-else-if="buildAt === 1" class="zh-cats">
              <li v-for="c in CATS" :key="c">{{ c }}<small>3 nominees</small></li>
            </ul>
            <template v-else-if="buildAt === 2">
              <p class="zh-label">Voting closes</p>
              <p class="zh-typed">Dec 20, 21:00</p>
            </template>
            <template v-else-if="buildAt === 3">
              <p class="zh-label">Ink</p>
              <p class="zh-inks"><i v-for="(c, k) in INKS" :key="c" :class="k === 1 && 'is-on'" :style="{ background: `rgb(${c})` }" /></p>
            </template>
            <p v-else class="zh-go zine-display">Published</p>
          </div>
        </div>

        <!-- 02: the link is pasted and unfolds into its card. Not a chat: the
             cover scene is already a chat (review 2026-10-08) -->
        <div v-else-if="step === 1" class="zh-scene zh-share">
          <p class="zh-label">Paste anywhere</p>
          <p class="zh-paste">{{ link }}<i v-if="link.length < URL.length" class="zh-caret" /></p>
          <div v-if="link.length >= URL.length" class="zh-card zh-in">
            <span class="zh-card-band" />
            <span class="zh-card-body"><b class="zine-display">Chat Awards 2026</b><small>Vote for the winners · 6 categories</small></span>
          </div>
        </div>

        <!-- 03: the ceremony counts down to a winner -->
        <div v-else class="zh-scene zh-reveal">
          <p class="zh-label">{{ CATEGORY }}</p>
          <p v-if="count > 0" :key="count" class="zh-count zine-display">{{ count }}</p>
          <template v-else>
            <p class="zh-and">And the winner is</p>
            <p class="zh-win zine-display"><ZinePen :seed="3">KaiCenat</ZinePen></p>
            <p class="zh-votes tnum">612 of 1 284 votes</p>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.zh { padding: 72px 0; border-top: 2px solid rgb(var(--ink)); }
.zh-grid { display: grid; gap: 40px; align-items: center; }
@media (min-width: 1024px) { .zh-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); } }
.zh-h { max-width: 12ch; font-size: clamp(36px, 5vw, 60px); line-height: 0.9; text-transform: uppercase; color: rgb(var(--gold)); }
.zh-steps { margin: 32px 0 0; padding: 0; list-style: none; }
.zh-steps button { position: relative; display: block; width: 100%; padding: 16px 0; text-align: left; border-top: 2px solid rgb(var(--ink)); color: rgb(var(--ink-muted)); transition: color 0.2s; }
.zh-steps li:last-child button { border-bottom: 2px solid rgb(var(--ink)); }
.zh-steps button[aria-pressed='true'] { color: rgb(var(--ink)); }
.zh-steps button[aria-pressed='true'] b { color: rgb(var(--gold)); }
.zh-steps b { display: block; font: 900 20px/1.1 var(--font-display), sans-serif; font-stretch: 118%; text-transform: uppercase; }
.zh-steps b + span { display: block; margin-top: 4px; font-size: 15px; line-height: 1.45; }
.zh-tape { position: absolute; left: 0; top: -2px; height: 4px; width: 100%; background: rgb(var(--gold)); transform-origin: left; animation: zh-tape linear both; }
@keyframes zh-tape { from { transform: scaleX(0); } }

.zh-stage { position: relative; min-height: 380px; border: 2.5px solid rgb(var(--ink)); background: radial-gradient(circle, rgb(var(--gold) / 0.35) 46%, transparent 48%) 0 0 / 9px 9px, rgb(var(--s2)); overflow: hidden; }
.zh-scene { position: absolute; inset: 28px; padding: 22px; border: 2.5px solid rgb(var(--ink)); background: rgb(var(--canvas)); animation: zh-scene 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes zh-scene { from { opacity: 0; transform: translateY(12px) rotate(-1deg); } }
.zh-label { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: rgb(var(--ink-muted)); }
.zh-typed { min-height: 1.3em; margin: 6px 0 18px; padding-bottom: 6px; border-bottom: 2px solid rgb(var(--ink)); font: 800 24px/1.2 var(--font-display), sans-serif; font-stretch: 112%; color: rgb(var(--gold-text)); }
.zh-caret { display: inline-block; width: 2px; height: 0.9em; margin-left: 2px; background: currentColor; vertical-align: -2px; animation: zv-blink 0.8s steps(2) infinite; }
@keyframes zv-blink { 50% { opacity: 0; } }
.zh-build { display: flex; flex-direction: column; gap: 18px; }
.zh-tix { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 0; padding: 0; list-style: none; }
.zh-tix li { display: grid; gap: 2px; padding: 8px 8px 7px; border: 1.5px dashed rgb(var(--ink)); font-size: 11px; font-weight: 800; color: rgb(var(--ink-muted)); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s; }
.zh-tix li + li { margin-left: -1.5px; }
.zh-tix span { font: 900 16px/1 var(--font-display), sans-serif; color: rgb(var(--hair)); }
.zh-tix li.is-done { color: rgb(var(--ink)); }
.zh-tix li.is-done span { color: rgb(var(--gold-text)); }
.zh-tix li.is-on { background: rgb(var(--ink)); color: rgb(var(--canvas)); transform: translateY(-4px); }
.zh-tix li.is-on span { color: rgb(var(--gold-text)); }
.zh-panel { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 16px; border: 2px solid rgb(var(--ink)); background: rgb(var(--s2)); }
.zh-cats { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.zh-cats li { display: flex; justify-content: space-between; padding: 8px 12px; border: 2px solid rgb(var(--ink)); background: rgb(var(--canvas)); font-weight: 800; }
.zh-cats small { font-weight: 600; color: rgb(var(--ink-muted)); }
.zh-inks { display: flex; gap: 10px; margin-top: 8px; }
.zh-inks i { width: 40px; height: 40px; border: 2px solid rgb(var(--ink)); }
.zh-inks i.is-on { outline: 3px solid rgb(var(--ink)); outline-offset: 3px; }
.zh-go { align-self: center; padding: 8px 16px 6px; border: 4px double rgb(var(--pink-ink)); color: rgb(var(--pink-ink)); font-size: 28px; text-transform: uppercase; transform: rotate(-4deg); }

.zh-share { display: flex; flex-direction: column; justify-content: center; gap: 12px; }
.zh-paste { min-height: 46px; padding: 12px 14px; border: 2px solid rgb(var(--ink)); background: rgb(var(--s2)); font: 600 15px/1.3 ui-monospace, Menlo, monospace; overflow-wrap: anywhere; }
.zh-card { display: grid; grid-template-columns: 120px minmax(0, 1fr); min-height: 120px; border: 2px solid rgb(var(--ink)); background: rgb(var(--canvas)); }
.zh-card-band { background: radial-gradient(circle, rgb(var(--pink)) 46%, transparent 48%) 0 0 / 7px 7px, rgb(var(--gold)); border-right: 2px solid rgb(var(--ink)); }
.zh-card-body { display: grid; gap: 4px; padding: 12px; }
.zh-card-body b { font-size: 20px; text-transform: uppercase; color: rgb(var(--gold)); }
.zh-card-body small { font-size: 12px; color: rgb(var(--ink-muted)); overflow-wrap: anywhere; }
.zh-in { animation: zh-scene 0.35s cubic-bezier(0.16, 1, 0.3, 1); }

.zh-reveal { display: grid; place-content: center; justify-items: center; gap: 10px; text-align: center; background: #0b0b0d; color: #f2f2ec; }
.zh-reveal .zh-label { color: #9a9aa2; }
.zh-count { font-size: 140px; line-height: 0.9; color: #5cace8; animation: zh-count 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes zh-count { from { opacity: 0; transform: scale(1.6); } }
.zh-and { font-size: 16px; color: #c9c9cf; }
.zh-win { font-size: 46px; animation: zh-count 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.zh-win :deep(.zine-pen-line) { mix-blend-mode: normal; }
.zh-votes { font-size: 13px; color: #9a9aa2; }
@media (prefers-reduced-motion: reduce) { .zh-scene, .zh-in, .zh-count, .zh-win { animation: none; } }
</style>
