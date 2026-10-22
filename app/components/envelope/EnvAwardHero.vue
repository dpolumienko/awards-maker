<script setup lang="ts">
// The Envelope awards page masthead (review 2026-10-16): the show on a cream
// ticket - host, name, description, partners - and a frosted status card with
// the countdown, the facts and the ceremony. The card is drawn in the show's own
// theme and accent (data/themes.ts envelopeCardCss), so the six themes of the
// builder are the six themes here (review item 16).
import { partnerHref } from '~/utils/partnerIcon'
import { computed, ref } from 'vue'
import type { Award, Partner } from '~/types/award'
import type { Phase } from '~/composables/useVoting'
import { envelopeDarkCss } from '~/data/themes'
import { onBeforeUnmount, onMounted } from 'vue'
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
// Full page (Ed's prototype, 2026-10-22): no card - the theme lies on the page
// itself, full width, dark, lit from the top in the accent, fading under the hero
const bg = computed(() => envelopeDarkCss(props.award.look?.theme, props.accent, props.award.look?.coverUrl, props.award.look?.bg, false))
const hero = ref<HTMLElement | null>(null)
const backdrop = ref<HTMLElement | null>(null)
function fit() {
  const h = hero.value, b = backdrop.value
  if (!h || !b) return
  const top = (b.offsetParent as HTMLElement | null)?.getBoundingClientRect().top ?? 0
  b.style.height = Math.round(h.getBoundingClientRect().bottom - top + 48) + 'px'
}
let ro: ResizeObserver | null = null
onMounted(() => {
  fit()
  ro = new ResizeObserver(fit)
  if (hero.value) ro.observe(hero.value)
})
onBeforeUnmount(() => ro?.disconnect())
const isSc = (name: string) => /streams\s*charts/i.test(name)
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
  <div ref="backdrop" class="ap-backdrop" :data-bg="award.look?.coverUrl ? 'cover' : award.look?.theme ?? 'plain'" :style="{ '--bd-bg': bg, '--ga': accent }" aria-hidden="true">
    <span class="bd-glow" /><span class="bd-rays" /><span class="bd-vig" />
  </div>
  <header ref="hero" class="ap-hero env-full" :data-bg="bgKey">
    <div class="ap-intro">
      <span class="ap-hostchip hc-row">
        <small class="org">Organized by</small>
        <span v-if="!award.look?.hideLogo" class="av hc-av">{{ award.host.name.slice(0, 2).toUpperCase() }}</span>
        <i class="hc-pf2 pf" :class="pf" :aria-label="PLATFORM_NAMES[award.host.platform]" />
        <b>{{ award.host.name }}</b>
      </span>
      <h1 :style="headlineFont ? { fontFamily: headlineFont } : undefined">{{ award.name }}</h1>
      <p class="ap-desc">{{ award.description }}</p>
      <p v-if="partners.length" class="ap-partners">
        <span>With</span>
        <a v-for="p in partners" :key="p.id" :class="isSc(p.name) ? 'ap-pl' : 'ap-pl-slot'" :href="partnerHref(p.url) || undefined" target="_blank" rel="nofollow sponsored noopener" :aria-label="p.name"><template v-if="!isSc(p.name)">{{ p.name }}</template></a>
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
