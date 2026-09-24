<script setup lang="ts">
// The catalog: every published awards, in one place. This is the page the whole
// product bets on - the first success measure is organic traffic to awards pages,
// and this is what links to them.
//
// Server-rendered off /api/awards. It used to list what this browser had
// published, which meant a crawler - the visitor this page exists for - saw an
// empty shell. Nothing is seeded: an empty catalog says so rather than inventing
// shows.
import { computed, ref } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import CatalogCard from '~/components/ui/CatalogCard.vue'
import InteractiveAccordion from '~/components/ui/InteractiveAccordion.vue'
import { useCatalog } from '~/composables/useAwards'
import { phaseOf } from '~/composables/useVoting'
import { useReveal } from '~/composables/useReveal'
import { FREE, PUBLISH } from '~/types/award'

const route = useRoute()
const router = useRouter()
const { data, error } = await useCatalog()
// An empty catalog answering 200 during a database outage is a page a crawler
// would index as "this site has no shows". A 503 is recoverable; that is not.
if (error.value) {
  throw createError({ statusCode: 503, statusMessage: 'The catalog is briefly unavailable', fatal: true })
}
const root = ref<HTMLElement | null>(null)
useReveal(root, { stagger: 0.05 })

// Filters are links, not state: they survive a share, a back button and a crawler.
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Voting open' },
  { id: 'results', label: 'Results in' },
] as const
type FilterId = (typeof FILTERS)[number]['id']
const active = computed<FilterId>(() => {
  const q = String(route.query.status ?? 'all')
  return (FILTERS.some((f) => f.id === q) ? q : 'all') as FilterId
})

const rows = computed(() =>
  (data.value?.awards ?? []).map((award) => ({
    award,
    phase: phaseOf(award as never, award.voters),
    voters: award.voters,
  })),
)
const counts = computed(() => ({
  all: rows.value.length,
  open: rows.value.filter((r) => ['open', 'soon'].includes(r.phase)).length,
  results: rows.value.filter((r) => r.phase === 'revealed').length,
}))
const shown = computed(() => {
  if (active.value === 'open') return rows.value.filter((r) => ['open', 'soon'].includes(r.phase))
  if (active.value === 'results') return rows.value.filter((r) => r.phase === 'revealed')
  return rows.value
})

const totals = computed(() => ({
  awards: rows.value.length,
  votes: rows.value.reduce((sum, r) => sum + r.voters, 0),
  // the summary carries a category count, not the whole tree - the catalog does
  // not need every nominee to say how big the site is
  nominees: rows.value.reduce((sum, r) => sum + r.award.categories, 0),
}))

const faq = [
  {
    q: 'How does an awards get into this catalog?',
    a: `By being published. Every awards published with Awards Maker is listed here - there is no submission and no approval queue, and nothing can be hidden from the catalog. What it needs is substance: at least ${PUBLISH.minNominations} categories, ${PUBLISH.minNomineesPerNomination} nominees in each and a description. That is also the bar for appearing in search.`,
  },
  {
    q: 'Can I vote in someone else’s awards?',
    a: 'Yes. Open the page, pick a nominee in each category and submit with a Twitch login. One ballot per account, one vote per category, and the counts stay hidden until the host announces the winners.',
  },
  {
    q: 'What does it cost to run my own?',
    a: `Nothing to start: the free plan covers ${FREE.maxNominations} categories and ${FREE.maxVoters} voters, which is a first season for most channels. Bigger shows are a one-off purchase per awards, and we also run them for brands and agencies.`,
  },
]

useSeoMeta({
  title: 'Community Awards Catalog: Streamer Awards',
  description:
    'Every awards show streamers are running with Awards Maker: open votes you can take part in, and results once the winners are out. Free to start your own.',
  ogImage: ogCard('catalog'),
})


useSchemaOrg([
  defineWebPage({ name: 'Community awards catalog' }),
  defineBreadcrumb({
    itemListElement: [
      { name: 'Awards Maker', item: '/' },
      { name: 'Catalog' },
    ],
  }),
  ...faq.map((f) => defineQuestion({ name: f.q, acceptedAnswer: f.a })),
])
// The list itself is the page's content, so it is described as one. Server-side
// now, which means the markup carries real entries rather than an empty list.
if (rows.value.length) {
  useSchemaOrg([
    defineItemList({
      name: 'Community awards',
      itemListElement: rows.value.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: r.award.name,
        url: `/a/${r.award.slug}`,
      })),
    }),
  ])
}

/** A filter is a link; clicking one keeps the page and swaps the query. */
const filterLink = (id: FilterId) => (id === 'all' ? '/catalog' : `/catalog?status=${id}`)
</script>

<template>
  <div ref="root" class="shell py-10">
    <nav aria-label="Breadcrumb" class="mb-6">
      <ol class="flex list-none flex-wrap items-center gap-2 p-0 text-[11px] font-semibold uppercase tracking-micro text-ink-muted">
        <li><NuxtLink to="/" class="inline-block py-1.5 no-underline hover:text-ink">Awards Maker</NuxtLink></li>
        <li aria-hidden="true">/</li>
        <li class="text-ink-2" aria-current="page">Catalog</li>
      </ol>
    </nav>

    <h1 class="heading">Community awards catalog</h1>
    <p class="mt-4 max-w-copy text-lg text-ink-2">
      Every awards show streamers are running here. Open one to see the nominees, vote while voting is
      open, or read the results once the winners are out.
    </p>

    <!-- what the catalog actually holds, counted -->
    <dl v-if="totals.awards" class="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-y border-hair py-5">
      <div>
        <dt class="label">Awards</dt>
        <dd class="tnum mt-1 text-lg font-semibold">{{ totals.awards }}</dd>
      </div>
      <div>
        <dt class="label">Categories</dt>
        <dd class="tnum mt-1 text-lg font-semibold">{{ totals.nominees }}</dd>
      </div>
      <div>
        <dt class="label">Votes cast</dt>
        <dd class="tnum mt-1 text-lg font-semibold">{{ totals.votes }}</dd>
      </div>
    </dl>

    <div v-if="totals.awards" class="mt-6 flex flex-wrap items-center gap-2">
      <NuxtLink
        v-for="f in FILTERS"
        :key="f.id"
        :to="filterLink(f.id)"
        class="rounded-pill border px-4 py-2 text-sm no-underline transition-colors"
        :class="active === f.id ? 'border-gold bg-gold/[0.12] text-gold-text' : 'border-hair text-ink-2 hover:border-hair2 hover:text-ink'"
        :aria-current="active === f.id ? 'page' : undefined"
      >
        {{ f.label }}
        <span class="tnum ml-1 text-ink-muted">{{ counts[f.id] }}</span>
      </NuxtLink>
    </div>

    <div v-if="shown.length" class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <CatalogCard
        v-for="row in shown"
        :key="row.award.slug"
        class="js-reveal"
        :award="row.award"
        :phase="row.phase"
        :voters="row.voters"
      />
    </div>

    <!-- filtered to nothing: say which filter did it -->
    <div v-else-if="totals.awards" class="mt-8 rounded-card border border-dashed border-hair2 p-8 text-center">
      <p class="text-ink-2">
        Nothing here under this filter yet.
        <NuxtLink to="/catalog" class="text-gold-text underline underline-offset-4">Show all {{ totals.all }}</NuxtLink>.
      </p>
    </div>

    <!-- nothing published at all: the honest version, with the way in -->
    <div v-else class="mt-8 rounded-card border border-dashed border-hair2 p-10 text-center">
      <p class="mx-auto max-w-copy text-lg text-ink-2">
        The catalog is empty in this browser. Awards published with Awards Maker land here on their own -
        there is no submission and no queue. Yours can be the first.
      </p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <UiButton to="/create">Create your awards</UiButton>
        <UiButton to="/" variant="ghost">How it works</UiButton>
      </div>
    </div>

    <section class="mt-16 border-t border-hair pt-12">
      <h2 class="heading">Questions about the catalog</h2>
      <div class="mt-6 border-t border-hair">
        <InteractiveAccordion :items="faq" />
      </div>
      <p class="mt-6 max-w-copy text-sm text-ink-2">
        Running awards of your own takes about ten minutes:
        <NuxtLink to="/create" class="text-gold-text underline underline-offset-4">start from a ready-made set</NuxtLink>
        of categories, nominate any channel we track, and share the link in chat.
      </p>
    </section>
  </div>
</template>
