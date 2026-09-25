<script setup lang="ts">
import { ref } from 'vue'
import SectionShell from './SectionShell.vue'
import UiBadge from '../ui/UiBadge.vue'
import PlatformDot from '../ui/PlatformDot.vue'
import UiIcon from '../ui/UiIcon.vue'

// A miniature of app/pages/a/[slug].vue as a voter sees it. Counts stay hidden
// until the host announces the winners, so there are no vote bars here. Keep
// this in step with the real page when that one changes.
//
// Rebuilt 2026-09-25 (review: "blocks look detached, massive and uneven"): one
// framed page on one padding grid - a browser bar, the head, a single numbers
// row that carries the countdown, then the ballot with the rules beside it
// behind a hairline instead of in floating cards.
const picked = ref(1)
const nominees = [
  { name: 'nightowl_tv', sub: 'Twitch channel', initial: 'N', platform: 'twitch' as const },
  { name: 'mira_plays', sub: 'Kick channel', initial: 'M', platform: 'kick' as const },
  { name: 'The 3am raid', sub: 'Text nominee', initial: '3' },
]
const stats = [
  ['Categories', '5'],
  ['Nominees', '17'],
  ['Voting closes', '12 December'],
]
const rules = [
  'Any Twitch account can vote, one ballot each.',
  'One vote per category, locked once you submit.',
  'Counts stay hidden until the host announces the winners.',
]
</script>

<template>
  <SectionShell
    id="page"
    heading="This is the page your awards get"
    intro="Publishing gives you a page like this one: your categories and nominees, a countdown to the end of voting, and the winners once you announce them. It stays online after the show."
  >
    <figure class="js-reveal m-0 mt-6 overflow-hidden rounded-card border border-hair bg-canvas">
      <!-- browser bar: says "this is a page", and whose address it has -->
      <div class="flex items-center gap-3 border-b border-hair bg-s1 px-4 py-2.5" aria-hidden="true">
        <span class="flex gap-1.5">
          <span class="h-2.5 w-2.5 rounded-pill bg-hair2" />
          <span class="h-2.5 w-2.5 rounded-pill bg-hair2" />
          <span class="h-2.5 w-2.5 rounded-pill bg-hair2" />
        </span>
        <span class="min-w-0 flex-1 truncate rounded-btn bg-canvas px-3 py-1 text-center text-xs text-ink-muted">
          awards.streamscharts.com/a/night-owl-awards-2026
        </span>
        <span class="hidden w-[42px] sm:block" />
      </div>

      <div class="bg-[linear-gradient(180deg,rgb(var(--gold)/.07),transparent_220px)] p-5 sm:p-8">
        <!-- head -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="flex items-center gap-2.5">
            <span class="grid h-8 w-8 place-items-center rounded-pill bg-gold text-[11px] font-bold text-on-gold">NO</span>
            <span class="font-semibold">nightowl_tv</span>
            <PlatformDot platform="twitch" />
          </span>
          <UiBadge tone="live">Voting open</UiBadge>
        </div>
        <p class="m-0 mt-4 text-[clamp(26px,3.6vw,40px)] font-extrabold uppercase leading-[1.02] tracking-heading">
          Night Owl Awards 2026
        </p>

        <!-- one numbers row, the countdown included -->
        <dl class="m-0 mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-hair py-4 sm:grid-cols-4">
          <div v-for="[k, v] in stats" :key="k">
            <dt class="micro">{{ k }}</dt>
            <dd class="tnum m-0 mt-1 font-semibold">{{ v }}</dd>
          </div>
          <div>
            <dt class="micro text-gold-text">Closes in</dt>
            <dd class="tnum m-0 mt-1 font-semibold">4d 11h 38m</dd>
          </div>
        </dl>

        <!-- ballot, with the rules beside it -->
        <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-8">
          <div>
            <div class="flex items-baseline justify-between gap-3">
              <p class="m-0 font-semibold"><span class="tnum mr-2 text-gold-text">01</span>Moment of the year</p>
              <span class="text-sm text-ink-muted">Pick one</span>
            </div>
            <div class="mt-3 flex flex-col gap-2" role="radiogroup" aria-label="Moment of the year (example)">
              <button
                v-for="(n, i) in nominees"
                :key="n.name"
                type="button"
                role="radio"
                :aria-checked="picked === i"
                :class="[
                  'flex w-full items-center gap-3 rounded-btn border px-3 py-2.5 text-left transition-[background-color,border-color] duration-200',
                  picked === i ? 'border-gold bg-gold/[0.10]' : 'border-hair bg-s1 hover:border-hair2',
                ]"
                @click="picked = i"
              >
                <span class="grid h-8 w-8 flex-none place-items-center rounded-pill bg-s3 text-[13px] font-bold text-ink-2">{{ n.initial }}</span>
                <span class="min-w-0">
                  <span class="block truncate font-semibold">{{ n.name }}</span>
                  <span class="flex items-center gap-1.5 text-[13px] text-ink-muted">
                    <PlatformDot v-if="n.platform" :platform="n.platform" :label="false" />{{ n.sub }}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  :class="[
                    'ml-auto grid h-5 w-5 flex-none place-items-center rounded-btn bg-gold text-on-gold transition-transform duration-300 ease-gala',
                    picked === i ? 'scale-100' : 'scale-0',
                  ]"
                ><UiIcon name="check" :size="12" /></span>
              </button>
            </div>
          </div>

          <aside class="border-t border-hair pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p class="micro">How voting works</p>
            <ul class="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-sm text-ink-2">
              <li v-for="r in rules" :key="r" class="flex gap-2"><span aria-hidden="true" class="text-gold-text">•</span>{{ r }}</li>
            </ul>
            <p class="micro mt-5">Share it</p>
            <p class="m-0 mt-2 text-sm text-ink-2">A link in chat or on X unfurls into the show's own preview card.</p>
          </aside>
        </div>
      </div>
      <figcaption class="sr-only">Example of a published awards page</figcaption>
    </figure>
  </SectionShell>
</template>
