<script setup lang="ts">
// Category ideas, all of them. This is a search page first: "end of year awards",
// "award categories", "funny award categories" have steady demand and easy
// difficulty, and the landing only had room for a drifting sample of 30.
//
// It stays server-rendered - nothing here depends on localStorage, and a page
// written for search cannot be behind JavaScript.
import { ref } from 'vue'
import UiButton from '~/components/ui/UiButton.vue'
import InteractiveAccordion from '~/components/ui/InteractiveAccordion.vue'
import { useReveal } from '~/composables/useReveal'
import { useCatalogOpen } from '~/composables/useAwards'

const catalogOpen = useCatalogOpen()
import { IDEA_GROUPS, IDEA_TOTAL, ideaEmoji } from '~/data/ideas'

const root = ref<HTMLElement | null>(null)
useReveal(root, { stagger: 0.04 })

const faq = [
  {
    q: 'How many categories should an awards show have?',
    a: `Five is a good target, and it is what the free plan covers. A ballot people finish beats a longer one they abandon halfway, and your dashboard shows exactly where they stop: it counts how many ballots reached each category.`,
  },
  {
    q: 'What makes a category people actually vote in?',
    a: 'It has to have obvious candidates. "Best Moment" makes everyone think for a minute and then close the tab; "Rage Quit of the Year" already has three names attached to it in your chat. Write the category the way your community would say it.',
  },
  {
    q: 'Should the funny categories go first or last?',
    a: 'Mixed in. One funny category after every two serious ones keeps a ballot moving, and the funny ones are what gets screenshotted when the winners are out.',
  },
  {
    q: 'Can I use these for a Discord server or a game community?',
    a: 'Yes. Nominees do not have to be channels - type in any name, or use a clip or an image on the paid tier. The chat group works for a server as well as for a stream.',
  },
]

useSeoMeta({
  title: `${IDEA_TOTAL} Award Category Ideas for Streamers`,
  description: `${IDEA_TOTAL} award category ideas for a streamer awards show: chat awards, clips and collabs, funny ones and the classics. Open any group as a draft and run it free.`,
  ogImage: ogCard('ideas'),
})


useSchemaOrg([
  defineWebPage({ name: 'End of year awards category ideas' }),
  defineBreadcrumb({
    itemListElement: [{ name: 'Awards Maker', item: '/' }, { name: 'Category ideas' }],
  }),
  ...faq.map((f) => defineQuestion({ name: f.q, acceptedAnswer: f.a })),
  defineItemList({
    name: 'Award category ideas',
    itemListElement: IDEA_GROUPS.flatMap((g) => g.items).map((name, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
    })),
  }),
])
</script>

<template>
  <div ref="root" class="shell py-10">
    <nav aria-label="Breadcrumb" class="mb-6">
      <ol class="flex list-none flex-wrap items-center gap-2 p-0 text-[11px] font-semibold uppercase tracking-micro text-ink-muted">
        <li><NuxtLink to="/" class="inline-block py-1.5 no-underline hover:text-ink">Awards Maker</NuxtLink></li>
        <li aria-hidden="true">/</li>
        <li class="text-ink-2" aria-current="page">Category ideas</li>
      </ol>
    </nav>

    <h1 class="heading max-w-[22ch]">End of year awards category ideas</h1>
    <p class="mt-4 max-w-copy text-lg text-ink-2">
      {{ IDEA_TOTAL }} categories for a streamer awards show, in four groups. Open a group as a draft,
      keep the ones that fit your channel, rename the rest.
    </p>

    <div class="mt-6 flex flex-wrap gap-3">
      <UiButton to="/create">Start your awards</UiButton>
      <UiButton v-if="catalogOpen" to="/catalog" variant="ghost">See shows running now</UiButton>
    </div>

    <!-- jump list: four groups is more than fits on one screen -->
    <nav aria-label="Groups" class="mt-10 flex flex-wrap gap-2 border-y border-hair py-4">
      <a
        v-for="g in IDEA_GROUPS"
        :key="g.id"
        :href="`#${g.id}`"
        class="rounded-pill border border-hair px-4 py-2 text-sm text-ink-2 no-underline transition-colors hover:border-gold hover:text-ink"
      >
        <span aria-hidden="true" class="mr-1">{{ g.emoji }}</span>{{ g.title }}
        <span class="tnum ml-1 text-ink-muted">{{ g.items.length }}</span>
      </a>
    </nav>

    <!-- A group is a starting draft, not a product: all of them open free, and
         the builder is where a show past the free ceiling finds out (review
         2026-09-24 - "paid labels here scare people off"). -->
    <section
      v-for="g in IDEA_GROUPS"
      :id="g.id"
      :key="g.id"
      class="js-reveal mt-12 scroll-mt-24 rounded-card border border-hair bg-s1 p-5 sm:p-6"
    >
      <div class="flex flex-wrap items-center gap-4">
        <span aria-hidden="true" class="grid h-14 w-14 flex-none place-items-center rounded-card border border-hair bg-s2 text-[30px] leading-none">{{ g.emoji }}</span>
        <div class="min-w-0">
          <h2 class="text-2xl font-bold">{{ g.title }}</h2>
          <p class="m-0 mt-1 max-w-copy text-ink-2">{{ g.blurb }}</p>
        </div>
        <UiButton :to="`/create?ideas=${g.id}`" variant="ghost" size="sm" class="sm:ml-auto">
          Start a draft · {{ g.set }}
        </UiButton>
      </div>

      <ul class="mt-6 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="item in g.items"
          :key="item"
          class="flex items-center gap-3 rounded-card border border-hair bg-canvas px-4 py-3 text-[15px] font-medium text-ink"
        >
          <span aria-hidden="true" class="text-xl leading-none">{{ ideaEmoji(item, g) }}</span>
          {{ item }}
        </li>
      </ul>
    </section>

    <section class="mt-16 border-t border-hair pt-12">
      <h2 class="heading">Picking the ones that work</h2>
      <div class="mt-6 border-t border-hair">
        <InteractiveAccordion :items="faq" />
      </div>
    </section>

    <div class="mt-12 rounded-card border border-gold-24 bg-gold/[0.06] p-6 sm:p-8">
      <h2 class="text-2xl font-bold">Take five and run the show</h2>
      <p class="mt-3 max-w-copy text-ink-2">
        Start from a draft, nominate any channel Streams Charts tracks, and your awards get a public
        page your viewers can vote on. Free with a Twitch login.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <UiButton to="/create">Create your awards</UiButton>
        <UiButton to="/" variant="ghost">How it works</UiButton>
      </div>
    </div>
  </div>
</template>
