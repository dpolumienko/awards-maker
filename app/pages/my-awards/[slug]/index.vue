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
import ShareRow from '~/components/ui/ShareRow.vue'
import NomineeThumb from '~/components/ui/NomineeThumb.vue'
import PaywallNote from '~/components/ui/PaywallNote.vue'
import TrendArea from '~/components/ui/TrendArea.vue'
import { useAwardPage } from '~/composables/useAwards'
import { dailyOf, emptyTally, phaseOf, resultsOf, useVoting, votesInOf } from '~/composables/useVoting'
import { dayIn, formatInZone } from '#shared/time'
import { useReveal } from '~/composables/useReveal'
import { playCue } from '~/composables/useCue'
import { accentOf, onAccent } from '~/utils/accent'
import { avatarFallback, channelAvatar, nomineeInitials, nomineeName, nomineeTint } from '~/utils/nominee'
import '~/assets/css/envelope-pages.css'
import { FREE, type Nomination } from '~/types/award'
import { DISPLAY_FONTS, useDisplayFonts } from '~/composables/useDisplayFonts'

// ceremony typefaces and share cards draw in any of the headline faces
useDisplayFonts(DISPLAY_FONTS)

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { closeVoting, publishResults, setOffline, setHideCounts } = useVoting()
const { data, refresh } = await useAwardPage(() => slug.value)

const root = ref<HTMLElement | null>(null)
useReveal(root, { stagger: 0.05 })

const award = computed(() => data.value?.award ?? null)
const tally = computed(() => data.value?.tally ?? emptyTally())
const phase = computed(() => (award.value ? phaseOf(award.value, data.value?.voters ?? 0) : 'open'))
const accent = computed(() => accentOf(award.value?.look))
// the prototype's dashboard is drawn in brass, whatever the show's own accent
const BRASS = '#C9A45C'
const PF = { twitch: 'tw', kick: 'kk', youtube: 'yt' } as const

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
      rows,
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
// the day with the most ballots, for the chart's corner
const peak = computed(() => {
  const top = [...trend.value].sort((a, b) => b.votes - a.votes)[0]
  return top && top.votes ? `${formatInZone(`${top.date}T12:00:00Z`, 'UTC', { month: 'short', zone: false, time: false })} · ${top.votes}` : ''
})
const ties = computed(() => races.value.filter((r) => r.tied).length)

// dates are UTC instants; the host sees them in the show's zone, named
const fmt = (d?: string) => (d && award.value ? formatInZone(d, award.value.timezone, { month: 'short' }) : '')
const daysLeft = computed(() => {
  if (!award.value?.closesAt || phase.value !== 'open') return null
  const end = Date.parse(award.value.closesAt)
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000))
})

const badges = {
  soon: { cls: 'end', text: 'Not open yet' },
  open: { cls: '', text: 'Voting open' },
  capped: { cls: 'wait', text: 'Closed at the limit' },
  counting: { cls: 'wait', text: 'Voting closed' },
  revealed: { cls: 'res', text: 'Results out' },
}

// Both host actions are one-way, so both ask twice. What changed afterwards is
// marked on the panel itself, not announced over the page.
const deskBusy = ref(false)

/** The public page with or without the vote counts - places stay either way. */
async function onCounts(hidden: boolean) {
  deskBusy.value = true
  try {
    await setHideCounts(slug.value, hidden)
    await refresh()
  } finally {
    deskBusy.value = false
  }
}

// taken offline outranks the phase: it is what a viewer would run into
const badge = computed(() => (award.value?.offline ? { cls: 'end', text: 'Offline' } : badges[phase.value]))

const movePanel = ref<HTMLElement | null>(null)
const { isArmed, arm: armAction } = useArm()
async function arm(action: 'close' | 'publish', run: () => Promise<unknown>) {
  if (!armAction(action)) return
  await run()
  await refresh()
  nextTick(() => playCue(movePanel.value, accent.value))
}

const shareUrl = computed(() =>
  import.meta.client ? `${location.origin}${asset(`/a/${slug.value}`)}` : `/a/${slug.value}`,
)

useSeoMeta({
  title: () => (award.value ? `${award.value.name}: results so far` : 'Awards dashboard'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div ref="root" class="shell env-pg db">
    <template v-if="award">
      <nav class="pg-crumbs" aria-label="Breadcrumb">
        <NuxtLink to="/">Awards Maker</NuxtLink><span aria-hidden="true">/</span>
        <NuxtLink to="/my-awards">Your awards</NuxtLink><span aria-hidden="true">/</span>
        <span aria-current="page">{{ award.name }}</span>
      </nav>

      <header class="db-head">
        <div>
          <span class="state" :class="badge.cls">{{ badge.text }}</span>
          <h1>{{ award.name }}</h1>
          <p class="db-meta">
            <span class="db-host">
              <span class="db-hav" :style="{ background: accent, color: onAccent(accent) }">{{ award.host.name.slice(0, 2).toUpperCase() }}</span>
              {{ award.host.name }}<i class="db-pf" :class="PF[award.host.platform]" :aria-label="award.host.platform" />
            </span>
            <span class="tnum">{{ fmt(award.opensAt) }} - {{ fmt(award.closesAt) }}</span>
            <b v-if="daysLeft !== null" class="tnum">{{ daysLeft === 0 ? 'Closes today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left` }}</b>
          </p>
        </div>
        <div class="db-acts">
          <UiButton :to="`/a/${award.slug}`" variant="ghost" size="sm">Open public page</UiButton>
          <UiButton to="/create" variant="ghost" size="sm">Edit</UiButton>
        </div>
      </header>

      <!-- nothing to chart yet: say it once and hand over the link -->
      <div v-if="!voters" class="db-card js-reveal">
        <p class="db-empty">
          No votes yet. Numbers appear here the moment somebody submits a ballot - voters, votes per day and
          the standing in every category, all of it visible to you only.
        </p>
        <ShareRow :url="shareUrl" :text="`Vote in ${award.name}:`" />
      </div>

      <template v-else>
        <!-- the four numbers worth a glance -->
        <dl class="db-kpi js-reveal">
          <div><dt>Voters</dt><dd class="tnum">{{ voters }}</dd><dd class="db-k-s">voted once</dd></div>
          <div><dt>Votes cast</dt><dd class="tnum">{{ totalVotes }}</dd><dd class="db-k-s">across {{ award.nominations.length }} categories</dd></div>
          <div><dt>Per voter</dt><dd class="tnum">{{ perBallot.toFixed(1) }}</dd><dd class="db-k-s">of {{ award.nominations.length }} categories</dd></div>
          <!-- a paid show has no ceiling to measure against -->
          <div v-if="award.tier !== 'paid'">
            <dt>Free ceiling</dt><dd class="tnum">{{ voters }} / {{ FREE.maxVoters }}</dd>
            <dd class="db-k-s"><span class="db-bar"><i :style="{ width: Math.min(100, (voters / FREE.maxVoters) * 100) + '%' }" /></span></dd>
          </div>
          <div v-else><dt>Plan</dt><dd>Paid</dd><dd class="db-k-s">no cap on voters</dd></div>
        </dl>

        <div class="db-two">
          <!-- when the votes came in -->
          <section class="db-card js-reveal" aria-labelledby="db-trend-h">
            <div class="db-card-h"><h2 id="db-trend-h">Votes per day</h2><span v-if="peak" class="tnum">Busiest day {{ peak }}</span></div>
            <TrendArea v-if="trend.length >= 2" :points="trend" :accent="BRASS" label="Ballots per day" bare />
            <p v-else class="db-note">Voting started today. The curve needs a second day before it says anything.</p>
          </section>

          <!-- where the ballots stop -->
          <section class="db-card js-reveal" aria-labelledby="db-cov-h">
            <div class="db-card-h"><h2 id="db-cov-h">Voters in each category</h2></div>
            <ol class="db-cov">
              <li v-for="c in coverage" :key="c.label">
                <span class="db-cov-n">{{ c.label }}</span>
                <span class="db-bar"><i :style="{ width: (voters ? (c.value / voters) * 100 : 0) + '%' }" /></span>
                <span class="db-cov-v tnum">{{ c.value }}</span>
              </li>
            </ol>
            <p v-if="weakest && weakest.value < voters" class="db-note">
              <b>{{ weakest.label }}</b> is the one people skip - {{ weakest.value }} of {{ voters }} voters picked in it.
              Usually that means the category name is doing the confusing, not the nominees.
            </p>
          </section>
        </div>

        <!-- the standing, category by category -->
        <section class="db-stand" aria-labelledby="db-st-h">
          <div class="db-sec-h"><h2 id="db-st-h">The standing</h2><p>Yours to see. Voters get these numbers when you publish.</p></div>
          <p v-if="ties" class="db-tie"><b>{{ ties }} {{ ties === 1 ? 'category is' : 'categories are' }} tied.</b> A tie has no automatic winner: you pick one before publishing.</p>
          <div class="db-races">
            <article v-for="race in races" :key="race.nomination.id" class="db-race js-reveal" :class="race.tied && 'tied'">
              <div class="db-race-h">
                <h3>{{ race.nomination.title || 'Untitled category' }}</h3>
                <span class="tnum">{{ race.votes }} {{ race.votes === 1 ? 'vote' : 'votes' }} · {{ race.coverage }}% of voters</span>
              </div>
              <ol v-if="race.votes">
                <li v-for="(r, i) in race.rows" :key="r.nominee.id" :class="i === 0 || r.votes === race.rows[0]!.votes ? 'lead' : ''">
                  <span v-if="r.nominee.kind === 'media'" class="db-th"><NomineeThumb :nominee="r.nominee" :width="72" /></span>
                  <span v-else class="db-avw">
                    <img v-if="r.nominee.kind === 'channel'" class="db-av" :src="channelAvatar(r.nominee.channel)" @error="avatarFallback($event, r.nominee.channel.name)" alt="" loading="lazy">
                    <span v-else class="db-av" :style="{ background: nomineeTint(r.nominee) }">{{ nomineeInitials(r.nominee) }}</span>
                    <i v-if="r.nominee.kind === 'channel'" class="db-pf" :class="PF[r.nominee.channel.platform]" />
                  </span>
                  <span class="db-nm">{{ nomineeName(r.nominee) }}</span>
                  <span class="db-bar"><i :style="{ width: (race.rows[0]!.votes ? (r.votes / race.rows[0]!.votes) * 100 : 0) + '%' }" /></span>
                  <span class="db-v tnum">{{ r.votes }}</span>
                  <span class="db-pc tnum">{{ r.pct }}%</span>
                </li>
              </ol>
              <p v-else class="db-race-f">Nobody has picked in this category yet.</p>
              <p v-if="race.tied" class="db-race-f">Tied at the top. You decide this one.</p>
              <p v-else-if="race.votes" class="db-race-f">
                <b>{{ race.leader ? nomineeName(race.leader.nominee) : '' }}</b> leads by {{ race.margin }} {{ race.margin === 1 ? 'vote' : 'votes' }}.
              </p>
            </article>
          </div>
        </section>
      </template>

      <!-- the one-way moves, and how the numbers are counted -->
      <section class="db-end">
        <div ref="movePanel" class="db-move js-reveal">
          <p class="db-move-l">Your move</p>
          <p>
            <template v-if="phase === 'open' || phase === 'soon'">
              Voting runs to {{ fmt(award.closesAt) }} on its own. Close it earlier if your viewers have voted and
              you want to announce sooner. Votes already cast are kept.
            </template>
            <template v-else-if="phase === 'revealed'">The winners are on the page. The counts here stay as the record.</template>
            <template v-else>
              Voting is done and nobody has seen the counts. Announce them on stream with the ceremony, one category
              at a time, then publish: every count goes on the public page and it cannot be undone. Check the ties first.
            </template>
          </p>
          <div class="db-move-b">
            <UiButton :to="`/my-awards/${award.slug}/reveal`" size="sm">Run the ceremony</UiButton>
            <button v-if="phase === 'open' || phase === 'soon'" type="button" class="db-closel" @click="arm('close', () => closeVoting(slug))">
              <span class="db-sz"><span aria-hidden="true">Close voting - sure?</span><span>{{ isArmed('close') ? 'Close voting - sure?' : 'Close voting now' }}</span></span>
            </button>
            <button v-if="phase === 'counting' || phase === 'capped'" type="button" class="db-closel is-go" @click="arm('publish', () => publishResults(slug))">
              <span class="db-sz"><span aria-hidden="true">Publish the winners</span><span>{{ isArmed('publish') ? 'Publish - sure?' : 'Publish the winners' }}</span></span>
            </button>
          </div>
          <!-- once voting is shut: the winners with or without the numbers -->
          <label v-if="phase !== 'open' && phase !== 'soon'" class="db-counts">
            <input type="checkbox" :checked="!award.hideCounts" :disabled="deskBusy" @change="onCounts(!($event.target as HTMLInputElement).checked)" />
            <span><b>Show the vote counts</b>Off: the public page names the winners and the order, without votes or %.</span>
          </label>
        </div>

        <div class="db-card js-reveal">
          <div class="db-card-h"><h2>How these numbers work</h2></div>
          <ul class="db-how">
            <li>One account, one vote per category. A voter picks at most one nominee per category and cannot change it.</li>
            <li>You see totals, never who voted for whom, and neither does anyone else.</li>
            <li v-if="award.tier !== 'paid'">Voting stops at {{ FREE.maxVoters }} voters on the free plan, whatever the closing date says.</li>
            <li v-else>On the paid plan there is no voter cap. Voting stops at the closing date.</li>
          </ul>
        </div>
      </section>

      <PaywallNote v-if="award.tier !== 'paid' && voters / FREE.maxVoters >= 0.8" reason="voters" />
    </template>

    <!-- not one of theirs: this page has nothing to show and says which -->
    <div v-else class="pg-empty">
      <h1 class="db-none">No dashboard for this one</h1>
      <p>Either this awards was published in another browser, or the address is wrong. Dashboards are only for awards you host.</p>
      <div class="db-acts">
        <UiButton to="/my-awards">Your awards</UiButton>
        <UiButton :to="`/a/${slug}`" variant="ghost">Open the public page</UiButton>
      </div>
    </div>
  </div>
</template>
