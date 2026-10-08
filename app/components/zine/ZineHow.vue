<script setup lang="ts">
// "How an awards gets made", shown instead of told (review 2026-10-06): three
// steps on the left, one stage on the right that plays the step you are on -
// the builder fills itself in, the link unfurls in chat, the ceremony counts
// down to a winner. Steps advance on their own while the block is on screen and
// jump on a click. The step titles and lines are the page's text for search.
import { computed, ref, watch } from 'vue'
import ZinePen from './ZinePen.vue'
import PlatformDot from '~/components/ui/PlatformDot.vue'
import { useLiveLoop } from '~/composables/useLiveLoop'

const STEPS = [
  { id: 'build', title: 'Build it', line: 'Categories, nominees from Twitch, Kick and YouTube, or anything typed in.' },
  { id: 'share', title: 'Share the link', line: 'One page per awards. Paste it in chat, it unfolds into a card.' },
  { id: 'reveal', title: 'Reveal it live', line: 'Close voting, then announce each winner on stream.' },
] as const
const CATEGORY = 'Streamer of the year'
const NOMS = [
  { name: 'KaiCenat', platform: 'twitch' as const },
  { name: 'ishowspeed', platform: 'youtube' as const },
  { name: 'xQc', platform: 'kick' as const },
]

const root = ref<HTMLElement | null>(null)
const step = ref(0)
// each step runs on beats: the stage reads `beat` to know how far its scene is
const beat = ref(99)
// beats per step: the ceremony gets the longest, each count a full second and
// more (review 2026-10-08: 3-2-1 went by too fast to read)
const BEATS = [9, 9, 14]
const URL = 'awards.streamscharts.com/a/chat-awards-2026'

const typed = computed(() => CATEGORY.slice(0, Math.min(CATEGORY.length, beat.value * 4)))
const shown = computed(() => Math.max(0, Math.min(NOMS.length, beat.value - 4)))
const count = computed(() => Math.max(0, 3 - Math.floor(beat.value / 2)))
const link = computed(() => URL.slice(0, beat.value * 12))

function go(i: number) {
  step.value = i
  beat.value = 0
}
const { running } = useLiveLoop(root, 550, () => {
  beat.value += 1
  if (beat.value > BEATS[step.value]!) go((step.value + 1) % STEPS.length)
})
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
        <!-- 01: the builder fills itself in -->
        <div v-if="step === 0" class="zh-scene zh-build">
          <p class="zh-label">Category</p>
          <p class="zh-typed">{{ typed }}<i v-if="typed.length < CATEGORY.length" class="zh-caret" /></p>
          <p class="zh-label">Nominees</p>
          <TransitionGroup name="zh-pop" tag="ul" class="zh-noms">
            <li v-for="n in NOMS.slice(0, shown)" :key="n.name"><PlatformDot :platform="n.platform" :label="false" :size="14" />{{ n.name }}</li>
          </TransitionGroup>
          <p class="zh-add">+ Add a nominee</p>
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
.zh-noms { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.zh-noms li { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 2px solid rgb(var(--ink)); font-weight: 800; }
.zh-add { margin-top: 8px; padding: 8px 12px; border: 2px dashed rgb(var(--hair)); font-size: 14px; color: rgb(var(--ink-muted)); }
.zh-pop-enter-from { opacity: 0; transform: translateX(-14px); }
.zh-pop-enter-active { transition: opacity 0.3s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }

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
