<script setup lang="ts">
// The host's dashboard for one awards. Everything here is private: the counts
// are the one thing voters must not see before the winners are announced, so
// this page exists precisely so the host does not have to publish results to
// find out how the vote is going.
//
// Every number is counted from the ballots. Nothing is modelled, projected or
// filled in - a page with no votes says so instead of drawing an empty chart.
import { computed, nextTick, ref } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import UiBadge from '~/components/ui/UiBadge.vue'
import UiIcon from '~/components/ui/UiIcon.vue'
import LimitMeter from '~/components/ui/LimitMeter.vue'
import ShareRow from '~/components/ui/ShareRow.vue'
import PlatformDot from '~/components/ui/PlatformDot.vue'
import PaywallNote from '~/components/ui/PaywallNote.vue'
import TrendArea from '~/components/ui/TrendArea.vue'
import RankBars from '~/components/ui/RankBars.vue'
import { useAwardPage } from '~/composables/useAwards'
import { dailyOf, emptyTally, phaseOf, resultsOf, useVoting, votesInOf } from '~/composables/useVoting'
import { dayIn, formatInZone } from '#shared/time'
import { useReveal } from '~/composables/useReveal'
import { playCue } from '~/composables/useCue'
import { accentText, accentOf } from '~/utils/accent'
import { nomineeName, nomineeSub } from '~/utils/nominee'
import { FREE, type Nomination } from '~/types/award'
import { DISPLAY_FONTS, useDisplayFonts } from '~/composables/useDisplayFonts'

// ceremony typefaces and share cards draw in any of the headline faces
useDisplayFonts(DISPLAY_FONTS)

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { closeVoting, publishResults } = useVoting()
const { data, refresh } = await useAwardPage(() => slug.value)

const root = ref<HTMLElement | null>(null)
useReveal(root, { stagger: 0.05 })

const award = computed(() => data.value?.award ?? null)
const tally = computed(() => data.value?.tally ?? emptyTally())
const phase = computed(() => (award.value ? phaseOf(award.value, data.value?.voters ?? 0) : 'open'))
const accent = computed(() => accentOf(award.value?.look))
const ink = computed(() => accentText(accent.value))

const voters = computed(() => data.value?.voters ?? 0)
const trend = computed(() =>
  award.value
    ? dailyOf(
        tally.value,
        award.value.opensAt ? dayIn(award.value.opensAt, award.value.timezone) : undefined,
        award.value.closesAt ? dayIn(award.value.closesAt, award.value.timezone) : undefined,
      )
    : [],
)


/**
 * One category: the standing, how many ballots reached it, and how close it is.
 * A tie is called out because somebody has to break it, and that somebody is the
 * host - there is no rule in the product that does it for them.
 */
const races = computed(() =>
  (award.value?.nominations ?? []).map((nomination: Nomination) => {
    const rows = resultsOf(tally.value, nomination)
    const votes = votesInOf(tally.value, nomination)
    const lead = rows[0]?.votes ?? 0
    const runnerUp = rows[1]?.votes ?? 0
    const tied = lead > 0 && rows.filter((r) => r.votes === lead).length > 1
    return {
      nomination,
      votes,
      coverage: voters.value ? Math.round((votes / voters.value) * 100) : 0,
      tied,
      margin: lead - runnerUp,
      leader: rows[0],
      items: rows.map((r) => ({
        label: nomineeName(r.nominee),
        sub: nomineeSub(r.nominee),
        value: r.votes,
        valueLabel: `${r.votes} · ${r.pct}%`,
        highlight: r.top && !tied,
      })),
    }
  }),
)

const totalVotes = computed(() => races.value.reduce((sum, r) => sum + r.votes, 0))
const perBallot = computed(() => (voters.value ? totalVotes.value / voters.value : 0))

// Which categories the ballots reach. The bottom of this list is the useful end:
// a category everybody skips is usually one nobody understood.
const coverage = computed(() =>
  [...races.value]
    .sort((a, b) => b.votes - a.votes)
    .map((r) => ({
      label: r.nomination.title || 'Untitled category',
      value: r.votes,
      valueLabel: `${r.votes} of ${voters.value}`,
      highlight: false,
    })),
)
const weakest = computed(() => coverage.value[coverage.value.length - 1])
const ties = computed(() => races.value.filter((r) => r.tied).length)

// dates are UTC instants; the host sees them in the show's zone, named
const fmt = (d?: string) => (d && award.value ? formatInZone(d, award.value.timezone, { month: 'short' }) : '')
const daysLeft = computed(() => {
  if (!award.value?.closesAt || phase.value !== 'open') return null
  const end = Date.parse(award.value.closesAt)
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000))
})

const badges = {
  soon: { tone: 'ended' as const, text: 'Not open yet' },
  open: { tone: 'live' as const, text: 'Voting open' },
  capped: { tone: 'ended' as const, text: 'Closed at the limit' },
  counting: { tone: 'results' as const, text: 'Voting closed' },
  revealed: { tone: 'results' as const, text: 'Winners announced' },
}

// Both host actions are one-way, so both ask twice. What changed afterwards is
// marked on the panel itself, not announced over the page.
const movePanel = ref<HTMLElement | null>(null)
const { isArmed, arm: armAction } = useArm()
async function arm(action: 'close' | 'publish', run: () => Promise<unknown>) {
  if (!armAction(action)) return
  await run()
  await refresh()
  nextTick(() => playCue(movePanel.value, accent.value))
}

const shareUrl = computed(() =>
  import.meta.client ? `${location.origin}/a/${slug.value}` : `/a/${slug.value}`,
)

useSeoMeta({
  title: () => (award.value ? `${award.value.name}: results so far` : 'Awards dashboard'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div ref="root" class="shell py-10">
    <template v-if="award">
      <nav aria-label="Breadcrumb" class="mb-6">
        <ol class="flex list-none flex-wrap items-center gap-2 p-0 text-[11px] font-semibold uppercase tracking-micro text-ink-muted">
          <li><NuxtLink to="/my-awards" class="inline-block py-1.5 no-underline hover:text-ink">Your awards</NuxtLink></li>
          <li aria-hidden="true">/</li>
          <li class="text-ink-2" aria-current="page">{{ award.name }}</li>
        </ol>
      </nav>

      <div class="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div class="min-w-0">
          <UiBadge :tone="badges[phase].tone">{{ badges[phase].text }}</UiBadge>
          <h1 class="heading mt-2">{{ award.name }}</h1>
          <p class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <span class="flex items-center gap-2">
              {{ award.host.name }}
              <PlatformDot :platform="award.host.platform" :label="false" />
            </span>
            <span aria-hidden="true">·</span>
            <span class="tnum">{{ fmt(award.opensAt) }} - {{ fmt(award.closesAt) }}</span>
            <span v-if="daysLeft !== null" aria-hidden="true">·</span>
            <span v-if="daysLeft !== null" class="tnum" :style="{ color: ink }">
              {{ daysLeft === 0 ? 'Closes today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left` }}
            </span>
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <UiButton :to="`/a/${award.slug}`" variant="ghost" size="sm">Open public page</UiButton>
          <UiButton to="/create" variant="ghost" size="sm">Edit</UiButton>
        </div>
      </div>

      <!-- nothing to chart yet: say it once and hand over the link -->
      <div v-if="!voters" class="js-reveal mt-10 rounded-card border border-dashed border-hair2 p-8">
        <p class="max-w-copy text-lg text-ink-2">
          No votes yet. Numbers appear here the moment somebody submits a ballot - voters, votes per day and
          the standing in every category, all of it visible to you only.
        </p>
        <ShareRow class="mt-6" :url="shareUrl" :text="`Vote in ${award.name}:`" />
      </div>

      <template v-else>
        <!-- the four numbers worth a glance -->
        <dl class="js-reveal mt-10 grid gap-px overflow-hidden rounded-card border border-hair bg-hair sm:grid-cols-2 lg:grid-cols-4">
          <div class="bg-s1 p-5">
            <dt class="label">Voters</dt>
            <dd class="tnum mt-1 text-3xl font-semibold">{{ voters }}</dd>
            <dd class="mt-1 text-sm text-ink-muted">one ballot each</dd>
          </div>
          <div class="bg-s1 p-5">
            <dt class="label">Votes cast</dt>
            <dd class="tnum mt-1 text-3xl font-semibold">{{ totalVotes }}</dd>
            <dd class="mt-1 text-sm text-ink-muted">across {{ award.nominations.length }} categories</dd>
          </div>
          <div class="bg-s1 p-5">
            <dt class="label">Per ballot</dt>
            <dd class="tnum mt-1 text-3xl font-semibold">{{ perBallot.toFixed(1) }}</dd>
            <dd class="mt-1 text-sm text-ink-muted">categories of {{ award.nominations.length }} filled</dd>
          </div>
          <div class="bg-s1 p-5">
            <dt class="label">Free ceiling</dt>
            <dd class="tnum mt-1 text-3xl font-semibold">{{ Math.round((voters / FREE.maxVoters) * 100) }}%</dd>
            <dd class="mt-2">
              <LimitMeter label="Voters" :used="voters" :total="FREE.maxVoters" />
            </dd>
          </div>
        </dl>

        <div class="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <!-- when the votes came in -->
          <section class="js-reveal rounded-card border border-hair bg-s1 p-5 sm:p-6">
            <TrendArea :points="trend" :accent="accent" label="Ballots per day" />
            <p v-if="trend.length < 2" class="text-sm text-ink-2">
              <span class="label block">Ballots per day</span>
              <span class="mt-3 block">
                Voting started today. The curve needs a second day before it says anything.
              </span>
            </p>
          </section>

          <!-- where the ballots stop -->
          <section class="js-reveal rounded-card border border-hair bg-s1 p-5 sm:p-6">
            <p class="label">Ballots reaching each category</p>
            <RankBars class="mt-4" :items="coverage" :accent="accent" :max="voters" />
            <p v-if="weakest && weakest.value < voters" class="mt-4 text-sm text-ink-2">
              <span class="font-semibold">{{ weakest.label }}</span> is the one people skip -
              {{ weakest.value }} of {{ voters }} ballots picked in it. Usually that means the category name
              is doing the confusing, not the nominees.
            </p>
          </section>
        </div>

        <!-- the standing, category by category -->
        <section class="mt-12">
          <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 class="heading">The standing</h2>
            <p class="text-sm text-ink-muted">Yours to see. Voters get these numbers when you publish.</p>
          </div>

          <p v-if="ties" class="mt-4 rounded-card border border-hair2 bg-s1 p-4 text-sm text-ink-2">
            <span class="font-semibold text-warn">{{ ties }} {{ ties === 1 ? 'category is' : 'categories are' }} tied.</span>
            A tie has no automatic winner: you pick one before publishing.
          </p>

          <div class="mt-6 space-y-4">
            <article
              v-for="race in races"
              :key="race.nomination.id"
              class="js-reveal rounded-card border border-hair bg-s1 p-5 sm:p-6"
            >
              <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 class="text-lg font-semibold">{{ race.nomination.title || 'Untitled category' }}</h3>
                <p class="tnum text-sm text-ink-muted">
                  {{ race.votes }} {{ race.votes === 1 ? 'vote' : 'votes' }} · {{ race.coverage }}% of ballots
                </p>
              </div>

              <RankBars v-if="race.votes" class="mt-4" :items="race.items" :accent="accent" />
              <p v-else class="mt-3 text-sm text-ink-muted">Nobody has picked in this category yet.</p>

              <p v-if="race.tied" class="mt-4 text-sm text-warn">Tied at the top. You decide this one.</p>
              <p v-else-if="race.votes" class="mt-4 text-sm" :style="{ color: ink }">
                {{ race.leader ? nomineeName(race.leader.nominee) : '' }} leads by
                {{ race.margin }} {{ race.margin === 1 ? 'vote' : 'votes' }}.
              </p>
            </article>
          </div>
        </section>
      </template>

      <!-- the two one-way moves, and the paywall note when the ceiling is close -->
      <section class="mt-12 grid gap-6 lg:grid-cols-2">
        <div ref="movePanel" class="js-reveal relative rounded-card border border-gold-24 bg-gold/[0.06] p-5 sm:p-6">
          <p class="micro text-gold-text">Your move</p>
          <p class="mt-3 max-w-copy text-sm text-ink-2">
            <template v-if="phase === 'open' || phase === 'soon'">
              Voting runs to {{ fmt(award.closesAt) }} on its own. Close it earlier if your viewers have voted and
              you want to announce sooner - votes already cast are kept.
            </template>
            <template v-else-if="phase === 'revealed'">
              The winners are on the page. The counts below stay here as the record.
            </template>
            <template v-else>
              Voting is done and nobody has seen the counts. Announce them on stream with the ceremony
              screen - one category at a time - then publish, which puts every count on the public page
              and cannot be undone. Check the ties first.
            </template>
          </p>
          <div class="mt-5 flex flex-wrap gap-3">
            <UiButton
              v-if="phase === 'open' || phase === 'soon'"
              variant="ghost"
              size="sm"
              @click="arm('close', () => closeVoting(slug))"
            >
              <span class="grid">
                <span aria-hidden="true" class="col-start-1 row-start-1 invisible">Close voting - sure?</span>
                <span class="col-start-1 row-start-1">{{ isArmed('close') ? 'Close voting - sure?' : 'Close voting now' }}</span>
              </span>
            </UiButton>
            <UiButton
              v-if="phase === 'counting' || phase === 'capped'"
              size="sm"
              @click="arm('publish', () => publishResults(slug))"
            >
              <span class="grid">
                <span aria-hidden="true" class="col-start-1 row-start-1 invisible">Publish the winners</span>
                <span class="col-start-1 row-start-1">{{ isArmed('publish') ? 'Publish - sure?' : 'Publish the winners' }}</span>
              </span>
            </UiButton>
            <UiButton :to="`/my-awards/${award.slug}/reveal`" variant="ghost" size="sm">Run the ceremony</UiButton>
            <UiButton :to="`/a/${award.slug}`" variant="ghost" size="sm">Open public page</UiButton>
          </div>
        </div>

        <div class="js-reveal rounded-card border border-hair bg-s1 p-5 sm:p-6">
          <p class="label">How these numbers work</p>
          <ul class="mt-4 list-none space-y-2.5 p-0 text-sm text-ink-2">
            <li class="flex gap-2.5">
              <UiIcon name="check" :size="14" class="mt-1 flex-none text-live" />
              One account, one ballot. A voter picks at most one nominee per category and cannot change it.
            </li>
            <li class="flex gap-2.5">
              <UiIcon name="check" :size="14" class="mt-1 flex-none text-live" />
              You see totals, never who voted for whom - and neither does anyone else.
            </li>
            <li class="flex gap-2.5">
              <UiIcon name="check" :size="14" class="mt-1 flex-none text-live" />
              Voting stops at {{ FREE.maxVoters }} voters on the free plan, whatever the closing date says.
            </li>
          </ul>
          <p class="mt-4 text-sm text-ink-muted">
            Where the traffic comes from is not here yet - that needs event tracking, which is its own card.
          </p>
        </div>
      </section>

      <PaywallNote v-if="voters / FREE.maxVoters >= 0.8" class="mt-6" reason="voters" />

      <div class="mt-10 flex flex-wrap gap-3">
        <UiButton to="/my-awards" variant="ghost">All your awards</UiButton>
      </div>
    </template>

    <!-- not one of theirs: this page has nothing to show and says which -->
    <div v-else class="py-16 text-center">
      <h1 class="heading">No dashboard for this one</h1>
      <p class="mx-auto mt-4 max-w-copy text-ink-2">
        Either this awards was published in another browser, or the address is wrong. Dashboards are only
        for awards you host.
      </p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <UiButton to="/my-awards">Your awards</UiButton>
        <UiButton :to="`/a/${slug}`" variant="ghost">Open the public page</UiButton>
      </div>
    </div>
  </div>
</template>
