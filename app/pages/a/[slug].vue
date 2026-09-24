<script setup lang="ts">
// The published awards page: the thing a streamer sends to chat. Everything the
// builder set up is here for real - theme, accent, logo, partners - plus the one
// job this page has that the preview does not: taking a vote.
//
// Server-rendered from /api/awards/<slug>: this is the page the product is
// betting on for search, and until the backend landed a crawler got an empty
// shell. `?state=` still forces a phase for demos and screenshots.
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
import { useAwardPage, useCatalogOpen } from '~/composables/useAwards'
import { emptyTally, phaseOf, resultsOf, useVoting, votesInOf } from '~/composables/useVoting'
import { useReveal } from '~/composables/useReveal'
import { playCue } from '~/composables/useCue'
import { themeCss } from '~/data/themes'
import { accentText } from '~/utils/accent'
import { nomineeName } from '~/utils/nominee'
import { FREE } from '~/types/award'
import { awardOgImage } from '~/utils/og'
import { formatInZone } from '#shared/time'
import { isIndexable } from '#shared/indexable'
import { useDisplayFonts } from '~/composables/useDisplayFonts'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { castBallot, publishResults } = useVoting()
const { signedIn, signIn } = useAccount()

const { data, refresh, error } = await useAwardPage(() => slug.value)
const catalogOpen = useCatalogOpen()
// A show that does not exist is a 404, not a page saying nothing. Anything else
// going wrong is ours, and says so with the right status.
if (error.value) {
  const status = error.value.statusCode === 404 ? 404 : 503
  throw createError({
    statusCode: status,
    statusMessage: status === 404 ? 'No such awards' : 'Briefly unavailable',
    fatal: true,
  })
}
const award = computed(() => data.value?.award)
// the show's own headline face, if it has one - nothing else
useDisplayFonts(() => [award.value?.look?.font])
const tally = computed(() => data.value?.tally ?? emptyTally())
const root = ref<HTMLElement | null>(null)
useReveal(root, { stagger: 0.06 })

// The page changes state on its own while it is open, so the clock has to move.
// Once a minute: a seconds counter would be motion for the sake of motion.
const now = ref(Date.now())
let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => (tick = setInterval(() => (now.value = Date.now()), 60_000)))
onBeforeUnmount(() => clearInterval(tick))

const phase = computed(() =>
  award.value
    ? phaseOf(award.value, data.value?.voters ?? 0, now.value, route.query.state as string)
    : 'open',
)
const accent = computed(() => award.value?.look?.accent || '#D9A441')
// Fills keep the colour the streamer picked; type takes the readable version.
const ink = computed(() => accentText(accent.value))
const headlineFont = computed(() =>
  award.value?.look?.font ? `'${award.value.look.font}', Archivo, sans-serif` : undefined,
)

// Voting, and the one submit each voter gets.
const picks = ref<Record<string, string>>({})
const ballot = computed(() => data.value?.ballot ?? null)
const voted = computed(() => !!ballot.value)
const shown = computed(() => ballot.value?.picks ?? picks.value)
const pickedCount = computed(() => Object.keys(shown.value).length)
const voters = computed(() => data.value?.voters ?? 0)
const done = ref<HTMLElement | null>(null)
const voteError = ref('')

onMounted(() => {
  try {
    const parked = sessionStorage.getItem(PARKED(slug.value))
    if (!parked) return
    sessionStorage.removeItem(PARKED(slug.value))
    if (!voted.value) picks.value = JSON.parse(parked)
  } catch {
    /* nothing parked */
  }
})

const mode = computed<'vote' | 'locked' | 'results'>(() => {
  if (phase.value === 'revealed') return 'results'
  if (phase.value === 'open' && !voted.value) return 'vote'
  return 'locked'
})

/**
 * Twitch OAuth with the voter scope - an email address and nothing else. The
 * sign-in is a full-page round trip, so the picks are parked in sessionStorage
 * and put back when the voter lands on this ballot again (QA P1: they used to
 * come back to an empty ballot). They are not submitted for them - one submit
 * per account, so the voter presses it.
 */
const PARKED = (s: string) => `am-picks:${s}`
async function submit() {
  if (!pickedCount.value) return
  voteError.value = ''
  if (!signedIn.value) {
    try {
      sessionStorage.setItem(PARKED(slug.value), JSON.stringify(picks.value))
    } catch {
      /* private mode: the voter picks again */
    }
    signIn()
    return
  }
  try {
    await castBallot(slug.value, { ...picks.value })
    await refresh()
    nextTick(() => {
      done.value?.focus()
      playCue(done.value, accent.value)
    })
  } catch (error) {
    // 409 is "already voted" or "voting closed" - both are things to say out
    // loud rather than swallow, because the ballot on screen looks fine
    voteError.value = (error as { statusMessage?: string }).statusMessage || 'Could not save your vote'
    await refresh()
  }
}

// Publishing the winners is the host's call, not a date - so it asks twice and
// the second click is the one that does it.
// Two moments worth marking on this page - both in place, on the block that
// carries the news, rather than in a dialog over it.

const hostPanel = ref<HTMLElement | null>(null)
const { isArmed: publishArmed, arm: armPublish } = useArm()
async function onPublishResults() {
  if (!armPublish()) return
  await publishResults(slug.value)
  await refresh()
  nextTick(() => playCue(hostPanel.value, accent.value))
}

// A report does not need an account: somebody who has just been impersonated
// should not have to sign in to say so. The endpoint checks the origin instead.
const reportOpen = ref(false)
const reported = ref(false)
const reportText = ref('')
async function sendReport() {
  // an empty report is not a report - the button is disabled, this is the Enter key
  if (!reportText.value.trim()) return
  try {
    await $fetch('/api/reports', {
      method: 'POST',
      body: { slug: slug.value, reason: reportText.value },
    })
  } catch {
    // saying "sent" either way: a failed report is not the reporter's problem to
    // solve, and the alternative is an error dialog over an accusation
  }
  reported.value = true
  reportOpen.value = false
}

/** Winners per category, but only once the host has published them. */
const winnerNames = computed<Record<string, string>>(() => {
  if (!award.value || phase.value !== 'revealed') return {}
  const out: Record<string, string> = {}
  for (const nomination of award.value.nominations) {
    const top = resultsOf(tally.value, nomination).find((r) => r.top)
    if (top) out[nomination.id] = nomineeName(top.nominee)
  }
  return out
})

const isHost = computed(() => Boolean(data.value?.isHost))

// A voter is rarely in the host's zone, so every time here names the zone.
const fmtDate = (d?: string) => (d && award.value ? formatInZone(d, award.value.timezone) : '')

// One countdown, pointed at whatever happens next.
const target = computed(() => {
  const a = award.value
  if (!a) return null
  if (phase.value === 'soon' && a.opensAt) return Date.parse(a.opensAt)
  if (phase.value === 'open' && a.closesAt) return Date.parse(a.closesAt)
  if (phase.value === 'counting' && a.ceremonyAt) return Date.parse(a.ceremonyAt)
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
// Just the address now. It used to carry the whole show base64'd into a query
// string, because without a server that was the only way a shared link opened
// anything at all - see the deleted utils/awardLink.ts.
const siteUrl = String(useSiteConfig().url)
// absolute on the server too: the Event markup and the share links need it
const shareUrl = computed(() => `${import.meta.client ? location.origin : siteUrl}/a/${slug.value}`)

// SEO. The page is the reason the catalog exists, so it carries its own title,
// description, FAQ and Event markup. The indexing thresholds are the publishing
// thresholds - an awards below them is kept out of search rather than shipped
// as a thin page, and so is anything trading on the name of the show we do not
// own.
// The rule lives in shared/indexable.ts so the sitemap reads the same one.
const thin = computed(() => {
  const a = award.value
  if (!a) return true
  return !isIndexable({
    name: a.name,
    description: a.description,
    categories: a.nominations.length,
    minNominees: Math.min(...a.nominations.map((n) => n.nominees.length)),
  })
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

// the phase without the ?state= preview override, so a host previewing the
// results screen does not mint a card URL nobody else will ever request
const ogImageUrl = computed(() =>
  award.value
    ? awardOgImage(siteUrl, award.value.slug, phaseOf(award.value, data.value?.voters ?? 0), award.value.publishedAt)
    : undefined,
)
// A long name is cut on a word boundary so the title keeps its ending.
const shortName = (name: string, max = 45) =>
  name.length <= max ? name : `${name.slice(0, max).replace(/\s+\S*$/, '')}…`

// The title follows the phase: a show with winners out is searched for its winners.
const seoPhase = computed(() => (award.value ? phaseOf(award.value, data.value?.voters ?? 0) : 'open'))
const seoTitle = computed(() => {
  const a = award.value
  if (!a) return 'Awards page'
  const name = shortName(a.name)
  if (seoPhase.value === 'revealed') return `${name} Winners`
  if (seoPhase.value === 'counting' || seoPhase.value === 'capped') return `${name}: Voting Closed`
  return `${name}: Vote for the Winners`
})
const seoDescription = computed(() => {
  const a = award.value
  if (!a) return 'This awards page is not published.'
  const titles = a.nominations.slice(0, 3).map((n) => n.title).filter(Boolean).join(', ')
  const more = a.nominations.length > 3 ? ` and ${a.nominations.length - 3} more` : ''
  const closed = seoPhase.value === 'counting' || seoPhase.value === 'capped'
  const parts =
    seoPhase.value === 'revealed'
      ? [`The winners of ${a.name}, run by ${a.host.name}.`, titles && `${titles}${more}.`]
      : closed
        ? [
            `${a.host.name} ran ${a.name}: ${titles}${more}.`,
            'Voting is closed.',
            a.ceremonyAt ? `The winners are announced ${fmtDate(a.ceremonyAt)}.` : 'The winners are announced soon.',
          ]
        : [
          `${a.host.name} is running ${a.name}: ${titles}${more}.`,
          `${nomineeTotal.value} nominees, and anyone can vote with a Twitch login.`,
          a.closesAt && `Voting closes ${fmtDate(a.closesAt)}.`,
        ]
  return parts.filter(Boolean).join(' ')
})

// Header and meta must agree: the module sends X-Robots-Tag from this.
useRobotsRule(computed(() => (award.value && !thin.value ? 'index, follow' : 'noindex, follow')))

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  robots: () => (award.value && !thin.value ? 'index, follow' : 'noindex, follow'),
  ogType: 'website',
  ogImage: () => ogImageUrl.value,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: () => (award.value ? `${award.value.name}, presented by ${award.value.host.name}` : undefined),
  twitterCard: 'summary_large_image',
})


// The channel a host runs, as a URL, where the platform has one by name.
const channelUrl = (h: { name: string; platform: string }) =>
  h.platform === 'twitch' ? `https://www.twitch.tv/${h.name}` : h.platform === 'kick' ? `https://kick.com/${h.name}` : undefined

// Event markup only for a page search is allowed to index. The FAQ below the
// ballot stays on the page but is not marked up: Google no longer shows FAQ
// results for a site like this, and the Event is what the page is.
if (award.value && !thin.value) {
  useSchemaOrg([
    defineBreadcrumb({
      // a getter: whether the catalog is open is only known once its fetch lands
      itemListElement: computed(() => [
        { name: 'Awards Maker', item: '/' },
        ...(catalogOpen.value ? [{ name: 'Catalog', item: '/catalog' }] : []),
        { name: award.value?.name ?? '' },
      ]),
    }),
    defineEvent({
      name: award.value.name,
      description: award.value.description,
      // required by Google; a show with no opening date opened when it was published
      startDate: award.value.opensAt || award.value.publishedAt || undefined,
      endDate: award.value.ceremonyAt || award.value.closesAt || undefined,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      image: ogImageUrl.value,
      // a person running a show, not the site's publisher
      organizer: definePerson({ name: award.value.host.name, url: channelUrl(award.value.host) }),
      location: defineVirtualLocation({ url: shareUrl.value }),
      offers: { price: 0, priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: shareUrl.value },
    }),
  ])
}
</script>

<template>
  <div ref="root" class="pb-24">
    <template v-if="award">
      <!-- cover band: the streamer's theme or their own cover, full width -->
      <div class="relative h-48 sm:h-64" :style="themeCss(award.look?.theme, accent, award.look?.coverUrl)">
        <!-- fades into the page's own canvas, which is not pure black under SC Blue -->
        <span aria-hidden="true" class="absolute inset-0 bg-[linear-gradient(180deg,rgb(var(--canvas)/.35),rgb(var(--canvas)))]" />
        <div class="shell relative flex h-full flex-col justify-end pb-5">
          <nav aria-label="Breadcrumb" class="mb-auto pt-24">
            <ol class="flex list-none flex-wrap items-center gap-2 p-0 text-[11px] font-semibold uppercase tracking-micro text-ink-muted">
              <li><NuxtLink to="/" class="inline-block py-1.5 no-underline hover:text-ink">Awards Maker</NuxtLink></li>
              <li aria-hidden="true">/</li>
              <template v-if="catalogOpen">
                <li><NuxtLink to="/catalog" class="inline-block py-1.5 no-underline hover:text-ink">Catalog</NuxtLink></li>
                <li aria-hidden="true">/</li>
              </template>
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
                class="mt-5"
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
                :results="mode === 'results' ? resultsOf(tally, n) : []"
                :votes-in="votesInOf(tally, n)"
                @pick="picks[n.id] = $event"
              />
            </div>

            <!-- submit: sticky, because the ballot is longer than a screen -->
            <div
              v-if="mode === 'vote'"
              class="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-hair bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:mx-0 lg:rounded-card lg:border lg:px-5"
            >
              <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p class="text-sm" aria-live="polite">
                  <b class="tnum">{{ pickedCount }} of {{ award.nominations.length }}</b>
                  <span class="text-ink-2"> categories picked</span>
                </p>
                <p v-if="pickedCount < award.nominations.length" class="hidden text-sm text-ink-muted sm:block">
                  You get one submit, so finish the ones you care about first.
                </p>
                <button
                  v-if="!signedIn"
                  type="button"
                  class="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-btn bg-twitch px-5 py-2 text-center text-[15px] font-bold uppercase leading-tight tracking-button text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:ml-auto sm:w-auto"
                  :disabled="!pickedCount"
                  @click="submit"
                >
                  <!-- a disabled button that does not say why reads as broken -->
                  {{ pickedCount ? 'Sign in with Twitch to submit' : 'Pick at least one' }}
                </button>
                <UiButton v-else class="w-full sm:ml-auto sm:w-auto" :disabled="!pickedCount" @click="submit">
                  {{ pickedCount ? `Submit ${pickedCount} ${pickedCount === 1 ? 'vote' : 'votes'}` : 'Pick at least one' }}
                </UiButton>
              </div>
              <!-- already voted, voting closed, ceiling reached: all things the
                   ballot on screen still looks fine after, so they get said -->
              <p v-if="voteError" class="mt-3 text-sm text-danger" role="alert">{{ voteError }}</p>
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
                <template v-if="award.ceremonyAt">Winners are announced {{ fmtDate(award.ceremonyAt) }}.</template>
                Send the page to other viewers: every vote after yours changes the result.
              </p>
            </div>
          </div>

          <!-- SIDE -->
          <aside class="space-y-6 lg:sticky lg:top-24">
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
                    <span class="col-start-1 row-start-1">{{ publishArmed() ? 'Publish - sure?' : 'Publish the winners' }}</span>
                  </span>
                </UiButton>
                <!-- announcing before the vote is closed would announce a number
                     that is still moving -->
                <UiButton
                  v-if="phase === 'counting' || phase === 'capped' || phase === 'revealed'"
                  :to="`/my-awards/${award.slug}/reveal`"
                  variant="ghost"
                  size="sm"
                >Run the ceremony</UiButton>
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
                      :disabled="!reportText.trim()"
                      class="h-10 rounded-btn border border-hair px-4 text-sm font-bold uppercase tracking-button transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-hair disabled:hover:text-ink"
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
          :closes="formatInZone(award.closesAt, award.timezone, { month: 'short' })"
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
