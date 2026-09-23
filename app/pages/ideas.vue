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
import { IDEA_GROUPS, IDEA_TOTAL } from '~/data/ideas'
import { FREE } from '~/types/award'

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
    a: 'Yes. Nominees do not have to be channels - type in any name, or use a clip or an image on the paid tier. The last group here is written for servers and guilds rather than for streams.',
  },
]

useSeoMeta({
  title: `${IDEA_TOTAL} Award Category Ideas for Streamers`,
  description: `Award category ideas for a streamer awards show: chat awards, clips and collabs, funny ones, and sets for a Discord. ${IDEA_TOTAL} to pick from, free to run.`,
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
      {{ IDEA_TOTAL }} categories for a streamer awards show, grouped by what they are for. Take
      {{ FREE.maxNominations }} of them, put them in the builder, and your chat votes on the rest of the
      evening.
    </p>

    <div class="mt-6 flex flex-wrap gap-3">
      <UiButton to="/create">Start your awards</UiButton>
      <UiButton to="/catalog" variant="ghost">See shows running now</UiButton>
    </div>

    <!-- jump list: six groups is more than fits on one screen -->
    <nav aria-label="Groups" class="mt-10 flex flex-wrap gap-2 border-y border-hair py-4">
      <a
        v-for="g in IDEA_GROUPS"
        :key="g.id"
        :href="`#${g.id}`"
        class="rounded-pill border border-hair px-4 py-2 text-sm text-ink-2 no-underline transition-colors hover:border-gold hover:text-ink"
      >
        {{ g.title }}
        <span class="tnum ml-1 text-ink-muted">{{ g.items.length }}</span>
      </a>
    </nav>

    <section v-for="g in IDEA_GROUPS" :id="g.id" :key="g.id" class="js-reveal mt-12 scroll-mt-24">
      <div class="flex flex-wrap items-center gap-3">
        <span class="grid h-10 w-10 flex-none place-items-center rounded-btn border border-hair bg-s1">
          <img :src="asset(g.icon)" alt="" aria-hidden="true" class="h-4 w-4" loading="lazy" />
        </span>
        <h2 class="text-2xl font-bold">{{ g.title }}</h2>
        <UiButton :to="`/create?ideas=${g.id}`" variant="ghost" size="sm" class="ml-auto">
          Use the first {{ FREE.maxNominations }}
        </UiButton>
      </div>
      <p class="mt-3 max-w-copy text-ink-2">{{ g.blurb }}</p>

      <ul class="mt-5 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="item in g.items"
          :key="item"
          class="rounded-card border border-hair bg-s1 px-4 py-3 text-[15px] text-ink-2"
        >
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
        The builder starts from a ready-made set, nominates any channel Streams Charts tracks, and gives
        your awards a public page your chat can vote on. Free with a Twitch login.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <UiButton to="/create">Create your awards</UiButton>
        <UiButton to="/" variant="ghost">How it works</UiButton>
      </div>
    </div>
  </div>
</template>
