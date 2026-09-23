<script setup lang="ts">
// Pricing as its own page. The landing block sells; this one answers the
// questions somebody asks right before paying - what the ceilings mean, what
// happens when a show hits them, and what the paid tier is not.
//
// No Offer in the structured data: the price is still a range, and marking up a
// figure we have not decided would put a wrong one in search results.
import { ref } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import UiIcon from '~/components/ui/UiIcon.vue'
import PlanCards from '~/components/ui/PlanCards.vue'
import InteractiveAccordion from '~/components/ui/InteractiveAccordion.vue'
import { useReveal } from '~/composables/useReveal'
import { COMPARISON } from '~/data/plans'
import { FREE } from '~/types/award'

const root = ref<HTMLElement | null>(null)
useReveal(root, { stagger: 0.04 })

const faq = [
  {
    q: `What happens when my awards hits ${FREE.maxVoters} voters?`,
    a: `Voting stops there and the page says so. Every vote already cast is kept, the results are yours to publish as usual, and nothing is deleted - the ${FREE.maxVoters}th voter is the last one, not the end of the show.`,
  },
  {
    q: 'Is the paid tier a subscription?',
    a: 'No. It is a one-off purchase for one awards show. An awards show is an event, not a service you use every day, so charging monthly for it would be charging for the eleven months nothing is running.',
  },
  {
    q: 'Can I upgrade an awards that is already open?',
    a: 'That is the point of paying at the moment you hit a ceiling rather than before it. The categories, nominees and votes stay where they are - the limits come off the show you already built.',
  },
  {
    q: 'What does the free plan cost me later?',
    a: `Nothing. ${FREE.maxNominations} categories, ${FREE.maxVoters} voters and one show at a time, with a public page that stays online after the winners are out. Most first seasons on a small channel never touch those numbers.`,
  },
  {
    q: 'When can I buy it?',
    a: 'The paid tier ships before December, in time for end-of-year shows. Early access holds your price; until then everything on the free plan works as described.',
  },
  {
    q: 'What is "done for you"?',
    a: 'We run the production: categories and nominees worked out with you, a branded page, moderation and anti-fraud watched by our team during the vote, a run of show for the reveal stream, and a report afterwards. It is priced per show, for agencies, brands and large channels.',
  },
]

useSeoMeta({
  title: 'Plans and Pricing for Streamer Awards',
  description: `Free with a Twitch login for ${FREE.maxNominations} categories and ${FREE.maxVoters} voters, a one-off purchase for a show without ceilings, or we run the production for you.`,
  ogImage: ogCard('plans'),
})


useSchemaOrg([
  defineWebPage({ name: 'Plans and pricing' }),
  defineBreadcrumb({ itemListElement: [{ name: 'Awards Maker', item: '/' }, { name: 'Plans' }] }),
  ...faq.map((f) => defineQuestion({ name: f.q, acceptedAnswer: f.a })),
])

const cols = [
  { key: 'free', label: 'Free' },
  { key: 'paid', label: 'One awards' },
  { key: 'done', label: 'Done for you' },
] as const
</script>

<template>
  <div ref="root" class="shell py-10">
    <nav aria-label="Breadcrumb" class="mb-6">
      <ol class="flex list-none flex-wrap items-center gap-2 p-0 text-[11px] font-semibold uppercase tracking-micro text-ink-muted">
        <li><NuxtLink to="/" class="inline-block py-1.5 no-underline hover:text-ink">Awards Maker</NuxtLink></li>
        <li aria-hidden="true">/</li>
        <li class="text-ink-2" aria-current="page">Plans</li>
      </ol>
    </nav>

    <h1 class="heading max-w-[20ch]">Free, paid, or we run it for you</h1>
    <p class="mt-4 max-w-copy text-lg text-ink-2">
      Start free and pay only when a show outgrows the ceilings. The paid tier is a one-off purchase for
      one awards, not a subscription - nothing you set up is lost in between.
    </p>

    <PlanCards class="mt-10" />

    <section class="mt-16">
      <h2 class="heading">Side by side</h2>
      <div
        role="region"
        aria-label="Plan comparison"
        tabindex="0"
        class="mt-6 max-w-full overflow-x-auto rounded-card border border-hair [contain:paint] focus-visible:shadow-focus"
      >
        <!--
          `contain: paint` is load-bearing, not decoration. A table with a
          min-width pushes that width up the ancestor chain even through
          overflow-x: auto, and the whole page scrolled sideways by 256px at
          375. Containment is the only thing that stops it - overflow: hidden on
          any parent, display: grid and flow-root all left the scroll in place.
        -->

        <table class="w-full min-w-[640px] border-collapse text-left text-sm">
          <caption class="sr-only">What each plan includes</caption>
          <thead>
            <tr class="border-b border-hair bg-s1">
              <th scope="col" class="w-2/5 px-5 py-4 font-semibold">Feature</th>
              <th
                v-for="c in cols"
                :key="c.key"
                scope="col"
                class="px-5 py-4 text-center font-semibold"
                :class="c.key === 'paid' ? 'text-gold-text' : ''"
              >
                {{ c.label }}
              </th>
            </tr>
          </thead>
          <tbody v-for="block in COMPARISON" :key="block.group">
            <tr class="bg-s2">
              <th scope="colgroup" colspan="4" class="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-micro text-ink-muted">
                {{ block.group }}
              </th>
            </tr>
            <tr v-for="row in block.rows" :key="row.label" class="border-t border-hair">
              <th scope="row" class="px-5 py-3 font-normal text-ink-2">{{ row.label }}</th>
              <td
                v-for="c in cols"
                :key="c.key"
                class="tnum px-5 py-3 text-center"
                :class="c.key === 'paid' ? 'bg-gold/[0.04]' : ''"
              >
                <template v-if="typeof row[c.key] === 'string'">{{ row[c.key] }}</template>
                <UiIcon v-else-if="row[c.key]" name="check" :size="15" class="inline text-live" />
                <template v-else><span class="text-ink-disabled">-</span></template>
                <span class="sr-only">
                  {{ typeof row[c.key] === 'string' ? '' : row[c.key] ? 'included' : 'not included' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-4 max-w-copy text-sm text-ink-muted">
        Every published show is listed in the community catalog on all three plans - that listing is how
        the next streamer finds this.
      </p>
    </section>

    <!-- the two CTAs above land here: no checkout exists yet, and the page says so -->
    <section id="early-access" class="mt-16 scroll-mt-24 border-t border-hair pt-12">
      <h2 class="heading">Early access</h2>
      <p class="mt-4 max-w-copy text-lg text-ink-2">
        The paid tier is not on sale yet. It ships before December, in time for end-of-year shows, and
        early access holds the launch price for the first season.
      </p>
      <ul class="mt-6 list-none space-y-2.5 p-0 text-ink-2">
        <li class="flex gap-2.5">
          <UiIcon name="check" :size="14" class="mt-1.5 flex-none text-live" />
          Everything you build on the free plan carries over. The upgrade lifts the ceilings off the show
          you already have - categories, nominees and votes stay where they are.
        </li>
        <li class="flex gap-2.5">
          <UiIcon name="check" :size="14" class="mt-1.5 flex-none text-live" />
          One payment per awards show. No subscription, nothing recurring.
        </li>
        <li class="flex gap-2.5">
          <UiIcon name="check" :size="14" class="mt-1.5 flex-none text-live" />
          Until it ships, the free plan runs a full season: {{ FREE.maxNominations }} categories,
          {{ FREE.maxVoters }} voters, a public page and a dashboard.
        </li>
      </ul>
      <div class="mt-6 flex flex-wrap gap-3">
        <UiButton to="/create">Start free now</UiButton>
        <UiButton to="/ideas" variant="ghost">Category ideas</UiButton>
      </div>
    </section>

    <section id="done-for-you" class="mt-16 scroll-mt-24 border-t border-hair pt-12">
      <h2 class="heading">We run it for you</h2>
      <p class="mt-4 max-w-copy text-lg text-ink-2">
        For agencies, brands and channels big enough that the show needs a producer. We work out the
        categories and nominees with you, brand the page, watch moderation and anti-fraud through the
        vote, write the run of show for the reveal stream and send a results and audience report after.
      </p>
      <p class="mt-4 max-w-copy text-ink-2">
        Priced per show, because no two are the same size. Tell us the channel, the date and roughly how
        many people you expect, and we come back with a plan and a price.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <UiButton to="mailto:sales@streamscharts.com">sales@streamscharts.com</UiButton>
        <UiButton to="/create" variant="ghost">Or start free yourself</UiButton>
      </div>
    </section>

    <section class="mt-16 border-t border-hair pt-12">
      <h2 class="heading">Questions about paying</h2>
      <div class="mt-6 border-t border-hair">
        <InteractiveAccordion :items="faq" />
      </div>
    </section>

    <div class="mt-12 rounded-card border border-gold-24 bg-gold/[0.06] p-6 sm:p-8">
      <h2 class="text-2xl font-bold">Start on the free plan</h2>
      <p class="mt-3 max-w-copy text-ink-2">
        {{ FREE.maxNominations }} categories, {{ FREE.maxVoters }} voters, a public page and a dashboard
        that shows you how the vote is going. Pay only if the show outgrows it.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <UiButton to="/create">Create your awards</UiButton>
        <UiButton to="/ideas" variant="ghost">Category ideas</UiButton>
      </div>
    </div>
  </div>
</template>
