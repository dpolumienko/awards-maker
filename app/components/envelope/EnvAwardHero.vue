<script setup lang="ts">
// The Envelope awards page masthead (review 2026-10-16): the show on a cream
// ticket - host, name, description, partners - and a frosted status card with
// the countdown, the facts and the ceremony. The card is drawn in the show's own
// theme and accent (data/themes.ts envelopeCardCss), so the six themes of the
// builder are the six themes here (review item 16).
import { computed, ref } from 'vue'
import type { Award, Partner } from '~/types/award'
import type { Phase } from '~/composables/useVoting'
import { envelopeCardCss } from '~/data/themes'
import { PLATFORM_NAMES } from '~/data/platforms'
import '~/assets/css/envelope-award.css'

const props = defineProps<{
  award: Award
  phase: Phase
  state: string
  countdown: { days: string; hrs: string; mins: string } | null
  countdownLabel: string
  partners: Partner[]
  nomineeTotal: number
  voters: number
  closes: string
  ceremony: string
  shareUrl: string
  accent: string
  headlineFont?: string
}>()
defineEmits<{ start: [] }>()

const PF = { twitch: 'tw', kick: 'kk', youtube: 'yt' } as const
const pf = computed(() => PF[props.award.host.platform as keyof typeof PF] ?? 'tw')
const stateTone = computed(() => (props.phase === 'open' ? '' : props.phase === 'revealed' ? 'res' : 'end'))
const bg = computed(() => envelopeCardCss(props.award.look?.theme, props.accent, props.award.look?.coverUrl))
// the prototype's slow background motions are keyed by his theme names
const BG = { plain: 'plain', stage: 'stage', rays: 'rays', glow: 'aurora', spotlights: 'ribbons', grid: 'grid' } as const
const bgKey = computed(() => (props.award.look?.coverUrl ? 'cover' : BG[(props.award.look?.theme ?? 'plain') as keyof typeof BG] ?? 'plain'))
const channelUrl = computed(() => {
  const h = props.award.host
  return h.platform === 'twitch' ? `https://www.twitch.tv/${h.name}` : h.platform === 'kick' ? `https://kick.com/${h.name}` : `https://www.youtube.com/@${h.name}`
})

// the ceremony as a calendar entry: two hours from the time the host set
const calendar = computed(() => {
  const at = props.award.ceremonyAt
  if (!at) return ''
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const start = Date.parse(at)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${props.award.name} - ceremony`,
    dates: `${stamp(start)}/${stamp(start + 2 * 3_600_000)}`,
    details: `Live on ${PLATFORM_NAMES[props.award.host.platform]}`,
    location: channelUrl.value,
  })
  return `https://calendar.google.com/calendar/render?${q}`
})
const xUrl = computed(() => `https://x.com/intent/post?${new URLSearchParams({ text: `Vote in ${props.award.name}:`, url: props.shareUrl })}`)

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(props.shareUrl)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    /* the address is in the bar */
  }
}
</script>

<template>
  <header class="ap-hero" :data-bg="bgKey" :style="{ '--ap-bg': bg }">
    <div class="ap-intro">
      <span class="ap-hostchip">
        <span v-if="!award.look?.hideLogo" class="av hc-av">{{ award.host.name.slice(0, 2).toUpperCase() }}<i class="hc-pf pf" :class="pf" :aria-label="PLATFORM_NAMES[award.host.platform]" /></span>
        <span><small class="org">Organized by</small><b>{{ award.host.name }}</b></span>
      </span>
      <h1 :style="headlineFont ? { fontFamily: headlineFont } : undefined">{{ award.name }}</h1>
      <p class="ap-desc">{{ award.description }}</p>
      <p v-if="partners.length" class="ap-partners">
        <span>With</span>
        <a v-for="p in partners" :key="p.id" class="ap-pl-slot" :href="p.url || undefined" target="_blank" rel="nofollow sponsored noopener">{{ p.name }}</a>
      </p>
      <div class="ap-ctas">
        <a class="btn p ap-down" href="#vote" @click.prevent="$emit('start')">{{ phase === 'revealed' ? 'See the winners' : phase === 'open' ? 'Start voting' : 'See the nominees' }}<i class="ap-dn" aria-hidden="true" /></a>
      </div>
    </div>
    <aside class="ap-status" aria-label="Voting status">
      <div class="ap-st-h">
        <p class="ap-cd-l">{{ countdown ? countdownLabel : 'Status' }}</p>
        <span class="state" :class="stateTone">{{ state }}</span>
      </div>
      <div v-if="countdown" class="ap-cd" aria-live="off">
        <span><b>{{ +countdown.days }}</b><small>days</small></span>
        <span><b>{{ countdown.hrs }}</b><small>hours</small></span>
        <span><b>{{ countdown.mins }}</b><small>min</small></span>
      </div>
      <p v-if="closes && (phase === 'open' || phase === 'soon')" class="ap-when">{{ closes }}</p>
      <dl class="ap-stats">
        <div><dt>Categories</dt><dd>{{ award.nominations.length }}</dd></div>
        <div><dt>Nominees</dt><dd>{{ nomineeTotal }}</dd></div>
        <!-- one number, the same everywhere: people who voted (review item 15) -->
        <div><dt>Voters</dt><dd class="tnum">{{ voters }}</dd></div>
      </dl>
      <p v-if="ceremony" class="ap-cer">
        <span class="ap-cer-i pf" :class="pf" aria-hidden="true" />
        <span><small>Live on {{ PLATFORM_NAMES[award.host.platform] }}</small><b>{{ ceremony }}</b></span>
        <a v-if="calendar" class="ap-cal" :href="calendar" target="_blank" rel="noopener" aria-label="Add the ceremony to your calendar">Add to calendar</a>
      </p>
      <div class="ap-share">
        <span>Share this awards</span>
        <button class="ap-sh" type="button" @click="copy"><i class="ln" aria-hidden="true" />{{ copied ? 'Link copied' : 'Copy link' }}</button>
        <a class="ap-sh" aria-label="Post on X" :href="xUrl" target="_blank" rel="noopener"><i class="xx" aria-hidden="true" />Post</a>
      </div>
    </aside>
  </header>
</template>
