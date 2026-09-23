<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import SectionShell from './SectionShell.vue'
import { prefersReducedMotion } from '~/composables/useReveal'
import UiIcon from '../ui/UiIcon.vue'

// A chat that actually moves: the link is pinned, viewers react underneath.
const lines = [
  { who: 'ishowspeed', tone: 'text-gold-text', text: 'Chat Awards are open, go vote' },
  { who: 'mel0dy', tone: 'text-ink', text: 'on it' },
  { who: 'n1ghtowl', tone: 'text-ink', text: 'voted, mods deserve it' },
  { who: 'pixelpete', tone: 'text-ink', text: 'where do I vote' },
  { who: 'ka1ra', tone: 'text-ink', text: 'pinned link ^' },
  { who: 'dzvin', tone: 'text-ink', text: 'best emote is not even close' },
]
const shown = ref(lines.slice(0, 3))
let i = 3
let timer: ReturnType<typeof setInterval> | undefined
// WCAG 2.2.2: the mock chat plays a few lines and then holds still.
const MAX_LINES = 6
let played = 0
onMounted(() => {
  if (prefersReducedMotion()) return
  timer = setInterval(() => {
    if (++played > MAX_LINES) return clearInterval(timer)
    shown.value = [...shown.value.slice(1), lines[i % lines.length]!]
    i++
  }, 2200)
})
onBeforeUnmount(() => clearInterval(timer))

// Jury vote was cut (decision 2026-09-14): chat votes, full stop.
// Shown as three small mock screens - the flow is easier to look at than to read.
</script>

<template>
  <SectionShell
    id="voting"
    heading="Let chat vote for every winner"
    intro="Three taps from a link in chat to a counted vote."
  >
    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <!-- 1. the link lands in chat -->
      <div class="js-reveal overflow-hidden rounded-card border border-hair bg-s1">
        <div class="flex h-48 flex-col bg-[radial-gradient(120%_90%_at_20%_0%,rgba(217,164,65,.08),transparent)]">
          <div class="flex items-center gap-2 border-b border-hair px-4 py-2">
            <span class="micro">Stream chat</span>
            <span class="ml-auto flex items-center gap-1.5">
              <span aria-hidden="true" class="block h-1.5 w-1.5 rounded-pill bg-onair" />
              <span class="tnum text-[11px] text-ink-muted">1 284 watching</span>
            </span>
          </div>
          <div class="flex flex-1 flex-col justify-end gap-1.5 px-4 pb-3">
            <TransitionGroup
              enter-from-class="opacity-0 translate-y-2"
              enter-active-class="transition duration-500 ease-gala"
              move-class="transition duration-500 ease-gala"
            >
              <p v-for="l in shown" :key="l.who + l.text" class="truncate text-sm">
                <span class="font-semibold" :class="l.tone">{{ l.who }}</span>
                <span class="text-ink-2">&nbsp;{{ l.text }}</span>
              </p>
            </TransitionGroup>
          </div>
          <div class="border-t border-hair px-4 py-2.5">
            <span class="inline-flex w-full items-center gap-2 rounded-pill border border-gold-24 bg-gold/[0.10] px-3 py-1.5 text-xs text-gold-text">
              <UiIcon name="pin" :size="12" /> Pinned: vote in Chat Awards 2026
              <span aria-hidden="true" class="ml-auto">↗</span>
            </span>
          </div>
        </div>
        <div class="border-t border-hair p-5">
          <h3 class="text-xl font-semibold">The link goes in your chat</h3>
          <p class="m-0 mt-1 text-sm text-ink-2">No account needed to look at the nominees.</p>
        </div>
      </div>

      <!-- 2. picking a nominee -->
      <div class="js-reveal overflow-hidden rounded-card border border-hair bg-s1">
        <div class="flex h-48 flex-col justify-center gap-2 p-5">
          <p class="micro mb-1">Best moment of the year</p>
          <span class="flex items-center gap-3 rounded-btn border border-hair bg-s2 px-3 py-2 text-sm">
            <span aria-hidden="true" class="grid h-6 w-6 flex-none place-items-center rounded-pill bg-s3 text-[11px] font-bold text-ink-muted">IS</span> ishowspeed
          </span>
          <span class="flex items-center gap-3 rounded-btn border border-gold bg-gold/[0.12] px-3 py-2 text-sm">
            <span aria-hidden="true" class="grid h-6 w-6 flex-none place-items-center rounded-pill bg-s3 text-[11px] font-bold text-ink-muted">MA</span> maryana
            <span aria-hidden="true" class="ml-auto grid h-5 w-5 place-items-center rounded-btn bg-gold text-canvas"><UiIcon name="check" :size="12" /></span>
          </span>
          <span class="flex items-center gap-3 rounded-btn border border-hair bg-s2 px-3 py-2 text-sm">
            <span aria-hidden="true" class="grid h-6 w-6 flex-none place-items-center rounded-pill bg-s3 text-[11px] font-bold text-ink-muted">3A</span> The 3am raid
          </span>
        </div>
        <div class="border-t border-hair p-5">
          <h3 class="text-xl font-semibold">One pick per category</h3>
          <p class="m-0 mt-1 text-sm text-ink-2">Choosing comes first, nothing blocks it.</p>
        </div>
      </div>

      <!-- 3. the login, asked once -->
      <div class="js-reveal overflow-hidden rounded-card border border-hair bg-s1">
        <div class="flex h-48 flex-col items-center justify-center gap-3 p-5">
          <span class="flex w-full items-center justify-center gap-2 rounded-btn bg-twitch px-4 py-3 text-sm font-bold uppercase tracking-button text-white">
            Sign in with Twitch
          </span>
          <p class="text-center text-sm text-ink-muted">Asked once, at submit</p>
          <span class="tnum rounded-pill border border-live/50 px-3 py-1 text-xs text-live">1 vote per category</span>
        </div>
        <div class="border-t border-hair p-5">
          <h3 class="text-xl font-semibold">The vote is counted</h3>
          <p class="m-0 mt-1 text-sm text-ink-2">Tied to a real account, so the result holds up.</p>
        </div>
      </div>
    </div>
  </SectionShell>
</template>
