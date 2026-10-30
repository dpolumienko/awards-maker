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
import SignInButtons from '~/components/ui/SignInButtons.vue'
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
import { useVersion } from '~/composables/useVersion'
import { useAwardPage, useCatalogOpen } from '~/composables/useAwards'
import { emptyTally, phaseOf, resultsOf, useVoting, votesInOf } from '~/composables/useVoting'
import { useBallot } from '~/composables/useBallot'
import { useReveal } from '~/composables/useReveal'
import { playCue } from '~/composables/useCue'
import { accentText, accentOf, onAccent } from '~/utils/accent'
import { nomineeName } from '~/utils/nominee'
import { FREE } from '~/types/award'
import { awardOgImage } from '~/utils/og'
import { formatInZone } from '#shared/time'
import { isIndexable } from '#shared/indexable'
import { useDisplayFonts } from '~/composables/useDisplayFonts'
import ReportAbuse from '~/components/ui/ReportAbuse.vue'
// the Envelope version's masthead and stepper ballot, split out of the other versions' bundle
const EnvAwardHero = defineAsyncComponent(() => import('~/components/envelope/EnvAwardHero.vue'))
const EnvBallot = defineAsyncComponent(() => import('~/components/envelope/EnvBallot.vue'))

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { publishResults } = useVoting()
const { signedIn } = useAccount()

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
const accent = computed(() => accentOf(award.value?.look))
// Fills keep the colour the streamer picked; type takes the readable version.
const ink = computed(() => accentText(accent.value))
const headlineFont = computed(() =>
  award.value?.look?.font ? `'${award.value.look.font}', Archivo, sans-serif` : undefined,
)

// Voting: the state and the submit are shared by every version (composables/useBallot.ts)
const voters = computed(() => data.value?.voters ?? 0)
const ballotState = useBallot({
  slug,
  award,
  ballot: computed(() => data.value?.ballot ?? null),
  phase,
  refresh,
  // the ballot's own foot bar says "Your votes are in" - the cue lights it there
  onCast: () => nextTick(() => playCue(document.querySelector<HTMLElement>('.env-bar'), accent.value)),
})
const { picks, voted, cast, shown, pickedCount, skipped, voteError, mode, submit } = ballotState

// Publishing the winners is the host's call, not a date - so it asks twice and
// the second click is the one that does it.
// Two moments worth marking on this page - both in place, on the block that
// carries the news, rather than in a dialog over it.

const hostPanel = ref<HTMLElement | null>(null)
const envBallot = ref<{ start: () => void } | null>(null)
const { isArmed: publishArmed, arm: armPublish } = useArm()
async function onPublishResults() {
  if (!armPublish()) return
  await publishResults(slug.value)
  await refresh()
  nextTick(() => playCue(hostPanel.value, accent.value))
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

// the Envelope ballot says the state in one line above its steps
const envNote = computed(() => {
  const a = award.value
  if (!a) return ''
  switch (phase.value) {
    case 'soon':
      return `Voting opens ${fmtDate(a.opensAt)}. These are the nominees you will vote on.`
    case 'capped':
      return `Voting closed at the free limit of ${FREE.maxVoters} voters. Every vote already in counts.`
    case 'counting':
      return `Voting is closed. ${a.host.name} announces the winners${a.ceremonyAt ? ` ${fmtDate(a.ceremonyAt)}` : ''}; the counts stay hidden until then.`
    default:
      return voted.value && !skipped.value ? 'Your votes are in, every category. The winners come out at the ceremony.' : ''
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
// asset() adds the base path: on the Pages demo the app lives under /awards-maker/
const shareUrl = computed(() => (import.meta.client ? `${location.origin}${asset(`/a/${slug.value}`)}` : `${siteUrl}/a/${slug.value}`))

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
      a: `Anyone with a Twitch or Kick account. You sign in when you submit, and the account is only used to keep one person to one ballot - we read your email and nothing else. ${a.host.name} does not see who voted for whom.`,
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
          `${nomineeTotal.value} nominees, and anyone can vote with a Twitch or Kick login.`,
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
        { name: 'Streams Charts', item: 'https://streamscharts.com' },
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
      <!-- taken offline: only the host gets this far, and should know nobody else does -->
      <p v-if="award.offline" class="relative z-10 border-b-2 border-warn bg-warn/10 px-4 py-3 text-center text-sm font-semibold text-warn" role="status">
        This awards is offline. Only you can see it; viewers get "not available". Put it back online from the dashboard.
      </p>
      <div class="env-ap shell pt-6" :style="{ '--ga': accent }">
        <!-- Full page (Ed, 2026-10-22): the crumbs are the host's way back; a viewer has nowhere to go back to -->
        <nav v-if="isHost" class="crumbs ap-crumbs" aria-label="Breadcrumb">
          <NuxtLink to="/">Awards Maker</NuxtLink><span aria-hidden="true">/</span>
          <NuxtLink to="/my-awards">Your awards</NuxtLink><span aria-hidden="true">/</span>
          <span aria-current="page">{{ award.name }}</span>
        </nav>
        <div v-if="isHost" ref="hostPanel" class="ap-host" role="region" aria-label="Host tools">
          <span class="ap-host-i" aria-hidden="true" />
          <span class="ap-host-l">
            <b>You host this awards</b>
            <span><i class="ap-host-dot" />{{ badge.text }} · <b class="tnum">{{ voters }}</b>{{ award.tier !== 'paid' ? ` of ${FREE.maxVoters}` : '' }} voters so far<template v-if="phase === 'open' && countdown"> · closes in {{ +countdown.days ? `${+countdown.days} ${+countdown.days === 1 ? 'day' : 'days'}` : `${+countdown.hrs} h` }}</template></span>
          </span>
          <span class="ap-host-r">
            <button v-if="phase === 'counting' || phase === 'capped'" class="btn sm" type="button" @click="onPublishResults">
              {{ publishArmed() ? 'Publish - sure?' : 'Publish the winners' }}
            </button>
            <NuxtLink class="btn sm" :to="`/my-awards/${award.slug}/reveal`">Open the ceremony</NuxtLink>
            <NuxtLink class="btn sm p" :to="`/my-awards/${award.slug}`">Dashboard</NuxtLink>
          </span>
        </div>
        <PaywallNote v-if="isHost && award.tier !== 'paid' && voters / FREE.maxVoters >= 0.8" class="mt-4" reason="voters" compact />
        <EnvAwardHero
          :award="award"
          :phase="phase"
          :state="badge.text"
          :countdown="countdown"
          :countdown-label="countdownLabel"
          :partners="partners"
          :nominee-total="nomineeTotal"
          :voters="voters"
          :closes="fmtDate(phase === 'soon' ? award.opensAt : award.closesAt)"
          :ceremony="fmtDate(award.ceremonyAt)"
          :share-url="shareUrl"
          :accent="accent"
          :headline-font="headlineFont"
          @start="envBallot?.start()"
        />
        <EnvBallot
          ref="envBallot"
          :award="award"
          :tally="tally"
          :mode="mode"
          :shown="shown"
          :cast="cast"
          :voted="voted"
          :picked-count="pickedCount"
          :signed-in="signedIn"
          :vote-error="voteError"
          :note="envNote"
          @pick="(c: string, n: string) => (picks[c] = n)"
          @submit="submit"
        />
        <section class="ap-info" aria-label="How voting works">
          <div class="ai-u"><b>One vote per account</b><span>Sign in with Twitch or Kick once, when you submit.</span></div>
          <div class="ai-l"><b>Picks lock on submit</b><span>One vote per category. Skipped ones stay open.</span></div>
          <div class="ai-e"><b>Counts stay sealed</b><span>Nobody sees the numbers until the host opens them on stream.</span></div>
        </section>
        <ReportAbuse class="ap-report" :slug="slug" variant="line" />
      </div>


      <div class="shell">
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
            {{ FREE.maxVoters }} voters - about ten minutes from an empty form to a link your viewers can vote on.
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
        Nothing is published under <b class="text-ink">/a/{{ slug }}</b>. The host may have taken it down, or the
        link lost a letter on the way.
      </p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <UiButton to="/create">Create your awards</UiButton>
        <UiButton to="/my-awards" variant="ghost">Your awards</UiButton>
      </div>
    </div>
  </div>

</template>
