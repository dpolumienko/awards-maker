<script setup lang="ts">
// The published awards page: the thing a streamer sends to chat. Everything the
// builder set up is here for real - theme, accent, logo, partners - plus the one
// job this page has that the preview does not: taking a vote.
//
// No backend yet. The ballot and the tally live in localStorage (see
// useVoting), so the whole flow - open, vote, locked, closed, winners - can be
// walked end to end. `?state=` forces a phase for demos and screenshots.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import UiBadge from '~/components/ui/UiBadge.vue'
import PlatformDot from '~/components/ui/PlatformDot.vue'
import LimitMeter from '~/components/ui/LimitMeter.vue'
import PaywallNote from '~/components/ui/PaywallNote.vue'
import BallotNomination from '~/components/ui/BallotNomination.vue'
import ShareRow from '~/components/ui/ShareRow.vue'
import ShareCards from '~/components/ui/ShareCards.vue'
import PartnerChip from '~/components/ui/PartnerChip.vue'
import CountdownRow from '~/components/ui/CountdownRow.vue'
import InteractiveAccordion from '~/components/ui/InteractiveAccordion.vue'
import { useAwardDraft } from '~/composables/useAwardDraft'
import { useVoting } from '~/composables/useVoting'
import { useReveal } from '~/composables/useReveal'
import { playCue } from '~/composables/useCue'
import { themeCss } from '~/data/themes'
import { accentText } from '~/utils/accent'
import { decodeAward, encodeAward } from '~/utils/awardLink'
import { nomineeName } from '~/utils/nominee'
import { FREE, PUBLISH } from '~/types/award'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { published } = useAwardDraft()
const { ballotFor, votersFor, castBallot, publishResults, phaseOf, resultsOf, votesInOf } = useVoting()

/**
 * The show, from this browser's storage - or, when it was published somewhere else,
 * from the link itself (`?s=`). Without a backend that is the only way a shared
 * address opens anything at all; see utils/awardLink.ts.
 */
const fromLink = computed(() => {
  const payload = route.query.s
  return typeof payload === 'string' ? decodeAward(payload) : null
})
const award = computed(() => published.value.find((a) => a.slug === slug.value) ?? fromLink.value ?? undefined)
/** True when the page is reading the link, not storage: votes here stay local. */
const guestCopy = computed(() => !!fromLink.value && !published.value.some((a) => a.slug === slug.value))
const root = ref<HTMLElement | null>(null)
useReveal(root, { stagger: 0.06 })

// The page changes state on its own while it is open, so the clock has to move.
// Once a minute: a seconds counter would be motion for the sake of motion.
const now = ref(Date.now())
let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => (tick = setInterval(() => (now.value = Date.now()), 60_000)))
onBeforeUnmount(() => clearInterval(tick))

const phase = computed(() => (award.value ? phaseOf(award.value, now.value, route.query.state as string) : 'open'))
const accent = computed(() => award.value?.look?.accent || '#D9A441')
// Fills keep the colour the streamer picked; type takes the readable version.
const ink = computed(() => accentText(accent.value))
const headlineFont = computed(() =>
  award.value?.look?.font ? `'${award.value.look.font}', Archivo, sans-serif` : undefined,
)

// Voting, and the one submit each voter gets.
const signedIn = ref(false)
const picks = ref<Record<string, string>>({})
const ballot = computed(() => ballotFor(slug.value))
const voted = computed(() => !!ballot.value)
const shown = computed(() => ballot.value?.picks ?? picks.value)
const pickedCount = computed(() => Object.keys(shown.value).length)
const voters = computed(() => votersFor(slug.value))
const done = ref<HTMLElement | null>(null)

const mode = computed<'vote' | 'locked' | 'results'>(() => {
  if (phase.value === 'revealed') return 'results'
  if (phase.value === 'open' && !voted.value) return 'vote'
  return 'locked'
})

/**
 * Real flow: this is where Twitch OAuth runs, with the voter scope only - email
 * and nothing else - and the ballot is submitted on the way back. Mocked here
 * as one step so the page can be walked without an auth server.
 */
function submit() {
  if (!pickedCount.value) return
  signedIn.value = true
  if (castBallot(slug.value, { ...picks.value })) {
    nextTick(() => {
      done.value?.focus()
      playCue(done.value, accent.value)
    })
  }
}

// Publishing the winners is the host's call, not a date - so it asks twice and
// the second click is the one that does it.
// Two moments worth marking on this page - both in place, on the block that
// carries the news, rather than in a dialog over it.

const hostPanel = ref<HTMLElement | null>(null)
const armPublish = ref(false)
function onPublishResults() {
  if (!armPublish.value) {
    armPublish.value = true
    setTimeout(() => (armPublish.value = false), 4000)
    return
  }
  publishResults(slug.value)
  armPublish.value = false
  nextTick(() => playCue(hostPanel.value, accent.value))
}

// Report goes to the moderation queue in the admin - which does not exist yet,
// so it is queued locally like the votes are, and says so.
const reportOpen = ref(false)
const reported = ref(false)
const reportText = ref('')
function sendReport() {
  try {
    const key = 'awards-maker:reports'
    const all = JSON.parse(localStorage.getItem(key) || '[]')
    all.push({ slug: slug.value, reason: reportText.value, at: new Date().toISOString() })
    localStorage.setItem(key, JSON.stringify(all))
  } catch {
    /* nothing to do without storage */
  }
  reported.value = true
  reportOpen.value = false
}

/** Winners per category, but only once the host has published them. */
const winnerNames = computed<Record<string, string>>(() => {
  if (!award.value || phase.value !== 'revealed') return {}
  const out: Record<string, string> = {}
  for (const nomination of award.value.nominations) {
    const top = resultsOf(award.value.slug, nomination).find((r) => r.top)
    if (top) out[nomination.id] = nomineeName(top.nominee)
  }
  return out
})

const isHost = computed(() => !!award.value && published.value.some((a) => a.slug === award.value!.slug))

const fmtDate = (d?: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

// One countdown, pointed at whatever happens next.
const target = computed(() => {
  const a = award.value
  if (!a) return null
  if (phase.value === 'soon' && a.opensAt) return new Date(`${a.opensAt}T00:00:00`).getTime()
  if (phase.value === 'open' && a.closesAt) return new Date(`${a.closesAt}T23:59:59`).getTime()
  if (phase.value === 'counting' && a.ceremonyAt) return new Date(`${a.ceremonyAt}T00:00:00`).getTime()
  return null
})
const countdown = computed(() => {
  if (!target.value) return null
  const diff = target.value - now.value
  if (diff <= 0) return null
  return {
    days: String(Math.floor(diff / 86_400_000)).padStart(2, '0'),
    hrs: String(Math.floor((diff % 86_400_000) / 3_600_000)).padStart(2, '0'),
    mins: String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, '0'),
  }
})
const countdownLabel = computed(() =>
  phase.value === 'soon' ? 'Voting opens in' : phase.value === 'counting' ? 'Winners announced in' : 'Voting closes in',
)

const badge = computed(() => {
  switch (phase.value) {
    case 'soon':
      return { tone: 'ended' as const, text: `Opens ${fmtDate(award.value?.opensAt)}` }
    case 'counting':
      return { tone: 'results' as const, text: 'Voting closed' }
    case 'capped':
      return { tone: 'ended' as const, text: 'Voting closed' }
    case 'revealed':
      return { tone: 'results' as const, text: 'Winners announced' }
    default:
      return { tone: 'live' as const, text: 'Voting open' }
  }
})

const partners = computed(() => (award.value?.partners ?? []).filter((p) => p.name.trim()))
const nomineeTotal = computed(() =>
  (award.value?.nominations ?? []).reduce((sum, n) => sum + n.nominees.length, 0),
)
// The link a host hands out carries the show with it, so it opens for somebody
// who has never been here. Long, and honest about why: there is no server yet.
const shareUrl = computed(() => {
  const base = import.meta.client ? `${location.origin}${location.pathname}` : `/a/${slug.value}`
  return award.value ? `${base}?s=${encodeAward(award.value)}` : base
})

// SEO. The page is the reason the catalog exists, so it carries its own title,
// description, FAQ and Event markup. The indexing thresholds are the publishing
// thresholds - an awards below them is kept out of search rather than shipped
// as a thin page, and so is anything trading on the name of the show we do not
// own.
const thin = computed(() => {
  const a = award.value
  if (!a) return true
  return (
    a.nominations.length < PUBLISH.minNominations ||
    a.nominations.some((n) => n.nominees.length < PUBLISH.minNomineesPerNomination) ||
    a.description.trim().length < 20 ||
    /streamer\s+awards/i.test(a.name)
  )
})

const faq = computed(() => {
  const a = award.value
  if (!a) return []
  return [
    {
      q: `Who can vote in ${a.name}?`,
      a: `Anyone with a Twitch account. You sign in when you submit, and the account is only used to keep one person to one ballot - we read your email and nothing else. ${a.host.name} does not see who voted for whom.`,
    },
    {
      q: 'How many times can I vote?',
      a: `Once per category, and one submit per account. Pick a nominee in each of the ${a.nominations.length} categories, send the ballot and it is locked - there is no changing it after, because a vote you can take back is not a vote.`,
    },
    {
      q: 'When are the winners announced?',
      a: a.ceremonyAt
        ? `${a.host.name} announces them, and the ceremony is set for ${fmtDate(a.ceremonyAt)}. Voting closes ${fmtDate(a.closesAt)} and the counts stay hidden until the announcement, so nobody can play the leaderboard in the last hours.`
        : `${a.host.name} announces them once voting closes. The counts stay hidden until then.`,
    },
    {
      q: `Who runs ${a.name}?`,
      a: `${a.host.name} does. The categories, the nominees and the dates are theirs; Streams Charts hosts the page, counts the votes and keeps the results online afterwards.`,
    },
    {
      q: 'Can I run awards for my own channel?',
      a: `Yes, and the free plan covers a first season: up to ${FREE.maxNominations} categories and ${FREE.maxVoters} voters, with a page like this one. It takes about ten minutes to set up.`,
    },
  ]
})

useSeoMeta({
  title: () => (award.value ? `${award.value.name}: Vote for the Winners` : 'Awards page'),
  description: () =>
    award.value
      ? `${award.value.host.name} is running ${award.value.name} - ${award.value.nominations.length} categories, ${nomineeTotal.value} nominees, open to any Twitch account. ${award.value.closesAt ? `Voting closes ${fmtDate(award.value.closesAt)}.` : ''}`
      : 'This awards page has not been published from this browser.',
  robots: () => (award.value && !thin.value ? 'index, follow' : 'noindex, follow'),
  ogType: 'website',
})


// Everything here is known synchronously (the page is client-rendered off
// localStorage), so the markup is built from plain values, not getters.
if (award.value) {
  useSchemaOrg([
    defineBreadcrumb({
      itemListElement: [
        { name: 'Awards Maker', item: '/' },
        { name: 'Catalog', item: '/catalog' },
        { name: award.value.name },
      ],
    }),
    defineEvent({
      name: award.value.name,
      description: award.value.description,
      startDate: award.value.opensAt || undefined,
      endDate: award.value.ceremonyAt || undefined,
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      organizer: { name: award.value.host.name },
      location: defineVirtualLocation({ url: shareUrl.value }),
    }),
    ...faq.value.map((f) => defineQuestion({ name: f.q, acceptedAnswer: f.a })),
  ])
}
</script>

<template>
  <div ref="root" class="pb-24">
    <template v-if="award">
      <!-- cover band: the streamer's theme or their own cover, full width -->
      <div class="relative h-48 sm:h-64" :style="themeCss(award.look?.theme, accent, award.look?.coverUrl)">
        <span aria-hidden="true" class="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.35),#000)]" />
        <div class="shell relative flex h-full flex-col justify-end pb-5">
          <nav aria-label="Breadcrumb" class="mb-auto pt-24">
            <ol class="flex list-none flex-wrap items-center gap-2 p-0 text-[11px] font-semibold uppercase tracking-micro text-ink-muted">
              <li><NuxtLink to="/" class="inline-block py-1.5 no-underline hover:text-ink">Awards Maker</NuxtLink></li>
              <li aria-hidden="true">/</li>
              <li><NuxtLink to="/catalog" class="inline-block py-1.5 no-underline hover:text-ink">Catalog</NuxtLink></li>
              <li aria-hidden="true">/</li>
              <li class="truncate text-ink-2" aria-current="page">{{ award.name }}</li>
            </ol>
          </nav>
          <div class="flex flex-wrap items-center gap-3">
            <span
              aria-hidden="true"
              class="grid h-11 w-11 place-items-center rounded-pill text-sm font-bold"
              :style="{ background: accent, color: '#000' }"
            >
              {{ award.host.name.slice(0, 2).toUpperCase() }}
            </span>
            <span class="font-semibold">{{ award.host.name }}</span>
            <PlatformDot :platform="award.host.platform" />
            <span class="ml-auto"><UiBadge :tone="badge.tone">{{ badge.text }}</UiBadge></span>
          </div>
        </div>
      </div>

      <div class="shell pt-8">
        <h1
          class="display-2"
          :style="{ fontFamily: headlineFont }"
        >{{ award.name }}</h1>
        <span aria-hidden="true" class="mt-4 block h-0.5 w-20" :style="{ background: accent }" />
        <p class="mt-4 max-w-copy text-lg text-ink-2">{{ award.description }}</p>

        <!-- partners sit with the title, not at the foot of the page: a sponsor
             that only shows up under the ballot was never really on the page -->
        <div v-if="partners.length" class="mt-5 flex flex-wrap items-center gap-2">
          <span class="micro mr-1">Partners</span>
          <PartnerChip v-for="p in partners" :key="p.id" :partner="p" :accent="accent" />
        </div>

        <!-- the facts a visitor checks before voting -->
        <dl class="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-y border-hair py-5">
          <div>
            <dt class="label">Categories</dt>
            <dd class="tnum mt-1 text-lg font-semibold">{{ award.nominations.length }}</dd>
          </div>
          <div>
            <dt class="label">Nominees</dt>
            <dd class="tnum mt-1 text-lg font-semibold">{{ nomineeTotal }}</dd>
          </div>
          <div>
            <dt class="label">Votes cast</dt>
            <dd class="tnum mt-1 text-lg font-semibold">{{ voters }}</dd>
          </div>
          <div v-if="award.closesAt">
            <dt class="label">Voting closes</dt>
            <dd class="mt-1 text-lg font-semibold">{{ fmtDate(award.closesAt) }}</dd>
          </div>
          <div v-if="award.ceremonyAt">
            <dt class="label">Ceremony</dt>
            <dd class="mt-1 text-lg font-semibold">{{ fmtDate(award.ceremonyAt) }}</dd>
          </div>
        </dl>

        <div class="mt-8 grid items-start gap-10 lg:grid-cols-[7fr_5fr]">
          <!-- BALLOT -->
          <div>
            <!-- what state the page is in, said once, in words -->
            <div
              v-if="phase !== 'open' || voted"
              class="rounded-card border p-5"
              :class="phase === 'capped' ? 'border-warn/40 bg-warn/[0.06]' : 'border-hair bg-s1'"
            >
              <p class="font-semibold">
                <template v-if="phase === 'soon'">Voting opens {{ fmtDate(award.opensAt) }}</template>
                <template v-else-if="phase === 'capped'">Voting closed at the free limit</template>
                <template v-else-if="phase === 'counting'">Voting is closed, winners are next</template>
                <template v-else-if="phase === 'revealed'">The winners</template>
                <template v-else>Your votes are in</template>
              </p>
              <p class="mt-1 text-sm text-ink-2">
                <template v-if="phase === 'soon'">
                  The ballot below is the one you will vote on. Nothing changes once voting starts.
                </template>
                <template v-else-if="phase === 'capped'">
                  This awards reached {{ FREE.maxVoters }} voters, the ceiling on the free plan. Every vote already cast
                  still counts and the winners are announced as planned.
                </template>
                <template v-else-if="phase === 'counting'">
                  {{ voters }} {{ voters === 1 ? 'person' : 'people' }} voted. The winners appear here when
                  {{ award.host.name }} announces them{{ award.ceremonyAt ? ', set for ' + fmtDate(award.ceremonyAt) : '' }} -
                  results stay hidden until then, so the last hours cannot be played.
                </template>
                <template v-else-if="phase === 'revealed'">
                  Counted from {{ voters }} {{ voters === 1 ? 'ballot' : 'ballots' }}, announced by
                  {{ award.host.name }}. The page stays up at this address.
                </template>
                <template v-else>
                  Counted. One ballot per account, so this is your final answer - but you can still send the page on.
                </template>
              </p>

              <CountdownRow
                v-if="countdown"
                :label="countdownLabel"
                :days="countdown.days"
                :hrs="countdown.hrs"
                :mins="countdown.mins"
                :ink="ink"
              />

              <div v-if="voted && phase !== 'revealed'" class="mt-5">
                <ShareRow :url="shareUrl" :text="`I voted in ${award.name}. Your turn:`" />
              </div>
            </div>

            <!-- open and not voted yet: the countdown lives above the ballot -->
            <div v-else>
              <CountdownRow
                v-if="countdown"
                :label="countdownLabel"
                :days="countdown.days"
                :hrs="countdown.hrs"
                :mins="countdown.mins"
                :ink="ink"
              />
              <p class="mt-3 text-sm text-ink-2">One vote per category. Twitch login on submit.</p>
            </div>

            <div class="mt-6 space-y-4">
              <BallotNomination
                v-for="(n, i) in award.nominations"
                :key="n.id"
                :nomination="n"
                :index="i"
                :accent="accent"
                :mode="mode"
                :picked="shown[n.id] ?? null"
                :results="mode === 'results' ? resultsOf(award.slug, n) : []"
                :votes-in="votesInOf(award.slug, n)"
                @pick="picks[n.id] = $event"
              />
            </div>

            <!-- submit: sticky, because the ballot is longer than a screen -->
            <div
              v-if="mode === 'vote'"
              class="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-hair bg-canvas/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8"
            >
              <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p class="text-sm" aria-live="polite">
                  <b class="tnum">{{ pickedCount }} of {{ award.nominations.length }}</b>
                  <span class="text-ink-2"> categories picked</span>
                </p>
                <p v-if="pickedCount < award.nominations.length" class="text-sm text-ink-muted">
                  You get one submit, so finish the ones you care about first.
                </p>
                <button
                  v-if="!signedIn"
                  type="button"
                  class="ml-auto flex min-h-[48px] max-w-full items-center gap-2 rounded-btn bg-twitch px-5 py-2 text-center text-[15px] font-bold uppercase leading-tight tracking-button text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  :disabled="!pickedCount"
                  @click="submit"
                >
                  Sign in with Twitch to submit
                </button>
                <UiButton v-else class="ml-auto" :disabled="!pickedCount" @click="submit">
                  Submit {{ pickedCount }} {{ pickedCount === 1 ? 'vote' : 'votes' }}
                </UiButton>
              </div>
            </div>

            <!-- the confirmation the submit scrolls into: focusable, so a screen
                 reader lands on it instead of losing the place -->
            <div
              v-if="voted && phase !== 'revealed'"
              ref="done"
              tabindex="-1"
              role="status"
              class="mt-6 rounded-card border p-5"
              :style="{ borderColor: accent }"
            >
              <p class="font-semibold">Thanks - your ballot is counted.</p>
              <p class="mt-1 text-sm text-ink-2">
                Winners are announced {{ fmtDate(award.ceremonyAt) }}. Send the page to the rest of the chat: every
                vote after yours changes the result.
              </p>
            </div>
          </div>

          <!-- SIDE -->
          <aside class="space-y-6 lg:sticky lg:top-24">
            <div v-if="guestCopy" class="rounded-card border border-hair bg-s1 p-5">
              <p class="label">Opened from a link</p>
              <p class="mt-2 text-sm text-ink-2">
                This show was published in someone else's browser and travelled here inside the address. You can
                read it and vote; your ballot is counted on this device until the service has a backend.
              </p>
            </div>

            <div v-if="isHost" ref="hostPanel" class="relative rounded-card border border-gold-24 bg-gold/[0.06] p-5">
              <p class="micro text-gold-text">You host this awards</p>
              <LimitMeter
                class="mt-3"
                label="Unique voters"
                :used="voters"
                :total="FREE.maxVoters"
                note="Voting stops at the free ceiling. Votes already cast are kept."
              />
              <div class="mt-4 flex flex-wrap gap-3">
                <UiButton
                  v-if="phase === 'counting' || phase === 'capped'"
                  size="sm"
                  @click="onPublishResults"
                >
                  <span class="grid">
                    <span aria-hidden="true" class="col-start-1 row-start-1 invisible">Publish the winners</span>
                    <span class="col-start-1 row-start-1">{{ armPublish ? 'Publish - sure?' : 'Publish the winners' }}</span>
                  </span>
                </UiButton>
                <UiButton :to="`/my-awards/${award.slug}/reveal`" variant="ghost" size="sm">Run the ceremony</UiButton>
                <UiButton :to="`/my-awards/${award.slug}`" variant="ghost" size="sm">Your dashboard</UiButton>
              </div>
              <p v-if="phase === 'counting' || phase === 'capped'" class="mt-3 text-sm text-ink-muted">
                Nobody sees the counts until you do this. It cannot be undone.
              </p>
            </div>
            <PaywallNote v-if="isHost && voters / FREE.maxVoters >= 0.8" reason="voters" compact />

            <div class="rounded-card border border-hair bg-s1 p-5">
              <p class="label">How voting works</p>
              <ul class="mt-3 list-none space-y-2.5 p-0 text-sm text-ink-2">
                <li v-for="r in [
                  'Any Twitch account can vote, one ballot each.',
                  'One vote per category, locked once you submit.',
                  'Counts stay hidden until the host announces the winners.',
                  'The host sets the categories and the nominees.',
                ]" :key="r" class="flex items-start gap-3">
                  <span aria-hidden="true" class="mt-2 block h-1 w-1 flex-none rounded-pill" :style="{ background: accent }" />
                  {{ r }}
                </li>
              </ul>
            </div>

            <div class="rounded-card border border-hair bg-s1 p-5">
              <p class="label">Share it</p>
              <p class="mt-2 text-sm text-ink-2">A show nobody knows about has no winners.</p>
              <ShareRow class="mt-4" :url="shareUrl" :text="`Vote in ${award.name}:`" />
            </div>

            <div class="rounded-card border border-hair bg-s1 p-5">
              <p class="label">Something wrong with this page?</p>
              <p v-if="reported" class="mt-2 text-sm text-live">Reported. Our moderators pick it up from the queue.</p>
              <template v-else>
                <p class="mt-2 text-sm text-ink-2">
                  Awards are made by streamers, not by us. Anything abusive or stolen goes to our moderation queue.
                </p>
                <button
                  v-if="!reportOpen"
                  type="button"
                  class="mt-3 text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-danger"
                  @click="reportOpen = true"
                >
                  Report this awards
                </button>
                <form v-else class="mt-3" @submit.prevent="sendReport">
                  <label class="label" for="report-reason">What is wrong</label>
                  <textarea
                    id="report-reason"
                    v-model="reportText"
                    rows="3"
                    class="mt-2 w-full rounded-btn border border-hair bg-canvas p-3 text-sm"
                    placeholder="Harassment, stolen content, impersonation..."
                  />
                  <div class="mt-3 flex gap-3">
                    <button
                      type="submit"
                      class="h-10 rounded-btn border border-hair px-4 text-sm font-bold uppercase tracking-button transition-colors hover:border-danger hover:text-danger"
                    >
                      Send report
                    </button>
                    <button type="button" class="text-sm text-ink-muted underline underline-offset-4" @click="reportOpen = false">Cancel</button>
                  </div>
                </form>
              </template>
            </div>
          </aside>
        </div>

        <!-- the cards: this is how the page finds the next voter -->
        <ShareCards
          class="mt-12"
          :award="award"
          :url="shareUrl"
          :closes="fmtDate(award.closesAt)"
          :winners="winnerNames"
          :is-host="isHost"
          :has-voted="voted"
        />

        <!-- reading matter, and the conversion this page owes the product -->
        <section class="mt-16 border-t border-hair pt-12">
          <h2 class="heading">Questions about voting</h2>
          <div class="mt-6 border-t border-hair">
            <InteractiveAccordion :items="faq" />
          </div>
        </section>

        <section class="mt-12 rounded-card border border-gold-24 bg-gold/[0.06] p-6 sm:p-8">
          <h2 class="text-2xl font-bold uppercase tracking-heading">Run awards for your own channel</h2>
          <p class="mt-2 max-w-copy text-ink-2">
            Same page, your categories. Free for up to {{ FREE.maxNominations }} categories and
            {{ FREE.maxVoters }} voters - about ten minutes from an empty form to a link in chat.
          </p>
          <div class="mt-5 flex flex-wrap gap-3">
            <UiButton to="/create">Create your awards</UiButton>
            <UiButton to="/" variant="ghost">How it works</UiButton>
          </div>
        </section>
      </div>
    </template>

    <!-- no such page in this browser: say so, and give the two ways out -->
    <div v-else class="shell py-20 text-center">
      <h1 class="heading">This awards page is not here</h1>
      <p class="mx-auto mt-3 max-w-copy text-ink-2">
        Nothing has been published under <b class="text-ink">/a/{{ slug }}</b> from this browser. Until the backend
        lands a show lives in the browser that made it - a plain address from another device opens nothing.
        The <b class="text-ink">Copy link</b> button on an awards page hands out a link that carries the show with
        it, and that one opens anywhere.
      </p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <UiButton to="/create">Create your awards</UiButton>
        <UiButton to="/my-awards" variant="ghost">Your awards</UiButton>
      </div>
    </div>
  </div>

</template>
