<script setup lang="ts">
// The landing's cover scene: a category being voted on, live. Chat types its
// votes, the bars climb, the leader gets the pen. Says "your chat votes" without
// a sentence (review 2026-10-06: the landing read as a wall of text).
// The nominees are well-known channels; the chatters are made-up handles.
import { computed, ref } from 'vue'
import ZinePen from './ZinePen.vue'
import PlatformDot from '~/components/ui/PlatformDot.vue'
import { useLiveLoop } from '~/composables/useLiveLoop'

const root = ref<HTMLElement | null>(null)
const nominees = ref([
  { name: 'KaiCenat', platform: 'twitch' as const, votes: 412 },
  { name: 'ishowspeed', platform: 'youtube' as const, votes: 398 },
  { name: 'adinross', platform: 'kick' as const, votes: 241 },
])
const CHATTERS = ['pixelgoblin', 'mod_kira', 'lurker_2006', 'pasta_queen', 'n0scope', 'velvetbyte', 'chat_is_this_real', 'raidboss']
const ASIDES = ['W show', 'speed is cooking', 'cant believe its close', 'KAI KAI KAI', 'voted!', 'mods vote too right']
const chat = ref([
  { id: 1, user: 'mod_kira', text: 'link is pinned, go vote' },
  { id: 2, user: 'pixelgoblin', text: '!vote 1' },
])
let seq = 3
const flash = ref(-1)

const total = computed(() => nominees.value.reduce((n, x) => n + x.votes, 0))
const top = computed(() => Math.max(...nominees.value.map((x) => x.votes)))
const leader = computed(() => nominees.value.findIndex((x) => x.votes === top.value))

useLiveLoop(root, 1100, () => {
  // a close race: the trailing two get a little more luck
  const w = nominees.value.map((x) => 1 + (top.value - x.votes) / 40)
  let r = Math.random() * w.reduce((a, b) => a + b, 0)
  const i = w.findIndex((x) => (r -= x) < 0)
  const pick = i < 0 ? 0 : i
  nominees.value[pick]!.votes += 1 + Math.floor(Math.random() * 3)
  flash.value = pick
  const user = CHATTERS[Math.floor(Math.random() * CHATTERS.length)]!
  const text = Math.random() < 0.25 ? ASIDES[Math.floor(Math.random() * ASIDES.length)]! : `!vote ${pick + 1}`
  chat.value = [...chat.value.slice(-4), { id: seq++, user, text }]
})
</script>

<template>
  <div ref="root" class="zv" role="img" aria-label="Example: a category being voted on live, chat voting for three channels">
    <div class="zv-head">
      <span class="zv-live"><i />Voting open</span>
      <span class="tnum zv-count">{{ total.toLocaleString('en-US').replace(/,/g, ' ') }} votes</span>
    </div>
    <p class="zv-cat zine-display">Streamer of the year</p>
    <ul class="zv-rows">
      <li v-for="(n, i) in nominees" :key="n.name" :class="flash === i && 'is-flash'">
        <span class="zv-n tnum">{{ i + 1 }}</span>
        <span class="zv-name"><ZinePen :on="i === leader" :seed="i * 7">{{ n.name }}</ZinePen></span>
        <PlatformDot :platform="n.platform" :label="false" :size="14" />
        <span class="zv-bar"><span :style="{ width: `${(n.votes / top) * 100}%` }" /></span>
      </li>
    </ul>
    <div class="zv-chat" aria-hidden="true">
      <TransitionGroup name="zv-line" tag="ol">
        <li v-for="c in chat" :key="c.id"><b>{{ c.user }}</b> {{ c.text }}</li>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.zv { position: relative; border: 2.5px solid rgb(var(--ink)); background: rgb(var(--canvas)); box-shadow: 10px 10px 0 rgb(var(--ink)); transform: rotate(1.2deg); }
.zv-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 2.5px solid rgb(var(--ink)); }
.zv-live { display: inline-flex; align-items: center; gap: 8px; font: 800 12px/1 var(--font-display), sans-serif; font-stretch: 118%; letter-spacing: 0.08em; text-transform: uppercase; color: rgb(var(--gold-text)); }
.zv-live i { width: 9px; height: 9px; border-radius: 50%; background: rgb(var(--pink)); animation: zv-blink 1.4s infinite; }
.zv-count { font-weight: 800; font-size: 14px; }
.zv-cat { padding: 16px 16px 6px; font-size: 26px; text-transform: uppercase; color: rgb(var(--gold)); }
.zv-rows { margin: 0; padding: 0 16px 8px; list-style: none; }
.zv-rows li { display: grid; grid-template-columns: 22px auto 16px minmax(0, 1fr); align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1.5px dashed rgb(var(--hair)); }
.zv-n { font: 900 14px/1 var(--font-display), sans-serif; color: rgb(var(--ink-muted)); }
.zv-name { font: 800 19px/1.1 var(--font-display), sans-serif; font-stretch: 112%; }
.zv-bar { height: 12px; border: 1.5px solid rgb(var(--ink)); }
.zv-bar span { display: block; height: 100%; background: rgb(var(--gold)); transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.is-flash .zv-bar span { background: rgb(var(--pink)); }
.zv-chat { height: 150px; overflow: hidden; padding: 10px 16px 12px; border-top: 2.5px solid rgb(var(--ink)); background: rgb(var(--s2)); -webkit-mask: linear-gradient(transparent, #000 35%); mask: linear-gradient(transparent, #000 35%); }
.zv-chat ol { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; gap: 4px; font-size: 14px; }
.zv-chat b { color: rgb(var(--gold-text)); }
.zv-line-enter-from { opacity: 0; transform: translateY(10px); }
.zv-line-enter-active { transition: opacity 0.3s, transform 0.3s; }
.zv-line-leave-active { position: absolute; opacity: 0; }
@keyframes zv-blink { 50% { opacity: 0.3; } }
@media (max-width: 1199px) { .zv { transform: none; box-shadow: 6px 6px 0 rgb(var(--ink)); } }
@media (min-width: 1200px) and (min-height: 820px) { .zv-name { font-size: 21px; } .zv-rows li { padding: 13px 0; } .zv-chat { height: 170px; } }
</style>
