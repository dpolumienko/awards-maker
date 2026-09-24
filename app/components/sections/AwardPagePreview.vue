<script setup lang="ts">
import { ref } from 'vue'
import SectionShell from './SectionShell.vue'
import UiBadge from '../ui/UiBadge.vue'
import PlatformDot from '../ui/PlatformDot.vue'
import UiIcon from '../ui/UiIcon.vue'

// A miniature of app/pages/a/[slug].vue as a voter sees it. It used to show a
// live leaderboard with vote bars and "222 voting right now" - a page that does
// not exist: counts stay hidden until the host announces the winners. Keep this
// in step with the real page when that one changes.
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
    <div class="js-reveal mt-6 overflow-hidden rounded-card border border-hair bg-canvas">
      <!-- the page head: host, phase, title, the numbers row -->
      <div class="relative border-b border-hair bg-[linear-gradient(180deg,rgba(217,164,65,.08),transparent)] px-6 pb-6 pt-7 sm:px-8">
        <div class="flex items-center justify-between gap-3">
          <span class="flex items-center gap-2.5">
            <span class="grid h-9 w-9 place-items-center rounded-pill bg-gold text-[12px] font-bold text-canvas">NO</span>
            <span class="font-semibold">nightowl_tv</span>
            <PlatformDot platform="twitch" />
          </span>
          <UiBadge tone="live">Voting open</UiBadge>
        </div>
        <p class="mt-6 text-[clamp(28px,4vw,44px)] font-extrabold uppercase leading-[1.02] tracking-heading">Night Owl Awards 2026</p>
        <span aria-hidden="true" class="mt-3 block h-px w-12 bg-gold" />
        <dl class="mt-6 grid grid-cols-3 gap-4 border-t border-hair pt-4 sm:max-w-[520px]">
          <div v-for="[k, v] in stats" :key="k">
            <dt class="micro">{{ k }}</dt>
            <dd class="tnum m-0 mt-1 font-semibold">{{ v }}</dd>
          </div>
        </dl>
      </div>

      <div class="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
        <!-- the ballot: one category, pick one -->
        <div>
          <p class="label text-gold-text">Voting closes in</p>
          <div class="mt-2 flex gap-2">
            <div v-for="[n, u] in [['04', 'Days'], ['11', 'Hrs'], ['38', 'Min']]" :key="u" class="min-w-[58px] rounded-btn border border-hair p-2 text-center">
              <b class="tnum block text-[22px] font-bold leading-none">{{ n }}</b>
              <span class="micro">{{ u }}</span>
            </div>
          </div>

          <div class="mt-5 rounded-card border border-hair bg-s1 p-4">
            <div class="flex items-center justify-between">
              <p class="m-0 font-semibold"><span class="mr-2 text-gold-text">01</span>Moment of the year</p>
              <span class="text-sm text-ink-muted">Pick one</span>
            </div>
            <div class="mt-3 flex flex-col gap-2">
              <button
                v-for="(n, i) in nominees"
                :key="n.name"
                type="button"
                :aria-pressed="picked === i"
                :class="[
                  'flex w-full items-center gap-3 rounded-btn border p-3 text-left transition-[background-color,border-color] duration-200',
                  picked === i ? 'border-gold bg-gold/[0.12]' : 'border-hair bg-canvas hover:border-hair2 hover:bg-s2',
                ]"
                @click="picked = i"
              >
                <span class="grid h-8 w-8 flex-none place-items-center rounded-pill bg-s3 text-[13px] font-bold text-ink-muted">{{ n.initial }}</span>
                <span>
                  <span class="block font-semibold">{{ n.name }}</span>
                  <span class="flex items-center gap-1.5 text-sm text-ink-2">
                    <PlatformDot v-if="n.platform" :platform="n.platform" :label="false" />{{ n.sub }}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  :class="[
                    'ml-auto grid h-5 w-5 place-items-center rounded-btn bg-gold text-canvas transition-transform duration-300 ease-gala',
                    picked === i ? 'scale-100' : 'scale-0',
                  ]"
                ><UiIcon name="check" :size="12" /></span>
              </button>
            </div>
          </div>
          <p class="mt-3 text-sm text-ink-muted">One vote per category, Twitch login on submit.</p>
        </div>

        <!-- the side column, as on the real page -->
        <div class="flex flex-col gap-3">
          <div class="rounded-card border border-hair bg-s1 p-4">
            <p class="micro">How voting works</p>
            <ul class="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-sm text-ink-2">
              <li v-for="r in rules" :key="r" class="flex gap-2"><span aria-hidden="true" class="text-gold-text">•</span>{{ r }}</li>
            </ul>
          </div>
          <div class="rounded-card border border-hair bg-s1 p-4">
            <p class="micro">Share it</p>
            <p class="m-0 mt-2 text-sm text-ink-2">Every page has its own preview card, so a link in chat or on X shows the show, not a bare URL.</p>
          </div>
          <p class="mt-auto text-sm text-ink-muted">Example of a published awards page</p>
        </div>
      </div>
    </div>
  </SectionShell>
</template>
