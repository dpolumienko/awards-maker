<script setup lang="ts">
import SectionShell from './SectionShell.vue'
import SpotlightCard from '../ui/SpotlightCard.vue'
import { PLATFORM_COLORS } from '~/data/platforms'
import UiIcon from '../ui/UiIcon.vue'

// Bento, not three equal text boxes: each card shows the thing it describes.
const channels = [
  { name: 'ishowspeed', meta: 'YouTube · 41.2M', tone: PLATFORM_COLORS.youtube },
  { name: 'dzvin_tv', meta: 'Kick · 88K', tone: PLATFORM_COLORS.kick },
  { name: 'maryana', meta: 'YouTube · 402K', tone: PLATFORM_COLORS.youtube },
]
</script>

<template>
  <SectionShell
    heading="Run your own streamer awards for your community"
    intro="You bring the categories and the community. Everything else is here."
  >
    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <!-- three across: the old 2+1 over a full-width third stretched the page -->
      <!-- nominee search -->
      <SpotlightCard class="js-reveal">
        <template #mark>
          <span class="tnum text-sm font-semibold tracking-micro text-gold-text">01</span>
        </template>
        <h3 class="text-xl font-semibold">Nominate any channel, or type in anything</h3>
        <p class="m-0 max-w-[60ch] text-sm leading-relaxed text-ink-2">Every channel we track, or plain text when the nominee is a mod, a clip or a running joke.</p>

        <div class="mt-5 border-t border-hair pt-4">
          <div class="flex items-center gap-2 rounded-btn border border-gold-24 bg-s2 px-3 py-2 text-sm text-ink-2">
            <span aria-hidden="true" class="text-gold">⌕</span> stint
            <span aria-hidden="true" class="ml-auto h-4 w-px animate-pulse bg-gold" />
          </div>
          <ul class="mt-2 list-none space-y-1 p-0">
            <li v-for="c in channels" :key="c.name" class="flex items-center gap-3 rounded-btn px-3 py-2 text-sm transition-colors hover:bg-s2">
              <span aria-hidden="true" class="h-7 w-7 rounded-pill" :style="{ background: c.tone, opacity: 0.85 }" />
              <span class="font-semibold">{{ c.name }}</span>
              <span class="ml-auto text-sm text-ink-2">{{ c.meta }}</span>
            </li>
            <li class="flex items-center gap-3 rounded-btn border border-dashed border-hair2 px-3 py-2 text-sm text-ink-muted">
              <span aria-hidden="true" class="grid h-7 w-7 place-items-center rounded-pill border border-hair2">+</span>
              Add "the 3am raid" as text
            </li>
          </ul>
        </div>
      </SpotlightCard>

      <!-- one vote -->
      <SpotlightCard class="js-reveal">
        <template #mark>
          <span class="tnum text-sm font-semibold tracking-micro text-gold-text">02</span>
        </template>
        <h3 class="text-xl font-semibold">One account, one vote per category</h3>
        <p class="m-0 max-w-[60ch] text-sm leading-relaxed text-ink-2">Always on, never a setting you can turn off.</p>

        <div class="mt-5 space-y-2">
          <div v-for="n in ['Best moment', 'Mod MVP', 'Best emote']" :key="n" class="flex items-center gap-3 rounded-btn border border-hair bg-canvas px-3 py-2.5 text-sm">
            <span aria-hidden="true" class="grid h-5 w-5 place-items-center rounded-btn bg-gold text-on-gold"><UiIcon name="check" :size="12" /></span>
            {{ n }}
            <span class="tnum ml-auto text-xs text-ink-muted">1 / 1</span>
          </div>
          <p class="pt-1 text-sm text-ink-muted">A second vote from the same account is refused</p>
        </div>
      </SpotlightCard>

      <!-- share card -->
      <SpotlightCard class="js-reveal">
        <template #mark>
          <span class="tnum text-sm font-semibold tracking-micro text-gold-text">03</span>
        </template>
        <h3 class="text-xl font-semibold">Share nominees and winners with your community</h3>
        <p class="m-0 max-w-[60ch] text-sm leading-relaxed text-ink-2">
          Every awards page carries its own preview image, so a link in chat or on X shows the show, not a bare URL.
        </p>
        <div class="mt-5">
          <div class="flex gap-3">
            <div class="min-w-0 flex-1 rounded-card bg-canvas p-4">
              <p class="micro text-gold-text">Nominated</p>
              <p class="mt-2 text-lg font-bold leading-tight">maryana</p>
              <p class="mt-1 text-sm text-ink-2">Best moment of the year</p>
              <span class="mt-4 block h-px w-full bg-gradient-to-r from-gold to-transparent" />
              <p class="micro mt-3">Chat Awards 2026</p>
            </div>
            <div class="min-w-0 flex-1 rounded-card bg-gold/[0.06] p-4">
              <p class="micro text-gold-text">Winner</p>
              <p class="mt-2 text-lg font-bold leading-tight text-gold-text">ishowspeed</p>
              <p class="mt-1 text-sm text-ink-2">612 of 1 284 votes</p>
              <span class="mt-4 block h-px w-full bg-gradient-to-r from-gold to-transparent" />
              <p class="micro mt-3">Revealed 20 Dec</p>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </div>
  </SectionShell>
</template>
