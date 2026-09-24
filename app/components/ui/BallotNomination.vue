<script setup lang="ts">
// One category on the public awards page: the ballot while voting is open, the
// same rows locked once the vote is in, and the bars after the ceremony.
// Radio semantics, not buttons - it is one choice out of a set, and the arrow
// keys have to behave the way a radio group does.
import { computed, ref } from 'vue'
import PlatformDot from './PlatformDot.vue'
import LivePill from './LivePill.vue'
import MediaLightbox from './MediaLightbox.vue'
import UiIcon from './UiIcon.vue'
import { nomineeInitials, nomineeName, nomineeSub } from '~/utils/nominee'
import { accentText } from '~/utils/accent'
import type { Result } from '~/composables/useVoting'
import type { Nomination } from '~/types/award'

const {
  nomination,
  index,
  accent,
  mode,
  picked = null,
  results = [],
  votesIn = 0,
} = defineProps<{
  nomination: Nomination
  index: number
  accent: string
  /** vote: choose - locked: voting shut or already used - results: winners are out */
  mode: 'vote' | 'locked' | 'results'
  picked?: string | null
  results?: Result[]
  votesIn?: number
}>()

const emit = defineEmits<{ pick: [string] }>()

// An image nominee opens full size; a clip opens where it lives. Either way the
// control sits next to the radio, never inside it - a link inside a radio is a
// trap for anyone arrowing through the group.
const viewing = ref<{ src?: string; url?: string; title: string } | null>(null)

const radios = ref<HTMLButtonElement[]>([])
const num = computed(() => String(index + 1).padStart(2, '0'))
const winners = computed(() => results.filter((r) => r.top))
// Fills keep the streamer's colour; anything that is type takes the readable one.
const ink = computed(() => accentText(accent))
// Only one row sits in the tab order and the arrows move between them. That is
// the radio-group pattern, and it keeps a ten-category page from eating forty tabs.
const tabTarget = computed(() => {
  const i = nomination.nominees.findIndex((n) => n.id === picked)
  return i >= 0 ? i : 0
})

function onKey(e: KeyboardEvent, i: number) {
  if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) return
  e.preventDefault()
  const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1
  const next = (i + step + nomination.nominees.length) % nomination.nominees.length
  radios.value[next]?.focus()
  if (mode === 'vote') emit('pick', nomination.nominees[next]!.id)
}
</script>

<template>
  <section class="js-reveal rounded-card border border-hair bg-s1 p-5 sm:p-6">
    <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span aria-hidden="true" class="tnum text-sm font-bold" :style="{ color: ink }">{{ num }}</span>
      <h2 :id="'nom-' + nomination.id" class="text-xl font-semibold">{{ nomination.title }}</h2>
      <span class="ml-auto text-sm text-ink-muted">
        <template v-if="mode === 'results'">{{ votesIn }} {{ votesIn === 1 ? 'vote' : 'votes' }}</template>
        <template v-else-if="picked">{{ mode === 'vote' ? 'Picked' : 'Your pick' }}</template>
        <template v-else-if="mode === 'vote'">Pick one</template>
      </span>
    </div>

    <!-- RESULTS: the bar carries the number, the leader carries the accent -->
    <ol v-if="mode === 'results'" class="mt-4 list-none space-y-2 p-0">
      <li
        v-for="r in results"
        :key="r.nominee.id"
        class="relative overflow-hidden rounded-btn border p-3"
        :class="r.top ? 'bg-s2' : 'border-hair bg-canvas'"
        :style="r.top ? { borderColor: accent } : undefined"
      >
        <span
          aria-hidden="true"
          class="absolute inset-y-0 left-0 w-full origin-left transition-transform duration-700 ease-gala"
          :style="{ transform: `scaleX(${r.pct / 100})`, background: accent, opacity: r.top ? 0.18 : 0.08 }"
        />
        <span class="relative flex items-center gap-3">
          <span aria-hidden="true" class="grid h-8 w-8 flex-none place-items-center rounded-pill bg-s3 text-[13px] font-bold text-ink-2">
            {{ nomineeInitials(r.nominee) }}
          </span>
          <span class="min-w-0">
            <span class="block truncate font-semibold">{{ nomineeName(r.nominee) }}</span>
            <span class="block text-[13px] text-ink-muted">{{ nomineeSub(r.nominee) }}</span>
          </span>
          <span
            v-if="r.top"
            class="ml-auto rounded-pill border px-2.5 py-1 text-[11px] font-bold uppercase tracking-micro"
            :style="{ borderColor: accent, color: ink }"
          >
            {{ winners.length > 1 ? 'Tied' : 'Winner' }}
          </span>
          <span class="tnum flex-none text-sm" :class="r.top ? 'ml-3 font-bold text-ink' : 'ml-auto text-ink-muted'">
            {{ r.pct }}%
          </span>
        </span>
      </li>
    </ol>

    <!-- BALLOT: open for votes, or locked once the vote is cast or voting is shut -->
    <div v-else class="mt-4 flex flex-col gap-2" role="radiogroup" :aria-labelledby="'nom-' + nomination.id">
      <div v-for="(n, i) in nomination.nominees" :key="n.id" class="flex items-stretch gap-2">
      <button
        ref="radios"
        type="button"
        role="radio"
        :aria-checked="picked === n.id"
        :tabindex="mode === 'vote' ? (tabTarget === i ? 0 : -1) : 0"
        :disabled="mode === 'locked'"
        class="flex min-w-0 flex-1 items-center gap-3 rounded-btn border p-3 text-left transition-[background-color,border-color,transform] duration-200 disabled:cursor-default"
        :class="[
          picked === n.id ? 'bg-s2' : 'border-hair bg-canvas',
          mode === 'vote' && 'hover:border-hair2 motion-safe:hover:-translate-y-0.5',
          // dim the rest only around the visitor's own pick; a closed show seen by
          // someone who never voted is not a page of greyed-out names
          mode === 'locked' && picked && picked !== n.id && 'opacity-60',
        ]"
        :style="picked === n.id ? { borderColor: accent } : undefined"
        @click="mode === 'vote' && emit('pick', n.id)"
        @keydown="onKey($event, i)"
      >
        <img
          v-if="n.kind === 'media' && n.image"
          :src="n.image"
          alt=""
          class="h-12 w-16 flex-none rounded-btn object-cover"
        />
        <span v-else aria-hidden="true" class="grid h-10 w-10 flex-none place-items-center rounded-pill bg-s3 text-sm font-bold text-ink-2">
          {{ nomineeInitials(n) }}
        </span>
        <span class="min-w-0">
          <span class="block truncate font-semibold">{{ nomineeName(n) }}</span>
          <span class="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-muted">
            <PlatformDot v-if="n.kind === 'channel'" :platform="n.channel.platform" :label="false" />
            {{ nomineeSub(n) }}
            <LivePill v-if="n.kind === 'channel' && n.channel.live" :game="n.channel.game" />
          </span>
        </span>
        <span
          aria-hidden="true"
          class="ml-auto grid h-6 w-6 flex-none place-items-center rounded-btn text-[13px] font-extrabold text-canvas transition-transform duration-300 ease-gala"
          :style="{ background: accent }"
          :class="picked === n.id ? 'scale-100' : 'scale-0'"
        ><UiIcon name="check" :size="13" /></span>
      </button>

        <!-- look at it before voting on it -->
        <button
          v-if="n.kind === 'media' && n.image"
          type="button"
          class="flex flex-none items-center gap-1.5 rounded-btn border border-hair px-3 text-[13px] text-ink-2 transition-colors hover:border-gold hover:text-ink"
          @click="viewing = { src: n.image, title: nomineeName(n) }"
        >
          View
        </button>
        <button
          v-else-if="n.kind === 'media' && n.url"
          type="button"
          class="flex flex-none items-center gap-1.5 rounded-btn border border-hair px-3 text-[13px] text-ink-2 no-underline transition-colors hover:border-gold hover:text-ink"
          @click="viewing = { url: n.url, title: nomineeName(n) }"
        >
          Play clip
        </button>
      </div>
    </div>

    <MediaLightbox
      :open="!!viewing"
      :src="viewing?.src ?? ''"
      :url="viewing?.url ?? ''"
      :title="viewing?.title ?? ''"
      @close="viewing = null"
    />
  </section>
</template>
