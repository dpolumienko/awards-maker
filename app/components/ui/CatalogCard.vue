<script setup lang="ts">
// One published awards in the catalog. The cover is the streamer's own look -
// their theme and accent, or the cover they uploaded - so the grid is not a row
// of identical cards, and nothing on it is invented: every number here is
// counted, and a fresh awards shows zeros.
import { computed } from 'vue'
import UiBadge from './UiBadge.vue'
import PlatformDot from './PlatformDot.vue'
import UiIcon from './UiIcon.vue'
import { themeCss } from '~/data/themes'
import { accentText } from '~/utils/accent'
import { FREE } from '~/types/award'
import type { AwardSummary } from '~/composables/useAwards'
import type { Phase } from '~/composables/useVoting'

// A summary, not the whole show: the catalog needs a name, a look and two
// numbers, and shipping every nominee of every card down the wire to render a
// grid is how a list page gets slow.
const { award, phase, voters } = defineProps<{
  award: AwardSummary
  phase: Phase
  voters: number
}>()

const accent = computed(() => award.look?.accent || '#D9A441')
const ink = computed(() => accentText(accent.value))
const nominees = computed(() => award.categories)

const STATE: Record<Phase, { tone: 'live' | 'results' | 'ended'; text: string }> = {
  soon: { tone: 'ended', text: 'Opens soon' },
  open: { tone: 'live', text: 'Voting open' },
  capped: { tone: 'ended', text: 'Voting closed' },
  counting: { tone: 'results', text: 'Voting closed' },
  revealed: { tone: 'results', text: 'Winners announced' },
}

const fmt = (d?: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''

/** The one line under the title: what this awards is waiting for. */
const line = computed(() => {
  switch (phase) {
    case 'soon':
      return award.opensAt ? `Opens ${fmt(award.opensAt)}` : 'Not open yet'
    case 'open':
      return award.closesAt ? `Closes ${fmt(award.closesAt)}` : 'Voting open'
    case 'capped':
      return `Closed at ${FREE.maxVoters} voters`
    case 'counting':
      return award.ceremonyAt ? `Winners ${fmt(award.ceremonyAt)}` : 'Winners coming'
    default:
      return award.ceremonyAt ? `Announced ${fmt(award.ceremonyAt)}` : 'Winners announced'
  }
})
</script>

<template>
  <NuxtLink
    :to="`/a/${award.slug}`"
    class="group flex h-full flex-col overflow-hidden rounded-card border border-hair bg-s1 no-underline transition-[border-color,transform] duration-500 ease-gala hover:border-gold motion-safe:hover:-translate-y-1"
  >
    <span class="relative flex aspect-video items-start p-3" :style="themeCss(award.look?.theme, accent, award.look?.coverUrl)">
      <span aria-hidden="true" class="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,.85)_100%)]" />
      <UiBadge :tone="STATE[phase].tone" class="relative z-10">{{ STATE[phase].text }}</UiBadge>
    </span>

    <span class="flex flex-1 flex-col gap-3 p-4">
      <span class="text-xl font-semibold leading-tight">{{ award.name }}</span>
      <span class="flex items-center gap-2 text-sm text-ink-2">
        <span
          aria-hidden="true"
          class="grid h-6 w-6 flex-none place-items-center rounded-pill text-[11px] font-bold"
          :style="{ background: accent, color: '#000' }"
        >{{ award.host.name.slice(0, 2).toUpperCase() }}</span>
        {{ award.host.name }}
        <PlatformDot :platform="award.host.platform" :label="false" />
      </span>

      <span class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
        <span class="tnum">{{ award.nominations.length }} categories</span>
        <span aria-hidden="true">·</span>
        <span class="tnum">{{ nominees }} {{ nominees === 1 ? 'category' : 'categories' }}</span>
        <span aria-hidden="true">·</span>
        <span class="tnum">{{ voters }} {{ voters === 1 ? 'vote' : 'votes' }}</span>
      </span>
      <span class="flex items-center gap-1.5 text-[13px]" :style="{ color: ink }">
        {{ line }}
        <UiIcon name="chevron-right" :size="12" class="transition-transform duration-300 ease-gala group-hover:translate-x-0.5" />
      </span>
    </span>
  </NuxtLink>
</template>
