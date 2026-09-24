<script setup lang="ts">
// Pricing as its own page. The landing block sells; this one answers the
// questions somebody asks right before paying - what the ceilings mean, what
// happens when a show hits them, and what the paid tier is not.
//
// No Offer in the structured data: Google's product rich results expect reviews
// or ratings we do not have, and a half-filled Product earns a warning, not a
// snippet.
import { ref } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import UiIcon from '~/components/ui/UiIcon.vue'
import PlanCards from '~/components/ui/PlanCards.vue'
import InteractiveAccordion from '~/components/ui/InteractiveAccordion.vue'
import { useReveal } from '~/composables/useReveal'
import { COMPARISON } from '~/data/plans'
import { FREE, PAID } from '~/types/award'

const root = ref<HTMLElement | null>(null)
useReveal(root, { stagger: 0.04 })

const faq = [
  {
    q: `What happens when my awards hits ${FREE.maxVoters} voters?`,
    a: `Voting stops there and the page says so. Every vote already cast is kept, the results are yours to publish as usual, and nothing is deleted - the ${FREE.maxVoters}th voter is the last one, not the end of the show.`,
  },
  {
    q: 'Is the paid tier a subscription?',
    a: `No. $${PAID.priceUsd} once, for one awards show. A show is an event, not something you use every month.`,
  },
  {
    q: 'What does the free plan cost me later?',
    a: `Nothing. ${FREE.maxNominations} categories, ${FREE.maxVoters} voters and one show at a time, with a public page that stays online after the winners are out. Most first seasons on a small channel never touch those numbers.`,
  },
  {
    q: 'When do I pay?',
    a: `When you publish. If the show uses more than the free plan covers - more than ${FREE.maxNominations} categories, your own look, or images and clips as nominees - publishing asks for $${PAID.priceUsd} once, for that show.`,
  },
  {
    q: 'What is "done for you"?',
    a: 'We run the production: categories and nominees worked out with you, a branded page, moderation and anti-fraud watched by our team during the vote, a run of show for the reveal stream, and a report afterwards. It is priced per show, for agencies, brands and large channels.',
  },
]

useSeoMeta({
  title: 'Plans and Pricing for Streamer Awards',
  description: `Free for ${FREE.maxNominations} categories and ${FREE.maxVoters} voters. $${PAID.priceUsd} once for an awards show without limits and with your own look. Or we run the production for you.`,
  ogImage: ogCard('plans'),
})


useSchemaOrg([
  defineWebPage({ '@type': ['WebPage', 'FAQPage'], name: 'Plans and pricing' }),
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
      Start free. Pay ${{ PAID.priceUsd }} once if the show needs more - no subscription.
    </p>

    <PlanCards class="mt-10" level="h2" />

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

        <table class="w-full min-w-[560px] border-collapse text-left text-sm">
          <caption class="sr-only">What each plan includes</caption>
          <thead>
            <tr class="border-b border-hair bg-s1">
              <th scope="col" class="sticky left-0 z-10 w-2/5 bg-s1 px-5 py-4 font-semibold">Feature</th>
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
                <!-- the label rides along while the row scrolls on a phone -->
                <span class="sticky left-5">{{ block.group }}</span>
              </th>
            </tr>
            <tr v-for="row in block.rows" :key="row.label" class="border-t border-hair">
              <!-- the feature name stays put while the plans scroll under it on a phone -->
              <th scope="row" class="sticky left-0 z-10 bg-canvas px-5 py-3 font-normal text-ink-2">{{ row.label }}</th>
              <td
                v-for="c in cols"
                :key="c.key"
                class="tnum px-5 py-3 text-center"
                :class="c.key === 'paid' ? 'bg-gold/[0.04]' : ''"
              >
                <template v-if="typeof row[c.key] === 'string'">{{ row[c.key] }}</template>
                <UiIcon v-else-if="row[c.key]" name="check" :size="15" class="inline text-live" />
                <template v-else><span class="text-ink-muted" aria-hidden="true">-</span></template>
                <span class="sr-only">
                  {{ typeof row[c.key] === 'string' ? '' : row[c.key] ? 'included' : 'not included' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="done-for-you" class="mt-16 scroll-mt-24 border-t border-hair pt-12">
      <h2 class="heading">We run it for you</h2>
      <p class="mt-4 max-w-copy text-lg text-ink-2">
        For agencies, brands and big channels. We set up the show with you, run moderation through the
        vote and send a report after. Tell us the channel and the date, and we come back with a price.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <!-- one filled button per screen; the address is a plain link, not an upper-case button -->
        <UiButton to="mailto:sales@streamscharts.com" variant="ghost">Talk to sales</UiButton>
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
        {{ FREE.maxNominations }} categories, {{ FREE.maxVoters }} voters and a public page. Pay only if the show outgrows it.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <UiButton to="/create">Create your awards</UiButton>
        <UiButton to="/ideas" variant="ghost">Category ideas</UiButton>
      </div>
    </div>
  </div>
</template>
